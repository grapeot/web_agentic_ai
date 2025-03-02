"""
Chat API routes for interacting with Claude.
"""

import os
import logging
import json
import datetime
import time
import asyncio
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends

from ..models.schemas import Message, UserRequest, UserResponse, ToolOutput
from ..services.conversation import (
    conversations, conversation_root_dirs, 
    create_conversation_root_dir, add_message_to_conversation,
    get_conversation, get_root_dir, get_task_status, set_task_status,
    reset_auto_execute_count
)
from ..services.tool_execution import process_tool_calls_and_continue, auto_execute_tool_calls
from ..tools.tool_wrapper import TOOL_DEFINITIONS, format_tool_results_for_claude

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api")

# Anthropic client - will be set from app.py
client = None

# Extract system message content for Claude API
system_content = "You are running in a headless environment. When generating code that creates visualizations or outputs, DO NOT use interactive elements like plt.show(), figure.show(), or display(). If the code generates any file, print out the file path in the code."
        

def set_anthropic_client(anthropic_client):
    """Set the Anthropic client for this module"""
    global client
    client = anthropic_client
    logger.info("Anthropic client set in chat router")

@router.post("/chat", response_model=UserResponse)
async def chat(request: UserRequest, background_tasks: BackgroundTasks, conversation_id: Optional[str] = None):
    """
    Process a chat request to Claude 3.7, handling tool calls.
    """
    try:
        logger.info("Received chat request")
        
        # First check if conversation_id is provided in the URL parameters
        if not conversation_id:
            # If not provided, try to extract it from the system message
            for message in request.messages:
                if message.role == "system" and any(content.get("conversation_id") for content in message.content if isinstance(content, dict)):
                    conversation_id = next((content.get("conversation_id") for content in message.content if isinstance(content, dict) and "conversation_id" in content), None)
                    break
        
        # If still not found, create a new conversation_id
        if not conversation_id:
            conversation_id = f"conv_{int(time.time())}"
            logger.info(f"Created new conversation ID: {conversation_id}")
            
            # Create a root directory for this conversation
            create_conversation_root_dir(conversation_id)
        else:
            logger.info(f"Using existing conversation ID: {conversation_id}")
            
            # Create root directory if it doesn't exist for this conversation
            if conversation_id not in conversation_root_dirs:
                create_conversation_root_dir(conversation_id)
        
        # Prepare messages for Claude API
        api_messages = []
        
        for msg in request.messages:
            # Format message content for the API
            content_list = msg.content
            if isinstance(content_list, list):
                api_messages.append({
                    "role": msg.role,
                    "content": content_list
                })
            else:
                # If content is not a list, make it a list with a text item
                api_messages.append({
                    "role": msg.role,
                    "content": [{"type": "text", "text": content_list}]
                })
        
        # Make the API call to Claude, but do it asynchronously
        logger.info("Sending request to Claude API")
        
        # Set initial progress status
        from ..services.conversation import update_progress
        await update_progress(
            conversation_id,
            "waiting_for_claude",
            "api_request",
            "Waiting for Claude's response...",
            10
        )
        
        # Prepare thinking parameter if thinking mode is enabled
        thinking_param = None
        temperature_param = request.temperature
        if request.thinking_mode:
            thinking_param = {
                "type": "enabled",
                "budget_tokens": request.thinking_budget_tokens
            }
            # When thinking is enabled, temperature must be 1
            temperature_param = 1.0
            logger.info("Thinking mode enabled, setting temperature to 1.0")
        
        # Create a task for the API call
        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-3-7-sonnet-20250219",
            system=system_content,
            messages=api_messages,
            max_tokens=request.max_tokens,
            temperature=temperature_param,
            tools=TOOL_DEFINITIONS,
            thinking=thinking_param,
        )
        
        # Update progress after getting response
        await update_progress(
            conversation_id,
            "processing_response",
            "parsing_response",
            "Processing Claude's response...",
            50
        )
        
        logger.info("Received response from Claude API")
        logger.info(f"Response type: {type(response)}")
        
        # Extract thinking if available
        thinking = None
        if hasattr(response, 'thinking'):
            thinking = response.thinking
            logger.info(f"Found thinking: {thinking}")
        
        # Convert response content to dictionaries
        try:
            # First try to dump the model to a dict
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                logger.info(f"Successfully dumped response model")
                raw_content = response_dict.get('content', [])
            else:
                # Fallback: try to access content directly
                raw_content = response.content
                logger.info(f"Accessed content directly: {type(raw_content)}")
            
            # Convert content items to dictionaries
            content = []
            for item in raw_content:
                if hasattr(item, 'model_dump'):
                    content.append(item.model_dump())
                elif hasattr(item, '__dict__'):
                    content.append(item.__dict__)
                else:
                    # If it's already a dict or compatible
                    content.append(dict(item))
                    
            logger.info(f"Processed content items: {len(content)}")
        except Exception as e:
            logger.error(f"Error converting response content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing response: {str(e)}")
        
        # Process tool calls
        tool_calls = []
        try:
            for item in content:
                if item.get('type') == 'tool_use':
                    tool_calls.append({
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "input": item.get('input', {})
                    })
            
            if tool_calls:
                logger.info(f"Found {len(tool_calls)} tool calls")
        except Exception as e:
            logger.error(f"Error processing tool calls: {str(e)}")
            
        # Update the conversation history
        if conversation_id not in conversations:
            conversations[conversation_id] = []
        
        # Add user message and assistant response to conversation history
        add_message_to_conversation(
            conversation_id,
            {"role": "user", "content": request.messages[-1].content}
        )
        add_message_to_conversation(
            conversation_id,
            {"role": "assistant", "content": content}
        )
        
        # If auto-execute tools is enabled and there are tool calls, process them in the background
        if request.auto_execute_tools and tool_calls:
            logger.info("Automatic tool execution enabled, starting tool task")
            
            # Add a system message indicating tool execution is starting
            # This gives the frontend immediate feedback while the background task runs
            tool_names = ", ".join([t.get("name", "unknown") for t in tool_calls[:3]])
            if len(tool_calls) > 3:
                tool_names += f" and {len(tool_calls) - 3} more"
                
            add_message_to_conversation(
                conversation_id,
                {
                    "role": "system",
                    "content": [{"type": "text", "text": f"Executing tools: {tool_names}"}],
                    "id": f"tool_exec_start_{int(datetime.datetime.now().timestamp())}",
                    "is_status": True
                }
            )
            
            # Create a background task to handle tool calls and continue conversation
            background_tasks.add_task(
                process_tool_calls_and_continue, 
                tool_calls, 
                conversation_id, 
                request.max_tokens, 
                request.thinking_mode, 
                request.thinking_budget_tokens, 
                request.auto_execute_tools,
                client
            )
            
            # Don't include tool calls in the response when auto-execution is enabled
            # The frontend will get them through polling instead
            tool_calls_for_response = []
        else:
            # For manual execution, include tool calls in the response
            tool_calls_for_response = tool_calls
        
        # Prepare the response
        return UserResponse(
            message=Message(role="assistant", content=content),
            conversation_id=conversation_id,
            tool_calls=tool_calls_for_response,
            thinking=thinking
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tool-results", response_model=UserResponse)
async def submit_tool_results(
    tool_output: ToolOutput,
    background_tasks: BackgroundTasks,
    conversation_id: str,
    auto_execute_tools: bool = True
):
    """
    Process tool outputs and continue the conversation with Claude.
    """
    try:
        logger.info(f"Received tool output for conversation {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get conversation history
        history = get_conversation(conversation_id)
        
        # Add tool output to conversation history
        add_message_to_conversation(
            conversation_id,
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_output.tool_use_id,
                        "content": tool_output.content
                    }
                ]
            }
        )
        
        # Make the API call to continue the conversation
        logger.info("Sending tool result to Claude API")
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            system=system_content,
            messages=history,
            max_tokens=4096,
            temperature=1.0,  # Must be 1.0 when thinking is enabled
            tools=TOOL_DEFINITIONS,
            thinking={
                "type": "enabled",
                "budget_tokens": 2000
            },
        )
        
        logger.info("Received response from Claude API")
        logger.info(f"Response type: {type(response)}")
        
        # Convert response content to dictionaries
        try:
            # First try to dump the model to a dict
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                logger.info(f"Successfully dumped response model")
                raw_content = response_dict.get('content', [])
            else:
                # Fallback: try to access content directly
                raw_content = response.content
                logger.info(f"Accessed content directly: {type(raw_content)}")
            
            # Convert content items to dictionaries
            content = []
            for item in raw_content:
                if hasattr(item, 'model_dump'):
                    content.append(item.model_dump())
                elif hasattr(item, '__dict__'):
                    content.append(item.__dict__)
                else:
                    # If it's already a dict or compatible
                    content.append(dict(item))
                    
            logger.info(f"Processed content items: {len(content)}")
        except Exception as e:
            logger.error(f"Error converting response content: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing response: {str(e)}")
        
        # Process tool calls
        tool_calls = []
        try:
            for item in content:
                if item.get('type') == 'tool_use':
                    tool_calls.append({
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "input": item.get('input', {})
                    })
            
            if tool_calls:
                logger.info(f"Found {len(tool_calls)} tool calls")
        except Exception as e:
            logger.error(f"Error processing tool calls: {str(e)}")
        
        # Add assistant response to conversation history
        add_message_to_conversation(
            conversation_id,
            {"role": "assistant", "content": content}
        )
        
        # If automatic execution is enabled and there are tool calls, start background task to handle
        if auto_execute_tools and tool_calls:
            logger.info("Automatic tool execution enabled, starting tool task")
            
            # Create a background task to handle tool calls and continue conversation
            background_tasks.add_task(
                process_tool_calls_and_continue, 
                tool_calls, 
                conversation_id, 
                4096,  # max_tokens 
                True,  # thinking_mode
                2000,  # thinking_budget_tokens
                auto_execute_tools,
                client
            )
        
        # Prepare the response
        return UserResponse(
            message=Message(role="assistant", content=content),
            conversation_id=conversation_id,
            tool_calls=tool_calls
        )
        
    except Exception as e:
        logger.error(f"Error processing tool results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tools")
async def get_tools():
    """
    Get the list of available tools and their schemas.
    """
    return {"tools": TOOL_DEFINITIONS}

@router.post("/conversation/{conversation_id}/cancel")
async def cancel_auto_execution(conversation_id: str):
    """
    Cancel ongoing automatic tool execution.
    Allows user to interrupt long-running automatic tool execution process.
    """
    try:
        logger.info(f"Received cancel automatic execution request, conversation ID: {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Mark automatic execution task for this conversation as cancelled
        set_task_status(conversation_id, "cancelled")
        
        # Add system message to conversation history
        add_message_to_conversation(
            conversation_id,
            {
                "role": "system", 
                "content": [{"type": "text", "text": "Automatic tool execution cancelled by user"}]
            }
        )
        
        return {"status": "success", "message": "Automatic tool execution cancelled"}
        
    except Exception as e:
        logger.error(f"Error cancelling automatic execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 