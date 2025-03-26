#!/usr/bin/env python3
"""
Script for testing automatic tool execution functionality.

Usage:
    python scripts/test_auto_execute.py "your request message"
    
Example:
    python scripts/test_auto_execute.py "Write a Python script to calculate the first 20 Fibonacci numbers"
    
Press Ctrl+C at any time to interrupt the execution process.
"""

import os
import sys
import json
import time
import signal
import requests
from dotenv import load_dotenv

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Load environment variables
load_dotenv()

# Set API endpoint
API_URL = "http://localhost:8004"  # Recommended port

# Global variables for interrupt handling
current_conversation_id = None
interrupt_requested = False

def signal_handler(sig, frame):
    """Handle Ctrl+C signal"""
    global interrupt_requested
    
    if interrupt_requested:  # If Ctrl+C has already been pressed once, exit immediately
        print("\n\033[91mForce exit...\033[0m")
        sys.exit(1)
        
    interrupt_requested = True
    print("\n\033[93mInterrupt signal received, attempting to cancel execution...\033[0m")
    
    # If there's an active session, send a cancel request
    if current_conversation_id:
        try:
            cancel_auto_execution(current_conversation_id)
        except Exception as e:
            print(f"\033[91mCancel request failed: {str(e)}\033[0m")
            
    # Don't exit immediately, let the program finish cleanup

# Set up signal handler
signal.signal(signal.SIGINT, signal_handler)

def cancel_auto_execution(conversation_id):
    """Send request to cancel automatic execution"""
    try:
        response = requests.post(f"{API_URL}/api/conversation/{conversation_id}/cancel")
        if response.status_code == 200:
            print(f"\033[93mCancel request sent\033[0m")
            return True
        else:
            print(f"\033[91mCancel request failed, status code: {response.status_code}\033[0m")
            print(response.text)
            return False
    except Exception as e:
        print(f"\033[91mError sending cancel request: {str(e)}\033[0m")
        return False

def get_conversation_messages(conversation_id):
    """Get conversation message history"""
    try:
        response = requests.get(f"{API_URL}/api/conversation/{conversation_id}/messages")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to get messages, status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error getting messages: {str(e)}")
        return None

def print_message(message, prefix=""):
    """Print message content"""
    role = message.get("role", "unknown")
    content = message.get("content", [])
    
    # Set color based on role
    color = "\033[0m"  # Default
    if role == "user":
        color = "\033[94m"  # Blue
    elif role == "assistant":
        color = "\033[92m"  # Green
    elif role == "system":
        color = "\033[93m"  # Yellow
    
    print(f"{prefix}{color}[{role}]:\033[0m")
    
    for item in content:
        if isinstance(item, dict):
            item_type = item.get("type", "unknown")
            
            if item_type == "text" and "text" in item:
                print(f"{prefix}  {item['text']}")
            elif item_type == "tool_use":
                print(f"{prefix}  \033[93m[Tool Call]: {item.get('name', 'unknown')}\033[0m")
                print(f"{prefix}    Input: {json.dumps(item.get('input', {}), indent=2)}")
            elif item_type == "tool_result":
                print(f"{prefix}  \033[96m[Tool Result]:\033[0m")
                try:
                    result = json.loads(item.get("content", "{}"))
                    print(f"{prefix}    {json.dumps(result, indent=2)}")
                except:
                    print(f"{prefix}    {item.get('content', '')}")
            elif item_type == "thinking" and "thinking" in item:
                print(f"{prefix}  \033[95m[Thinking Process]:\033[0m")
                print(f"{prefix}    {item['thinking']}")
        elif isinstance(item, str):
            print(f"{prefix}  {item}")

def send_message(message):
    """Send message to API and get response"""
    try:
        # Prepare request body with properly structured messages
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": message
                        }
                    ]
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4096,
            "thinking_mode": True,
            "thinking_budget_tokens": 2000,
            "auto_execute_tools": True  # Enable automatic tool execution
        }
        
        # Send request
        print("\033[93mSending request...\033[0m")
        response = requests.post(f"{API_URL}/api/chat", json=request_body)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Request failed, status code: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        return None

def main():
    """Main function"""
    global current_conversation_id, interrupt_requested
    
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} \"your request message\"")
        return
    
    # Get user message
    user_message = sys.argv[1]
    
    # Send message
    response = send_message(user_message)
    
    if not response:
        return
    
    # Get conversation ID
    current_conversation_id = response.get("conversation_id")
    
    if not current_conversation_id:
        print("Conversation ID not found")
        return
    
    print(f"\033[93mConversation ID: {current_conversation_id}\033[0m")
    print(f"\033[93m(Press Ctrl+C to interrupt execution at any time)\033[0m")
    
    # Display initial response
    if "message" in response:
        print_message(response["message"])
    
    # Poll for new messages
    print("\033[93mStarting to poll for new messages...\033[0m")
    
    last_messages_count = 2  # Initially there's a user message and assistant response
    status = "in_progress"
    
    try:
        while status == "in_progress" and not interrupt_requested:
            time.sleep(1.5)  # Poll every 1.5 seconds
            
            conversation = get_conversation_messages(current_conversation_id)
            
            if not conversation:
                continue
            
            status = conversation.get("status", "in_progress")
            messages = conversation.get("messages", [])
            
            # If there are new messages, print them
            if len(messages) > last_messages_count:
                for i in range(last_messages_count, len(messages)):
                    print_message(messages[i])
                
                last_messages_count = len(messages)
            
            # Check if there's a system message indicating execution has been canceled
            if len(messages) > 0 and messages[-1].get("role") == "system":
                status = "cancelled"
                
        if status == "cancelled":
            print("\033[93mAutomatic execution has been canceled!\033[0m")
        else:
            print("\033[93mConversation completed!\033[0m")
            
    except KeyboardInterrupt:
        # This exception handling is redundant because the signal handler already handles Ctrl+C
        # But keep it as an additional safety measure
        if current_conversation_id and not interrupt_requested:
            cancel_auto_execution(current_conversation_id)
            
    except Exception as e:
        print(f"\033[91mExecution error: {str(e)}\033[0m")
        
    finally:
        # Make sure global variables are reset when the script ends
        current_conversation_id = None
        interrupt_requested = False

if __name__ == "__main__":
    main() 