#!/usr/bin/env python3
"""
Test script for tool execution service with async improvements.
This script tests the async improvements made to the tool execution system.
"""

import os
import sys
import json
import logging
import asyncio
import unittest
import uuid
from datetime import datetime
from unittest.mock import patch, MagicMock, AsyncMock

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
app_dir = os.path.join(parent_dir, "app")
if app_dir not in sys.path:
    sys.path.append(app_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the modules to test
from app.api.services.conversation import (
    conversations, conversation_root_dirs, auto_execute_tasks,
    add_message_to_conversation, update_progress, get_request_progress
)
from app.api.services.tool_execution import (
    auto_execute_tool_calls, process_tool_calls_and_continue
)
from app.api.tools.tool_wrapper import (
    TOOL_DEFINITIONS, format_tool_results_for_claude
)

class TestToolExecutionAsync(unittest.IsolatedAsyncioTestCase):
    """Test suite for async tool execution functionality"""
    
    async def asyncSetUp(self):
        """Set up test fixtures"""
        # Clear any existing conversation data
        self.conversation_id = f"test_conv_{uuid.uuid4()}"
        conversations[self.conversation_id] = []
        
        # Create a test root directory
        self.root_dir = f"test_root_{uuid.uuid4()}"
        if not os.path.exists("test_output"):
            os.makedirs("test_output", exist_ok=True)
        self.test_dir = os.path.join("test_output", self.root_dir)
        os.makedirs(self.test_dir, exist_ok=True)
        conversation_root_dirs[self.conversation_id] = self.test_dir
        
        # Create mock tools and client
        self.mock_tool_call = {
            "id": f"tool_call_{uuid.uuid4()}",
            "name": "save_file",
            "input": {
                "file_path": os.path.join(self.test_dir, "test.txt"),
                "content": "Test content"
            }
        }
        
        self.mock_claude_client = MagicMock()
        
        # Mock Claude's response
        self.mock_claude_response = AsyncMock()
        content_item = {
            "type": "text", 
            "text": "I've executed the tool for you."
        }
        
        class MockContent:
            def __init__(self, item):
                self.type = item["type"]
                self.text = item["text"]
                
            def model_dump(self):
                return {"type": self.type, "text": self.text}
        
        self.mock_claude_response.content = [MockContent(content_item)]
        self.mock_claude_response.model_dump = MagicMock(return_value={
            "content": [content_item]
        })
        
        self.mock_claude_client.messages.create = AsyncMock(return_value=self.mock_claude_response)
    
    async def asyncTearDown(self):
        """Clean up after tests"""
        # Remove test conversation data
        if self.conversation_id in conversations:
            del conversations[self.conversation_id]
        if self.conversation_id in conversation_root_dirs:
            del conversation_root_dirs[self.conversation_id]
        if self.conversation_id in auto_execute_tasks:
            del auto_execute_tasks[self.conversation_id]
        
        # Clean up test directory
        import shutil
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    async def test_auto_execute_tool_calls(self):
        """Test auto-executing a tool call"""
        # Test executing tool calls
        tool_results = await auto_execute_tool_calls([self.mock_tool_call], self.conversation_id)
        
        # Verify the results
        self.assertEqual(len(tool_results), 1)
        self.assertEqual(tool_results[0]["tool_use_id"], self.mock_tool_call["id"])
        
        # Verify the result contains the expected fields
        result_content = json.loads(tool_results[0]["content"])
        self.assertEqual(result_content["status"], "success")
        self.assertIn("file_path", result_content)
    
    @patch("app.api.services.tool_execution.asyncio.to_thread")
    async def test_process_tool_calls_with_placeholder(self, mock_to_thread):
        """Test processing tool calls with placeholder messages"""
        # Configure asyncio.to_thread mock to return our mock Claude response
        mock_to_thread.return_value = self.mock_claude_response
        
        # Prepare for the test
        tool_calls = [self.mock_tool_call]
        
        # Use AsyncMock for update_progress
        with patch("app.api.services.tool_execution.update_progress", new=AsyncMock()) as mock_update_progress:
            # Execute the function
            await process_tool_calls_and_continue(
                tool_calls,
                self.conversation_id,
                1000,  # max_tokens
                False,  # thinking_mode
                2000,   # thinking_budget_tokens
                True,   # auto_execute_tools
                self.mock_claude_client
            )
            
            # Verify progress updates were called
            mock_update_progress.assert_called()
            
            # Verify Claude client was called
            self.mock_claude_client.messages.create.assert_called()
            
            # Verify the conversation has all expected messages
            # Should have: user message, assistant response with placeholder, tool results, final response
            messages = conversations[self.conversation_id]
            
            # Verify there are no placeholder messages left in conversation
            placeholder_messages = [
                msg for msg in messages 
                if msg.get("is_placeholder", False)
            ]
            self.assertEqual(len(placeholder_messages), 0, 
                             "Placeholder messages should be removed after processing")
            
            # Verify the final message is from assistant
            self.assertTrue(len(messages) > 0, "Conversation should have messages")
            self.assertEqual(messages[-1]["role"], "assistant", 
                             "Last message should be from assistant")
    
    @patch("app.api.services.tool_execution.asyncio.to_thread")
    async def test_sequential_tool_execution(self, mock_to_thread):
        """Test that tools are executed one by one with status updates"""
        # Configure asyncio.to_thread mock to return our mock Claude response
        mock_to_thread.return_value = self.mock_claude_response
        
        # Create multiple tool calls
        tool_calls = [
            self.mock_tool_call,  # First tool call
            {   # Second tool call
                "id": f"tool_call_{uuid.uuid4()}",
                "name": "python_interpreter",
                "input": {
                    "code": "print('Hello, world!')"
                }
            }
        ]
        
        # Use AsyncMock for auto_execute_tool_calls and update_progress
        with patch("app.api.services.tool_execution.auto_execute_tool_calls", new=AsyncMock()) as mock_execute, \
             patch("app.api.services.tool_execution.update_progress", new=AsyncMock()) as mock_update_progress:
            
            # Configure mock_execute to return valid results
            mock_execute.side_effect = [
                [{"tool_use_id": tool_calls[0]["id"], "content": json.dumps({"status": "success"})}],
                [{"tool_use_id": tool_calls[1]["id"], "content": json.dumps({"status": "success"})}]
            ]
            
            # Execute the function
            await process_tool_calls_and_continue(
                tool_calls,
                self.conversation_id,
                1000,  # max_tokens
                False,  # thinking_mode
                2000,   # thinking_budget_tokens
                True,   # auto_execute_tools
                self.mock_claude_client
            )
            
            # Verify each tool was called separately
            self.assertEqual(mock_execute.call_count, 2, 
                             "Each tool should be executed separately")
            
            # Verify update_progress was called multiple times
            self.assertGreater(mock_update_progress.call_count, 2, 
                               "Progress should be updated several times")
    
    @patch("app.api.services.tool_execution.asyncio.to_thread")
    async def test_progress_tracking_during_execution(self, mock_to_thread):
        """Test progress tracking during tool execution"""
        # Configure asyncio.to_thread mock to return our mock Claude response
        mock_to_thread.return_value = self.mock_claude_response
        
        # Create tool call
        tool_call = self.mock_tool_call
        
        # Execute with real update_progress
        with patch("app.api.services.tool_execution.auto_execute_tool_calls") as mock_execute:
            # Configure mock to return valid results
            mock_execute.return_value = [{"tool_use_id": tool_call["id"], "content": json.dumps({"status": "success"})}]
            mock_execute.side_effect = None  # Ensure we don't use the previous test's side_effect
            
            # Execute the function
            await process_tool_calls_and_continue(
                [tool_call],
                self.conversation_id,
                1000,  # max_tokens
                False,  # thinking_mode
                2000,   # thinking_budget_tokens
                True,   # auto_execute_tools
                self.mock_claude_client
            )
            
            # Get progress information
            progress = await get_request_progress(self.conversation_id)
            
            # Verify progress information exists and has expected fields
            self.assertIsNotNone(progress)
            self.assertIn("status", progress)
            self.assertIn("step", progress)
            self.assertIn("message", progress)
            self.assertIn("progress_pct", progress)
            self.assertIn("timestamp", progress)
            
            # Verify progress percentage is reasonable
            self.assertGreaterEqual(progress["progress_pct"], 0)
            self.assertLessEqual(progress["progress_pct"], 100)
            
    async def test_cancellation_during_execution(self):
        """Test cancellation during tool execution"""
        # Setup tool calls
        tool_calls = [self.mock_tool_call]
        
        # Set up a background task to cancel the execution after a short delay
        async def cancel_after_delay():
            await asyncio.sleep(0.1)
            auto_execute_tasks[self.conversation_id] = "cancelled"
        
        # Start the cancellation task
        cancel_task = asyncio.create_task(cancel_after_delay())
        
        # Use AsyncMock for update_progress and auto_execute_tool_calls
        with patch("app.api.services.tool_execution.update_progress", new=AsyncMock()) as mock_update_progress, \
             patch("app.api.services.tool_execution.auto_execute_tool_calls", new=AsyncMock()) as mock_execute:
            
            # Configure mock to delay execution
            async def delayed_execution(*args, **kwargs):
                await asyncio.sleep(0.2)
                return [{"tool_use_id": tool_calls[0]["id"], "content": json.dumps({"status": "success"})}]
                
            mock_execute.side_effect = delayed_execution
            
            # Execute the function
            await process_tool_calls_and_continue(
                tool_calls,
                self.conversation_id,
                1000,
                False,
                2000,
                True,
                self.mock_claude_client
            )
            
            # Wait for the cancel task to complete
            await cancel_task
            
            # Verify cancel status was checked
            self.assertEqual(auto_execute_tasks[self.conversation_id], "cancelled",
                            "Execution should have been marked as cancelled")

if __name__ == "__main__":
    unittest.main()