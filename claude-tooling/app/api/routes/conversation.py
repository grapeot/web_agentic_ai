"""
Conversation management routes.
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..services.conversation import (
    conversations, get_conversation, get_root_dir,
    set_task_status, get_task_status, reset_auto_execute_count,
    add_message_to_conversation
)
from ..services.file_service import list_files, get_file_path, get_file_content_type
from ..services.tool_execution import process_tool_calls_and_continue

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/conversation")

# Anthropic client - will be set from app.py
client = None

def set_anthropic_client(anthropic_client):
    """Set the Anthropic client for this module"""
    global client
    client = anthropic_client
    logger.info("Anthropic client set in conversation router")

@router.get("/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str):
    """
    Get message history for a specific conversation.
    Used for front-end polling to get results of automatic tool execution and new assistant responses.
    """
    logger.info(f"Getting messages for conversation {conversation_id}")
    
    if conversation_id not in conversations:
        logger.warning(f"Conversation not found: {conversation_id}")
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    try:
        # Get conversation history
        history = get_conversation(conversation_id)
        
        # Get detailed progress information
        from ..services.conversation import get_request_progress
        progress_info = await get_request_progress(conversation_id)
        
        # Check conversation status from auto_execute_tasks first
        task_status = get_task_status(conversation_id)
        
        if task_status == "paused":
            # Tool execution is paused (hit the limit)
            status = "paused"
        elif task_status in ["waiting_for_claude", "executing_tool", "running"]:
            # We have a more detailed status from progress tracking
            status = task_status
        else:
            # Check messages to determine status
            # Find the last real message (excluding placeholders and status messages)
            status = "in_progress"
            real_messages = [m for m in history if not m.get("is_placeholder") and not m.get("is_status")]
            
            if real_messages and len(real_messages) > 0:
                last_message = real_messages[-1]
                if last_message["role"] == "assistant":
                    # Check if there are tool calls
                    has_tool_call = False
                    for item in last_message["content"]:
                        if isinstance(item, dict) and item.get("type") == "tool_use":
                            has_tool_call = True
                            break
                    
                    if not has_tool_call:
                        status = "completed"
        
        # Get the conversation root directory if available
        root_dir = get_root_dir(conversation_id)
        
        # Filter out placeholder and temporary messages for UI display
        display_history = history
        if any(msg.get("is_placeholder") or msg.get("is_temporary") for msg in history):
            display_history = [msg for msg in history if not msg.get("is_placeholder") and not msg.get("is_temporary")]
        
        return {
            "conversation_id": conversation_id,
            "messages": display_history,
            "status": status,
            "root_dir": root_dir,
            "progress": progress_info
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{conversation_id}/root")
async def get_conversation_root(conversation_id: str):
    """
    Get the root directory for a specific conversation.
    """
    try:
        logger.info(f"Getting root directory for conversation {conversation_id}")
        
        if not get_root_dir(conversation_id):
            raise HTTPException(status_code=404, detail="Conversation root directory not found")
        
        root_dir = get_root_dir(conversation_id)
        
        return {
            "conversation_id": conversation_id,
            "root_dir": root_dir
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation root directory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{conversation_id}/files")
async def list_conversation_files(conversation_id: str):
    """
    List files in a conversation directory
    
    Args:
        conversation_id: Conversation ID
    """
    try:
        logger.info(f"[FILE LISTING] Request to list files for conversation: {conversation_id}")
        
        # Check if we have a root directory for this conversation
        if not get_root_dir(conversation_id):
            logger.error(f"[FILE LISTING] Root directory not found for conversation: {conversation_id}")
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        files = list_files(conversation_id)
        logger.info(f"[FILE LISTING] Found {len(files)} files in conversation {conversation_id}")
        return {"files": files}
        
    except Exception as e:
        logger.error(f"[FILE LISTING] Error listing files: {str(e)}")
        import traceback
        logger.error(f"[FILE LISTING] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")
        
@router.post("/{conversation_id}/resume")
async def resume_auto_execution(
    conversation_id: str,
    background_tasks: BackgroundTasks,
    max_tokens: int = 4096,
    thinking_mode: bool = True,
    thinking_budget_tokens: int = 2000
):
    """
    Resume automatic tool execution after reaching the limit.
    """
    try:
        logger.info(f"Received resume automatic execution request, conversation ID: {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get the current status
        status = get_task_status(conversation_id)
        if status != "paused":
            raise HTTPException(status_code=400, detail=f"Cannot resume execution, status is {status}")
        
        # Update progress status
        from ..services.conversation import update_progress
        await update_progress(
            conversation_id,
            "resuming",
            "resuming_execution",
            "Resuming automatic tool execution...",
            85
        )
        
        # Reset the counter and set status back to running
        reset_auto_execute_count(conversation_id)
        
        # Add system message to conversation history
        from ..services.conversation import add_message_to_conversation as add_msg
        add_msg(
            conversation_id,
            {
                "role": "system", 
                "content": [{"type": "text", "text": "Automatic tool execution resumed by user"}]
            }
        )
        
        # Get the tool calls from the last assistant message
        history = get_conversation(conversation_id)
        recent_messages = [m for m in history if m["role"] == "assistant"]
        
        if not recent_messages:
            raise HTTPException(status_code=400, detail="No assistant messages found")
        
        last_assistant_message = recent_messages[-1]
        content = last_assistant_message.get("content", [])
        
        tool_calls = []
        for item in content:
            if isinstance(item, dict) and item.get('type') == 'tool_use':
                tool_calls.append({
                    "id": item.get('id'),
                    "name": item.get('name'),
                    "input": item.get('input', {})
                })
        
        if not tool_calls:
            raise HTTPException(status_code=400, detail="No tool calls found in last assistant message")
        
        # Start a background task to continue processing the tool calls
        background_tasks.add_task(
            process_tool_calls_and_continue, 
            tool_calls, 
            conversation_id, 
            max_tokens, 
            thinking_mode, 
            thinking_budget_tokens,
            True,  # auto_execute_tools
            client
        )
        
        return {"status": "success", "message": "Automatic tool execution resumed"}
        
    except Exception as e:
        logger.error(f"Error resuming automatic execution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/{conversation_id}/cancel")
async def cancel_auto_execution(conversation_id: str):
    """
    Cancel ongoing automatic tool execution.
    Allows user to interrupt long-running automatic tool execution process.
    """
    try:
        logger.info(f"Received cancel automatic execution request, conversation ID: {conversation_id}")
        
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
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