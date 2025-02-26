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
from app.api.app import auto_execute_tool_calls, process_tool_calls_and_continue
from app.api.app import conversations, auto_execute_tasks, client

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
    with patch('app.api.app.process_tool_calls') as mock_func:
        mock_func.return_value = [
            {
                "tool_use_id": "tool_call_12345",
                "content": json.dumps(SAMPLE_TOOL_RESULT)
            }
        ]
        yield mock_func

@pytest.fixture
def mock_anthropic_client():
    """Mock the Anthropic client for API calls"""
    class MockResponse:
        def __init__(self, content):
            self.content = content
            self.thinking = None
            
        def model_dump(self):
            result = {"content": self.content}
            if self.thinking:
                result["thinking"] = self.thinking
            return result
    
    with patch('app.api.app.client') as mock_client:
        mock_create = MagicMock()
        mock_create.return_value = MockResponse([
            {"type": "text", "text": "Test response after tool execution"}
        ])
        mock_client.messages.create = mock_create
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
    
    # Mock process_tool_calls to raise an exception
    with patch('app.api.app.process_tool_calls', side_effect=Exception("Test error")):
        # Call the function
        result = await auto_execute_tool_calls(tool_calls, conversation_id)
        
        # Verify the result contains an error
        assert len(result) == 1
        assert result[0]["tool_use_id"] == "tool_call_12345"
        error_content = json.loads(result[0]["content"])
        assert error_content["status"] == "error"
        assert "Test error" in error_content["message"]

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
        False   # auto_execute_tools
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
        False   # auto_execute_tools
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
    with patch('app.api.app.client') as mock_client:
        mock_create = MagicMock(side_effect=Exception("API error"))
        mock_client.messages.create = mock_create
        
        # Call the function
        await process_tool_calls_and_continue(
            tool_calls,
            conversation_id,
            1000,  # max_tokens
            False,  # thinking_mode
            2000,   # thinking_budget_tokens
            False   # auto_execute_tools
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
    
    # Mock process_tool_calls to simulate tool execution
    with patch('app.api.app.process_tool_calls') as mock_process:
        mock_process.return_value = [
            {
                "tool_use_id": "tool_call_12345",
                "content": json.dumps(SAMPLE_TOOL_RESULT)
            }
        ]
        
        # Mock Anthropic client to return a response with another tool call
        with patch('app.api.app.client') as mock_client:
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
            with patch('app.api.app.process_tool_calls_and_continue', AsyncMock()) as mock_recursive:
                # Call the function
                await process_tool_calls_and_continue(
                    tool_calls,
                    conversation_id,
                    1000,  # max_tokens
                    False,  # thinking_mode
                    2000,   # thinking_budget_tokens
                    True    # auto_execute_tools - enable recursion
                )
                
                # Verify that the recursive function was called with the new tool calls
                mock_recursive.assert_called_once()
                args, kwargs = mock_recursive.call_args
                assert len(args[0]) == 1  # First arg should be the new tool calls
                assert args[0][0]["id"] == "tool_call_67890"  # Should have the new tool call

if __name__ == "__main__":
    pytest.main(["-v", __file__]) 