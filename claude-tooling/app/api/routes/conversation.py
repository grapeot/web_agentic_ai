"""
Conversation management routes.
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException

from ..services.conversation import (
    conversations, get_conversation, get_root_dir
)
from ..services.file_service import list_files, get_file_path, get_file_content_type

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/conversation")

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
        
        # Check conversation status
        # Find the last message, if it's assistant message and no tool calls, then consider conversation completed
        status = "in_progress"
        if history and len(history) > 0:
            last_message = history[-1]
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
        
        return {
            "conversation_id": conversation_id,
            "messages": history,
            "status": status,
            "root_dir": root_dir
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