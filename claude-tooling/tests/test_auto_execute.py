#!/usr/bin/env python3
"""
Automated tests for the automatic tool execution feature.

This test suite focuses on testing:
1. The auto_execute_tool_calls function 
2. The process_tool_calls_and_continue function
3. Tool execution and cancellation scenarios

Usage:
    pytest -v tests/test_auto_execute.py
"""

import os
import sys
import json
import uuid
import pytest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the functions to test
from app.api.services.tool_execution import auto_execute_tool_calls, process_tool_calls_and_continue
from app.api.services.conversation import conversations, auto_execute_tasks, auto_execute_counts, get_auto_execute_count, increment_auto_execute_count, reset_auto_execute_count
from app.api.routes.chat import client

# Sample tool call for testing
SAMPLE_TOOL_CALL = {
    "id": "tool_call_12345",
    "name": "python_interpreter",
    "input": {
        "code": "print('Hello, world!')"
    }
}

SAMPLE_TOOL_RESULT = {
    "status": "success",
    "output": "Hello, world!"
}

# Test fixtures
@pytest.fixture
def mock_process_tool_calls():
    """Mock the process_tool_calls function"""
    import app.api.services.tool_execution as tool_execution_module
    
    # Save the original function
    original_func = tool_execution_module.process_tool_calls
    
    # Create the mock
    mock_func = MagicMock()
    mock_func.return_value = [
        {
            "tool_use_id": SAMPLE_TOOL_CALL["id"],
            "content": json.dumps(SAMPLE_TOOL_RESULT)
        }
    ]
    
    # Replace the function in the module
    tool_execution_module.process_tool_calls = mock_func
    
    # Yield the mock for test use
    yield mock_func
    
    # Restore the original function after the test
    tool_execution_module.process_tool_calls = original_func

@pytest.fixture
def mock_anthropic_client():
    """Mock the Anthropic client"""
    with patch('app.api.routes.chat.client') as mock_client:
        # Create a mock response class
        class MockResponse:
            def __init__(self, content):
                self.content = content
                self.thinking = None
                
            def model_dump(self):
                result = {"content": self.content}
                if self.thinking:
                    result["thinking"] = self.thinking
                return result
        
        # Configure the mock response
        mock_response = MockResponse([{"type": "text", "text": "Test response"}])
        mock_client.messages.create.return_value = mock_response
        
        yield mock_client

# Reset global state after each test
@pytest.fixture(autouse=True)
def cleanup():
    """Reset global state after each test"""
    yield
    
    # Clean up test conversations
    keys_to_remove = []
    for key in conversations:
        if key.startswith("test_"):
            keys_to_remove.append(key)
    
    for key in keys_to_remove:
        conversations.pop(key, None)
        auto_execute_tasks.pop(key, None)
        auto_execute_counts.pop(key, None)

# Tests for auto_execute_tool_calls
@pytest.mark.asyncio
async def test_auto_execute_tool_calls_success(mock_process_tool_calls):
    """Test successful automatic execution of tools"""
    # Create test data
    tool_calls = [SAMPLE_TOOL_CALL]
    conversation_id = f"test_{uuid.uuid4()}"
    
    # Call the function
    result = await auto_execute_tool_calls(tool_calls, conversation_id)
    
    # Verify the function called process_tool_calls
    mock_process_tool_calls.assert_called_once_with(tool_calls, conversation_id)
    
    # Verify the result
    assert len(result) == 1
    assert result[0]["tool_use_id"] == "tool_call_12345"
    assert json.loads(result[0]["content"])["status"] == "success"

@pytest.mark.asyncio
async def test_auto_execute_tool_calls_error():
    """Test handling errors during tool execution"""
    # Create test data with a mock that raises an exception
    tool_calls = [SAMPLE_TOOL_CALL]
    conversation_id = f"test_{uuid.uuid4()}"
    
    # Mock process_tool_calls to raise an exception using module-level patching
    import app.api.services.tool_execution as tool_execution_module
    original_func = tool_execution_module.process_tool_calls
    
    try:
        mock_func = MagicMock(side_effect=Exception("Test error"))
        tool_execution_module.process_tool_calls = mock_func
        
        # Call the function
        result = await auto_execute_tool_calls(tool_calls, conversation_id)
        
        # Verify the result contains an error
        assert len(result) == 1
        assert result[0]["tool_use_id"] == "tool_call_12345"
        error_content = json.loads(result[0]["content"])
        assert error_content["status"] == "error"
        assert "Test error" in error_content["message"]
    finally:
        # Restore the original function
        tool_execution_module.process_tool_calls = original_func

# Tests for process_tool_calls_and_continue
@pytest.mark.asyncio
async def test_process_tool_calls_and_continue(mock_process_tool_calls, mock_anthropic_client):
    """Test the entire process of executing tools and continuing the conversation"""
    # Create test data
    tool_calls = [SAMPLE_TOOL_CALL]
    conversation_id = f"test_{uuid.uuid4()}"
    conversations[conversation_id] = [
        {"role": "user", "content": [{"type": "text", "text": "Test message"}]},
        {"role": "assistant", "content": [
            {"type": "text", "text": "Initial response"},
            {"type": "tool_use", "id": "tool_call_12345", "name": "python_interpreter", "input": {"code": "print('Hello')"}}
        ]}
    ]
    
    # Call the function
    await process_tool_calls_and_continue(
        tool_calls,
        conversation_id,
        1000,  # max_tokens
        False,  # thinking_mode
        2000,   # thinking_budget_tokens
        False,   # auto_execute_tools
        mock_anthropic_client  # Pass the mock client
    )
    
    # Verify that the conversation was updated
    assert len(conversations[conversation_id]) > 2  # Should have added user tool result and assistant response
    
    # Verify that auto_execute_tasks was updated
    assert conversation_id in auto_execute_tasks
    assert auto_execute_tasks[conversation_id] == "completed"
    
    # Verify that the mock Anthropic client was called
    mock_anthropic_client.messages.create.assert_called_once()

@pytest.mark.asyncio
async def test_process_tool_calls_and_continue_with_cancellation():
    """Test cancelling the process_tool_calls_and_continue function"""
    # Create test data
    tool_calls = [SAMPLE_TOOL_CALL]
    conversation_id = f"test_{uuid.uuid4()}"
    conversations[conversation_id] = []
    auto_execute_tasks[conversation_id] = "cancelled"  # Pre-set to cancelled
    
    # Call the function
    await process_tool_calls_and_continue(
        tool_calls,
        conversation_id,
        1000,  # max_tokens
        False,  # thinking_mode
        2000,   # thinking_budget_tokens
        False,  # auto_execute_tools
        None    # client
    )
    
    # Verify that the conversation was not updated
    assert len(conversations[conversation_id]) == 0
    
    # Verify that auto_execute_tasks remains cancelled
    assert auto_execute_tasks[conversation_id] == "cancelled"

@pytest.mark.asyncio
async def test_process_tool_calls_and_continue_with_error(mock_process_tool_calls):
    """Test error handling in process_tool_calls_and_continue"""
    # Create test data
    tool_calls = [SAMPLE_TOOL_CALL]
    conversation_id = f"test_{uuid.uuid4()}"
    conversations[conversation_id] = []
    
    # Mock Anthropic client to raise an exception
    with patch('app.api.routes.chat.client') as mock_client:
        mock_create = MagicMock(side_effect=Exception("API error"))
        mock_client.messages.create = mock_create
        
        # Call the function
        await process_tool_calls_and_continue(
            tool_calls,
            conversation_id,
            1000,  # max_tokens
            False,  # thinking_mode
            2000,   # thinking_budget_tokens
            False,  # auto_execute_tools
            mock_client  # Pass the client explicitly
        )
    
    # Verify error was added to conversation
    assert len(conversations[conversation_id]) > 0
    assert conversations[conversation_id][-1]["role"] == "system"
    assert "error" in conversations[conversation_id][-1]["content"][0]["text"].lower()
    
    # Verify that auto_execute_tasks was marked as error
    assert auto_execute_tasks[conversation_id] == "error"

@pytest.mark.asyncio
async def test_recursive_tool_calls():
    """Test recursive tool calls in process_tool_calls_and_continue"""
    # Create test data
    conversation_id = f"test_{uuid.uuid4()}"
    conversations[conversation_id] = []
    tool_calls = [SAMPLE_TOOL_CALL]
    
    # Mock process_tool_calls to simulate tool execution using module-level patching
    import app.api.services.tool_execution as tool_execution_module
    original_func = tool_execution_module.process_tool_calls
    
    try:
        mock_process = MagicMock()
        mock_process.return_value = [
            {
                "tool_use_id": "tool_call_12345",
                "content": json.dumps(SAMPLE_TOOL_RESULT)
            }
        ]
        tool_execution_module.process_tool_calls = mock_process
        
        # Mock Anthropic client to return a response with another tool call
        with patch('app.api.routes.chat.client') as mock_client:
            # First create a mock response that has a new tool call
            mock_response = MagicMock()
            mock_response.content = [
                {"type": "text", "text": "Here's what I found"},
                {"type": "tool_use", "id": "tool_call_67890", "name": "python_interpreter", "input": {"code": "print('Another call')"}}
            ]
            mock_response.model_dump = MagicMock(return_value={"content": mock_response.content})
            
            # Then have the client return it
            mock_client.messages.create = MagicMock(return_value=mock_response)
            
            # Patch the recursive call to track it
            with patch('app.api.services.tool_execution.process_tool_calls_and_continue', AsyncMock()) as mock_recursive:
                # Call the function
                await process_tool_calls_and_continue(
                    tool_calls,
                    conversation_id,
                    1000,  # max_tokens
                    False,  # thinking_mode
                    2000,   # thinking_budget_tokens
                    True,    # auto_execute_tools - enable recursion
                    mock_client  # Pass the client explicitly
                )
                
                # Verify that the recursive function was called with the new tool calls
                mock_recursive.assert_called_once()
                args, kwargs = mock_recursive.call_args
                assert len(args[0]) == 1  # First arg should be the new tool calls
                assert args[0][0]["id"] == "tool_call_67890"  # Should have the new tool call
    finally:
        # Restore the original function
        tool_execution_module.process_tool_calls = original_func

# Tests for auto execution limit
def test_auto_execute_count_functions():
    """Test functions for tracking auto execution counts"""
    # Setup
    conversation_id = f"test_{uuid.uuid4()}"
    
    # Test initial count is 0
    assert get_auto_execute_count(conversation_id) == 0
    
    # Test increment increases count
    assert increment_auto_execute_count(conversation_id) == 1
    assert increment_auto_execute_count(conversation_id) == 2
    assert increment_auto_execute_count(conversation_id) == 3
    
    # Test get function returns current count
    assert get_auto_execute_count(conversation_id) == 3
    
    # Test reset function
    reset_auto_execute_count(conversation_id)
    assert get_auto_execute_count(conversation_id) == 0

@pytest.mark.asyncio
async def test_process_tool_calls_with_limit():
    """Test the counter functions directly for the auto tool limit feature"""
    # Create test data
    conversation_id = f"test_{uuid.uuid4()}"
    
    # Test counter starts at 0
    assert get_auto_execute_count(conversation_id) == 0
    
    # Increment to just before the limit
    for i in range(10):
        increment_auto_execute_count(conversation_id)
    assert get_auto_execute_count(conversation_id) == 10
    
    # One more increment should put us over the limit
    assert increment_auto_execute_count(conversation_id) == 11
    
    # Reset should put it back to 0
    reset_auto_execute_count(conversation_id)
    assert get_auto_execute_count(conversation_id) == 0
    
    # Test with multiple conversations
    conversation_id2 = f"test_{uuid.uuid4()}"
    assert increment_auto_execute_count(conversation_id) == 1
    assert increment_auto_execute_count(conversation_id2) == 1
    assert get_auto_execute_count(conversation_id) == 1
    assert get_auto_execute_count(conversation_id2) == 1
    
    # Reset one conversation shouldn't affect the other
    reset_auto_execute_count(conversation_id)
    assert get_auto_execute_count(conversation_id) == 0
    assert get_auto_execute_count(conversation_id2) == 1

@pytest.mark.asyncio
async def test_resume_after_limit(mock_anthropic_client):
    """Test resuming execution after hitting the limit"""
    # Create test data
    conversation_id = f"test_{uuid.uuid4()}"
    
    # Setup conversation with tool calls and paused status
    conversations[conversation_id] = [
        {"role": "user", "content": [{"type": "text", "text": "Test message"}]},
        {"role": "assistant", "content": [
            {"type": "text", "text": "Initial response"},
            {"type": "tool_use", "id": "tool_call_67890", "name": "python_interpreter", "input": {"code": "print('Another call')"}}
        ]}
    ]
    
    # Set status to paused and auto execute count to beyond limit
    auto_execute_tasks[conversation_id] = "paused"
    for i in range(11):
        increment_auto_execute_count(conversation_id)
    
    # Import the resume function
    from app.api.routes.conversation import resume_auto_execution
    
    # Test resume functionality
    from fastapi import BackgroundTasks
    background_tasks = BackgroundTasks()
    
    # Patch the background_tasks.add_task to avoid actually calling it
    with patch.object(background_tasks, 'add_task') as mock_add_task:
        # Call resume function
        from fastapi import HTTPException
        # Mock the add_message_to_conversation function in the correct module
        with patch('app.api.services.conversation.add_message_to_conversation') as mock_add_message:
            with patch('app.api.routes.conversation.process_tool_calls_and_continue') as mock_process:
                # Mock the client in conversation router
                from app.api.routes.conversation import client
                old_client = client
                from app.api.routes.conversation import set_anthropic_client
                set_anthropic_client(mock_anthropic_client)
                
                try:
                    result = await resume_auto_execution(
                        conversation_id=conversation_id,
                        background_tasks=background_tasks
                    )
                    
                    # Check counter was reset
                    assert get_auto_execute_count(conversation_id) == 0
                    
                    # Check status was updated
                    assert auto_execute_tasks[conversation_id] == "running"
                    
                    # Check background task was called
                    mock_add_task.assert_called_once()
                    
                    # Check success message
                    assert result["status"] == "success"
                    
                except HTTPException as e:
                    pytest.fail(f"resume_auto_execution raised HTTPException: {str(e)}")
                
                # Restore the original client
                set_anthropic_client(old_client)

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 