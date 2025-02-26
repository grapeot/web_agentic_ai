"""
Conversation management services.
"""

import os
import datetime
import logging
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global state for conversations
conversations = {}
conversation_root_dirs = {}
auto_execute_tasks = {}

def create_conversation_root_dir(conversation_id: str) -> str:
    """
    Create a directory for a conversation based on timestamp.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        The path to the created directory
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    root_dir = os.path.join("runs", timestamp)
    
    # Create the directory if it doesn't exist
    os.makedirs(root_dir, exist_ok=True)
    
    # Store the root directory for this conversation
    conversation_root_dirs[conversation_id] = root_dir
    
    logger.info(f"Created root directory for conversation {conversation_id}: {root_dir}")
    
    # Import here to avoid circular imports
    from ...api.tools.tool_wrapper import set_conversation_root_dir
    
    # Update the tool wrapper with the conversation root directory
    set_conversation_root_dir(conversation_id, root_dir)
    
    return root_dir

def get_conversation(conversation_id: str) -> List[Dict[str, Any]]:
    """
    Get a conversation by ID.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        The conversation history or an empty list if not found
    """
    return conversations.get(conversation_id, [])

def get_root_dir(conversation_id: str) -> Optional[str]:
    """
    Get the root directory for a conversation.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        The root directory or None if not found
    """
    return conversation_root_dirs.get(conversation_id)

def add_message_to_conversation(conversation_id: str, message: Dict[str, Any]) -> None:
    """
    Add a message to a conversation.
    
    Args:
        conversation_id: The conversation ID
        message: The message to add
    """
    if conversation_id not in conversations:
        conversations[conversation_id] = []
    
    conversations[conversation_id].append(message)

def get_task_status(conversation_id: str) -> str:
    """
    Get the status of an automatic tool execution task.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        The task status or None if not found
    """
    return auto_execute_tasks.get(conversation_id)

def set_task_status(conversation_id: str, status: str) -> None:
    """
    Set the status of an automatic tool execution task.
    
    Args:
        conversation_id: The conversation ID
        status: The task status
    """
    auto_execute_tasks[conversation_id] = status 