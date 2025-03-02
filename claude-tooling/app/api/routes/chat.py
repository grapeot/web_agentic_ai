"""
Chat API routes for interacting with Claude.
"""

import os
import logging
import time
import json
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request, Depends

from ..models.schemas import Message, UserRequest, UserResponse, ToolOutput
from ..services.conversation import (
    conversations, conversation_root_dirs, 
    create_conversation_root_dir, add_message_to_conversation,
    get_conversation, get_root_dir, get_task_status, set_task_status
)
from ..services.tool_execution import process_tool_calls_and_continue, auto_execute_tool_calls
from ..services.markdown_service import MarkdownService
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
        
        # 首先检查URL参数中是否提供了conversation_id
        if not conversation_id:
            # 如果URL参数中没有提供，尝试从请求体的系统消息中提取
            for message in request.messages:
                if message.role == "system" and any(content.get("conversation_id") for content in message.content if isinstance(content, dict)):
                    conversation_id = next((content.get("conversation_id") for content in message.content if isinstance(content, dict) and "conversation_id" in content), None)
                    break
        
        # 如果仍未找到，创建新的conversation_id
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
        
        # Extract system message content for Claude API
        system_content = "You are running in a headless environment. When generating code that creates visualizations or outputs, DO NOT use interactive elements like plt.show(), figure.show(), or display()."
        
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
        
        # Make the API call to Claude
        logger.info("Sending request to Claude API")
        
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
        
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            system=system_content,
            messages=api_messages,
            max_tokens=request.max_tokens,
            temperature=temperature_param,
            tools=TOOL_DEFINITIONS,
            thinking=thinking_param,
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
        # Process Markdown content before returning
        if content:
            processed_content = MarkdownService.process_message_content(content)
            logger.debug(f"Processed message content with Markdown conversion")
        else:
            processed_content = content

        return UserResponse(
            message=Message(role="assistant", content=processed_content),
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
            system="You are running in a headless environment. When generating code that creates visualizations or outputs:\n"\
                  "1. DO NOT use interactive elements like plt.show(), figure.show(), or display()\n"\
                  "2. Instead, save outputs to files (e.g., plt.savefig('output.png'))\n"\
                  "3. For Python plots, use matplotlib's savefig() method\n"\
                  "4. For Jupyter-style outputs, write to files instead\n"\
                  "5. Always provide complete, self-contained code that can run without user interaction\n"\
                  "6. Assume your code runs in a script context, not an interactive notebook",
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
        
        # Prepare the result to return to the frontend
        result = {
            "message": Message(role="assistant", content=content),
            "conversation_id": conversation_id,
            "tool_calls": [] if auto_execute_tools else tool_calls,
        }
        
        # Process Markdown content in message before returning
        if "message" in result and result["message"] and "content" in result["message"]:
            processed_content = MarkdownService.process_message_content(result["message"].content)
            result["message"].content = processed_content
            
        return UserResponse(**result)
        
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