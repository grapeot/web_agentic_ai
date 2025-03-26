#!/usr/bin/env python3
"""
Test script for async status tracking and conversation management.
This script tests the async improvements made to the status tracking system.
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
    conversations, conversation_root_dirs, 
    add_message_to_conversation, update_progress, 
    get_request_progress, request_progress
)

class TestAsyncStatus(unittest.IsolatedAsyncioTestCase):
    """Test suite for async status tracking functionality"""
    
    async def asyncSetUp(self):
        """Set up test fixtures"""
        # Clear any existing conversation data
        self.conversation_id = f"test_conv_{uuid.uuid4()}"
        conversations[self.conversation_id] = []
        request_progress.clear()
    
    async def asyncTearDown(self):
        """Clean up after tests"""
        # Remove test conversation data
        if self.conversation_id in conversations:
            del conversations[self.conversation_id]
        if self.conversation_id in conversation_root_dirs:
            del conversation_root_dirs[self.conversation_id]
        if self.conversation_id in request_progress:
            del request_progress[self.conversation_id]
    
    async def test_update_progress(self):
        """Test updating progress information"""
        # Update progress
        status = "waiting_for_claude"
        step = "api_request"
        message = "Waiting for Claude's response..."
        progress_pct = 25
        
        await update_progress(
            self.conversation_id,
            status,
            step,
            message,
            progress_pct
        )
        
        # Verify the progress was updated
        progress = await get_request_progress(self.conversation_id)
        self.assertEqual(progress["status"], status)
        self.assertEqual(progress["step"], step)
        self.assertEqual(progress["message"], message)
        self.assertEqual(progress["progress_pct"], progress_pct)
        
    async def test_multiple_progress_updates(self):
        """Test multiple sequential progress updates"""
        # First update
        await update_progress(
            self.conversation_id,
            "executing_tool",
            "tool_execution",
            "Executing tool: python_interpreter...",
            10
        )
        
        # Second update
        await update_progress(
            self.conversation_id,
            "waiting_for_claude",
            "api_request",
            "Waiting for Claude's response...",
            50
        )
        
        # Verify the latest progress was saved
        progress = await get_request_progress(self.conversation_id)
        self.assertEqual(progress["status"], "waiting_for_claude")
        self.assertEqual(progress["step"], "api_request")
        self.assertEqual(progress["message"], "Waiting for Claude's response...")
        self.assertEqual(progress["progress_pct"], 50)
    
    async def test_placeholder_message_filtering(self):
        """Test that placeholder messages can be added and filtered"""
        # Add a regular message
        add_message_to_conversation(
            self.conversation_id,
            {"role": "user", "content": [{"type": "text", "text": "Hello"}]}
        )
        
        # Add a placeholder message
        add_message_to_conversation(
            self.conversation_id,
            {
                "role": "assistant", 
                "content": [{"type": "text", "text": "Thinking..."}],
                "is_placeholder": True,
                "id": f"placeholder_{int(datetime.now().timestamp())}"
            }
        )
        
        # Add a status message
        add_message_to_conversation(
            self.conversation_id,
            {
                "role": "system",
                "content": [{"type": "text", "text": "Executing tool: python_interpreter"}],
                "is_status": True,
                "id": f"status_{int(datetime.now().timestamp())}"
            }
        )
        
        # Verify all messages are in the conversation
        self.assertEqual(len(conversations[self.conversation_id]), 3)
        
        # Filter out placeholder and status messages
        display_history = [
            msg for msg in conversations[self.conversation_id]
            if not msg.get("is_placeholder") and not msg.get("is_status")
        ]
        
        # Verify only the regular message remains
        self.assertEqual(len(display_history), 1)
        self.assertEqual(display_history[0]["role"], "user")
    
    async def test_message_replacement(self):
        """Test that placeholder messages can be replaced with real messages"""
        # Add a placeholder message
        placeholder_id = f"placeholder_{int(datetime.now().timestamp())}"
        add_message_to_conversation(
            self.conversation_id,
            {
                "role": "assistant", 
                "content": [{"type": "text", "text": "Thinking..."}],
                "is_placeholder": True,
                "id": placeholder_id
            }
        )
        
        # Replace placeholder messages
        conversations[self.conversation_id] = [
            msg for msg in conversations[self.conversation_id]
            if not (msg.get("is_placeholder") and msg.get("id") == placeholder_id)
        ]
        
        # Add the real message
        add_message_to_conversation(
            self.conversation_id,
            {"role": "assistant", "content": [{"type": "text", "text": "Real response"}]}
        )
        
        # Verify only the real message remains
        self.assertEqual(len(conversations[self.conversation_id]), 1)
        self.assertEqual(conversations[self.conversation_id][0]["role"], "assistant")
        self.assertEqual(
            conversations[self.conversation_id][0]["content"][0]["text"], 
            "Real response"
        )
        
    async def test_temporary_status_messages(self):
        """Test that temporary status messages can be added and filtered"""
        # Add regular messages
        add_message_to_conversation(
            self.conversation_id,
            {"role": "user", "content": [{"type": "text", "text": "Hello"}]}
        )
        
        # Add temporary status messages
        status_id1 = f"status_{int(datetime.now().timestamp())}"
        add_message_to_conversation(
            self.conversation_id,
            {
                "role": "system", 
                "content": [{"type": "text", "text": "Executing tool: command_line"}],
                "is_status": True,
                "is_temporary": True,
                "id": status_id1
            }
        )
        
        # Add another temporary status message
        status_id2 = f"status_{int(datetime.now().timestamp()+1)}"
        add_message_to_conversation(
            self.conversation_id,
            {
                "role": "system", 
                "content": [{"type": "text", "text": "Tool executed successfully"}],
                "is_status": True,
                "is_temporary": True,
                "id": status_id2
            }
        )
        
        # Verify all messages are in the conversation
        self.assertEqual(len(conversations[self.conversation_id]), 3)
        
        # Filter temporary messages
        conversations[self.conversation_id] = [
            msg for msg in conversations[self.conversation_id]
            if not msg.get("is_temporary")
        ]
        
        # Verify only non-temporary messages remain
        self.assertEqual(len(conversations[self.conversation_id]), 1)
        self.assertEqual(conversations[self.conversation_id][0]["role"], "user")
        self.assertEqual(
            conversations[self.conversation_id][0]["content"][0]["text"], 
            "Hello"
        )
    
    async def test_progress_update_with_asyncio_lock(self):
        """Test that progress updates work correctly with asyncio locks"""
        # Simulate concurrent progress updates
        async def update_concurrently():
            tasks = []
            for i in range(5):
                task = asyncio.create_task(update_progress(
                    self.conversation_id,
                    f"status_{i}",
                    f"step_{i}",
                    f"Message {i}",
                    i * 20
                ))
                tasks.append(task)
            await asyncio.gather(*tasks)
        
        # Run concurrent updates
        await update_concurrently()
        
        # Get final progress state
        progress = await get_request_progress(self.conversation_id)
        
        # Verify it has valid data (we don't know which one finished last)
        self.assertIn("status", progress)
        self.assertIn("step", progress)
        self.assertIn("message", progress) 
        self.assertIn("progress_pct", progress)
        self.assertIn("timestamp", progress)

if __name__ == "__main__":
    unittest.main()