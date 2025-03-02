"""
Tool execution services for handling automatic tool calls.
"""

import json
import logging
import asyncio
import datetime
from typing import Dict, List, Any, Optional
import anthropic

from ..services.conversation import (
    conversations, auto_execute_tasks, 
    add_message_to_conversation, set_task_status,
    get_auto_execute_count, increment_auto_execute_count, reset_auto_execute_count
)
from app.api.tools.tool_wrapper import (
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
        
        # Update progress status for tool execution
        from ..services.conversation import update_progress
        await update_progress(
            conversation_id,
            "executing_tool",
            "tool_execution",
            f"Executing tool: {tool_calls[0]['name']}..." if tool_calls else "Executing tools...",
            25
        )
        
        # Process each tool call one by one, updating the conversation history after each one
        # This way frontend polling will see real-time updates as each tool completes
        tool_results = []
        for i, tool_call in enumerate(tool_calls):
            try:
                # Add message that we're executing a specific tool
                tool_start_id = f"tool_start_{tool_call['id']}_{int(datetime.datetime.now().timestamp())}"
                add_message_to_conversation(
                    conversation_id,
                    {
                        "role": "system",
                        "content": [{"type": "text", "text": f"Executing tool: {tool_call['name']}..."}],
                        "id": tool_start_id,
                        "is_status": True
                    }
                )
                
                # Execute single tool
                single_result = await auto_execute_tool_calls([tool_call], conversation_id)
                tool_results.extend(single_result)
                
                # Remove the "executing" message
                if conversation_id in conversations:
                    conversations[conversation_id] = [
                        msg for msg in conversations[conversation_id] 
                        if not (msg.get("is_status") and msg.get("id") == tool_start_id)
                    ]
                    
                # Add completion message for this tool
                add_message_to_conversation(
                    conversation_id,
                    {
                        "role": "system",
                        "content": [{"type": "text", "text": f"Tool {tool_call['name']} executed successfully"}],
                        "id": f"tool_complete_{tool_call['id']}_{int(datetime.datetime.now().timestamp())}",
                        "is_status": True,
                        "is_temporary": True  # Mark as temporary so it can be cleaned up later
                    }
                )
                
                # Update progress
                progress_pct = 25 + (25 * (i + 1) / len(tool_calls))
                await update_progress(
                    conversation_id,
                    "executing_tool",
                    f"tool_{i+1}_of_{len(tool_calls)}",
                    f"Completed tool {i+1} of {len(tool_calls)}: {tool_call['name']}",
                    int(progress_pct)
                )
                
            except Exception as e:
                logger.error(f"Error executing tool call {tool_call['name']}: {str(e)}")
                # Add error message to history
                add_message_to_conversation(
                    conversation_id,
                    {
                        "role": "system",
                        "content": [{"type": "text", "text": f"Error executing tool {tool_call['name']}: {str(e)}"}]
                    }
                )
                await update_progress(
                    conversation_id,
                    "error",
                    "tool_execution_error",
                    f"Error executing tool {tool_call['name']}: {str(e)}",
                    0
                )
                return
        
        # Check if cancelled
        if auto_execute_tasks.get(conversation_id) == "cancelled":
            logger.info(f"Automatic execution of conversation {conversation_id} cancelled")
            return
        
        # Format tool results as expected by Claude API
        tool_result_blocks = format_tool_results_for_claude(tool_results)
        
        # Clean up temporary status messages before adding tool results
        if conversation_id in conversations:
            conversations[conversation_id] = [
                msg for msg in conversations[conversation_id] 
                if not msg.get("is_temporary")
            ]
            
        # Add tool results to conversation history
        add_message_to_conversation(
            conversation_id,
            {
                "role": "user",
                "content": tool_result_blocks
                # Removed "id" field as it's not accepted by Claude API
            }
        )
        
        # Update progress for Claude API call
        await update_progress(
            conversation_id,
            "waiting_for_claude",
            "waiting_for_response",
            "Tool execution complete. Waiting for Claude's response...",
            50
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
            
        # Call Claude API to continue conversation using asyncio to avoid blocking
        logger.info(f"Continuing conversation with Claude, conversation ID: {conversation_id}")
        try:
            # Add a placeholder message indicating we're waiting for Claude
            # This allows the frontend to see a message is being processed
            placeholder_msg_id = f"placeholder_{int(datetime.datetime.now().timestamp())}"
            add_message_to_conversation(
                conversation_id,
                {
                    "role": "assistant", 
                    "content": [{"type": "text", "text": "Thinking..."}],
                    "is_placeholder": True,
                    "id": placeholder_msg_id
                }
            )
            
            # Process history to separate system messages from conversation and clean up internal fields
            system_messages = [msg for msg in history if msg.get("role") == "system"]
            
            # Clean up messages before sending to API - remove internal fields not accepted by Claude API
            api_messages = []
            for msg in history:
                if msg.get("role") != "system":
                    # Create a clean copy without internal fields
                    clean_msg = {
                        "role": msg.get("role"),
                        "content": msg.get("content")
                    }
                    api_messages.append(clean_msg)
            
            # Ensure tool_use messages are properly followed by tool_result messages
            # First, find all assistant messages with tool_use blocks
            tool_use_indices = []
            for i, msg in enumerate(api_messages):
                if msg.get("role") == "assistant":
                    has_tool_use = False
                    if isinstance(msg.get("content"), list):
                        for content_item in msg.get("content", []):
                            if content_item.get("type") == "tool_use":
                                has_tool_use = True
                                break
                    if has_tool_use:
                        tool_use_indices.append(i)
            
            # Check each tool_use message to ensure it's followed by a tool_result
            if tool_use_indices:
                fixed_messages = []
                skip_indices = set()
                
                for i, msg in enumerate(api_messages):
                    # Skip messages we've already processed
                    if i in skip_indices:
                        continue
                    
                    # If this is a tool_use message
                    if i in tool_use_indices:
                        fixed_messages.append(msg)  # Add the assistant message with tool_use
                        
                        # Check if it's followed by a user message with tool_result
                        has_tool_result = False
                        if i + 1 < len(api_messages) and api_messages[i + 1].get("role") == "user":
                            user_msg = api_messages[i + 1]
                            if isinstance(user_msg.get("content"), list):
                                for content_item in user_msg.get("content", []):
                                    if content_item.get("type") == "tool_result":
                                        has_tool_result = True
                                        fixed_messages.append(user_msg)  # Add the user message with tool_result
                                        skip_indices.add(i + 1)  # Mark as processed
                                        break
                        
                        # If no tool_result follows, add an empty tool_result response
                        if not has_tool_result:
                            logger.warning(f"Tool use without corresponding tool result found at index {i}, adding placeholder")
                            tool_use_blocks = [item for item in msg.get("content", []) 
                                              if item.get("type") == "tool_use"]
                            
                            # Create empty tool results for each tool_use
                            empty_results = []
                            for tool_use in tool_use_blocks:
                                empty_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": tool_use.get("id"),
                                    "content": json.dumps({"status": "error", "message": "No result available"})
                                })
                            
                            if empty_results:
                                fixed_messages.append({
                                    "role": "user",
                                    "content": empty_results
                                })
                    else:
                        fixed_messages.append(msg)  # Add regular message
                
                # Replace with fixed messages
                api_messages = fixed_messages
            
            # Combine system messages into a single system prompt
            system_prompt = "You are running in a headless environment. When generating code that creates visualizations or outputs:\n"\
                      "1. DO NOT use interactive elements like plt.show(), figure.show(), or display()\n"\
                      "2. Instead, save outputs to files (e.g., plt.savefig('output.png'))\n"\
                      "3. For Python plots, use matplotlib's savefig() method\n"\
                      "4. For Jupyter-style outputs, write to files instead\n"\
                      "5. Always provide complete, self-contained code that can run without user interaction\n"\
                      "6. Assume your code runs in a script context, not an interactive notebook"
            
            # Add any additional system messages from the conversation
            for sys_msg in system_messages:
                if isinstance(sys_msg.get("content"), list):
                    for content_item in sys_msg.get("content", []):
                        if content_item.get("type") == "text":
                            system_prompt += "\n\n" + content_item.get("text", "")
            
            # Execute Claude API call in a separate thread to avoid blocking
            response = await asyncio.to_thread(
                client.messages.create,
                model="claude-3-7-sonnet-20250219",
                system=system_prompt,
                messages=api_messages,
                max_tokens=max_tokens,
                temperature=temperature_param,
                tools=TOOL_DEFINITIONS,
                thinking=thinking_param,
            )
            
            # Remove placeholder message now that we have the real response
            if conversation_id in conversations:
                conversations[conversation_id] = [
                    msg for msg in conversations[conversation_id] 
                    if not (msg.get("is_placeholder") and msg.get("id") == placeholder_msg_id)
                ]
            
            # Update progress after receiving Claude's response
            await update_progress(
                conversation_id,
                "processing_response",
                "processing_claude_response",
                "Processing Claude's response...",
                75
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
            await update_progress(
                conversation_id,
                "error",
                "api_call_error",
                f"Error from Claude API: {str(e)}",
                0
            )
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
            
            # Update progress based on whether there are new tool calls
            if not new_tool_calls:
                # No more tool calls - conversation is complete
                await update_progress(
                    conversation_id,
                    "completed",
                    "conversation_complete",
                    "Conversation complete",
                    100
                )
            else:
                # More tool calls to process
                await update_progress(
                    conversation_id,
                    "preparing_tool_execution",
                    "new_tool_calls",
                    f"Preparing to execute {len(new_tool_calls)} new tool{'s' if len(new_tool_calls) > 1 else ''}...",
                    80
                )
                    
            # If there are new tool calls and automatic execution is enabled, recursively process
            if auto_execute_tools and new_tool_calls:
                # Increment the counter for this conversation and check for limit
                current_count = increment_auto_execute_count(conversation_id)
                logger.info(f"Found {len(new_tool_calls)} new tool calls, auto-execution count: {current_count}")
                
                # Check if we've reached the limit (10 calls)
                if current_count > 10:
                    logger.info(f"Auto-execution limit reached for conversation {conversation_id}")
                    
                    # Add message to conversation to ask user if they want to continue
                    add_message_to_conversation(
                        conversation_id,
                        {
                            "role": "system",
                            "content": [{"type": "text", "text": "Automatic tool execution limit (10) reached. Please confirm if you want to continue with automatic execution by clicking the 'Continue' button."}]
                        }
                    )
                    
                    # Change status to paused
                    await update_progress(
                        conversation_id,
                        "paused",
                        "auto_execution_limit",
                        "Auto-execution limit reached. Waiting for user to continue...",
                        90
                    )
                else:
                    # Continue with automatic execution
                    logger.info(f"Auto-execution count {current_count} is below limit, continuing processing")
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
            await update_progress(
                conversation_id,
                "error",
                "processing_response_error",
                f"Error processing Claude response: {str(e)}",
                0
            )
            
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
        # Update progress with error information
        from ..services.conversation import update_progress
        await update_progress(
            conversation_id,
            "error",
            "execution_error",
            f"Error: {str(e)}",
            0
        )
    finally:
        # Clean up state after task completion if not already marked with a specific status
        if conversation_id in auto_execute_tasks and auto_execute_tasks[conversation_id] not in ["cancelled", "error", "paused", "completed"]:
            from ..services.conversation import update_progress
            await update_progress(
                conversation_id,
                "completed",
                "execution_complete",
                "Execution complete",
                100
            ) 