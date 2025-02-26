"""
Tool execution services for handling automatic tool calls.
"""

import json
import logging
import asyncio
from typing import Dict, List, Any, Optional
import anthropic

from ..services.conversation import (
    conversations, auto_execute_tasks, 
    add_message_to_conversation, set_task_status
)
from app.tools.tool_wrapper import (
    process_tool_calls,
    format_tool_results_for_claude,
    TOOL_DEFINITIONS
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

async def auto_execute_tool_calls(tool_calls: List[Dict[str, Any]], conversation_id: str = None) -> List[Dict[str, Any]]:
    """
    Automatically execute tool calls and return results.
    
    Args:
        tool_calls: List of tool calls to execute
        conversation_id: Optional conversation ID for context
        
    Returns:
        List of tool results
    """
    try:
        logger.info(f"Automatically executing {len(tool_calls)} tool calls")
        
        # Use the existing process_tool_calls function to handle tool calls
        # Since process_tool_calls may not be an async function, ensure proper handling
        tool_results = process_tool_calls(tool_calls, conversation_id)
        
        # Return formatted tool results
        logger.info(f"Tool execution completed, {len(tool_results)} results obtained")
        return tool_results
    
    except Exception as e:
        logger.error(f"Error executing tool calls: {str(e)}")
        # Return error results
        error_results = []
        for tool_call in tool_calls:
            error_results.append({
                "tool_use_id": tool_call.get("id"),
                "content": json.dumps({
                    "status": "error",
                    "message": f"Error executing tool calls: {str(e)}"
                }, ensure_ascii=False)
            })
        return error_results

async def process_tool_calls_and_continue(
    tool_calls: List[Dict[str, Any]], 
    conversation_id: str, 
    max_tokens: int, 
    thinking_mode: bool, 
    thinking_budget_tokens: int,
    auto_execute_tools: bool,
    client: anthropic.Anthropic
):
    """
    Process tool calls, get results, and continue conversation with Claude until all tool calls are completed.
    
    Args:
        tool_calls: List of tool calls to process
        conversation_id: The conversation ID
        max_tokens: Maximum tokens for Claude response
        thinking_mode: Whether to enable thinking mode
        thinking_budget_tokens: Budget for thinking tokens
        auto_execute_tools: Whether to automatically execute tool calls
        client: Anthropic client instance
    """
    try:
        if not tool_calls:
            logger.info("No tool calls to process")
            return
            
        # Get conversation history
        if conversation_id not in conversations:
            logger.error(f"Conversation ID not found: {conversation_id}")
            return
        
        # Initialize or check task status
        if conversation_id not in auto_execute_tasks:
            set_task_status(conversation_id, "running")
        
        # Check if cancelled
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
            return
            
        history = conversations[conversation_id]
        
        # Automatically execute tool calls and get results
        try:
            tool_results = await auto_execute_tool_calls(tool_calls, conversation_id)
        except Exception as e:
            logger.error(f"Error executing tool calls: {str(e)}")
            # Add error message to history
            add_message_to_conversation(
                conversation_id,
                {
                    "role": "system",
                    "content": [{"type": "text", "text": f"Error executing tool calls: {str(e)}"}]
                }
            )
            set_task_status(conversation_id, "error")
            return
        
        # Check if cancelled
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
            return
        
        # Format tool results as expected by Claude API
        tool_result_blocks = format_tool_results_for_claude(tool_results)
        
        # Add tool results to conversation history
        add_message_to_conversation(
            conversation_id,
            {
                "role": "user",
                "content": tool_result_blocks
            }
        )
        
        # Prepare thinking parameter
        thinking_param = None
        temperature_param = 0.7
        if thinking_mode:
            thinking_param = {
                "type": "enabled",
                "budget_tokens": thinking_budget_tokens
            }
            temperature_param = 1.0
        
        # Check if cancelled
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
            return
            
        # Call Claude API to continue conversation
        logger.info(f"Continuing conversation with Claude, conversation ID: {conversation_id}")
        try:
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
                max_tokens=max_tokens,
                temperature=temperature_param,
                tools=TOOL_DEFINITIONS,
                thinking=thinking_param,
            )
        except Exception as e:
            logger.error(f"Error calling Claude API: {str(e)}")
            # Add error message to history
            add_message_to_conversation(
                conversation_id,
                {
                    "role": "system",
                    "content": [{"type": "text", "text": f"Error calling Claude API: {str(e)}"}]
                }
            )
            set_task_status(conversation_id, "error")
            return
        
        # Process response
        try:
            # Extract response content
            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                raw_content = response_dict.get('content', [])
            else:
                raw_content = response.content
                
            # Convert content items to dictionaries
            content = []
            for item in raw_content:
                if hasattr(item, 'model_dump'):
                    content.append(item.model_dump())
                elif hasattr(item, '__dict__'):
                    content.append(item.__dict__)
                else:
                    content.append(dict(item))
                    
            # Add assistant response to conversation history
            add_message_to_conversation(
                conversation_id,
                {"role": "assistant", "content": content}
            )
            
            # Check if cancelled
            if auto_execute_tasks.get(conversation_id) == "cancelled":
                logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
                return
                
            # Extract new tool calls
            new_tool_calls = []
            for item in content:
                if item.get('type') == 'tool_use':
                    new_tool_calls.append({
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "input": item.get('input', {})
                    })
                    
            # If there are new tool calls and automatic execution is enabled, recursively process
            if auto_execute_tools and new_tool_calls:
                logger.info(f"Found {len(new_tool_calls)} new tool calls, continuing processing")
                await process_tool_calls_and_continue(
                    new_tool_calls, 
                    conversation_id, 
                    max_tokens, 
                    thinking_mode, 
                    thinking_budget_tokens,
                    auto_execute_tools,
                    client
                )
                
        except Exception as e:
            logger.error(f"Error processing Claude response: {str(e)}")
            # Add error message to history
            add_message_to_conversation(
                conversation_id,
                {
                    "role": "system",
                    "content": [{"type": "text", "text": f"Error processing Claude response: {str(e)}"}]
                }
            )
            set_task_status(conversation_id, "error")
            
    except Exception as e:
        logger.error(f"Error processing tool calls and continuing conversation: {str(e)}")
        # Add error message to conversation history
        if conversation_id in conversations:
            add_message_to_conversation(
                conversation_id,
                {
                    "role": "system",
                    "content": [{"type": "text", "text": f"Error processing tool calls and continuing conversation: {str(e)}"}]
                }
            )
        set_task_status(conversation_id, "error")
    finally:
        # Clean up state after task completion
        if conversation_id in auto_execute_tasks and auto_execute_tasks[conversation_id] not in ["cancelled", "error"]:
            set_task_status(conversation_id, "completed") 