"""
File handling services for conversations.
"""

import os
import logging
import mimetypes
from pathlib import Path
from typing import Dict, List, Any

from ..services.conversation import get_root_dir

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def get_file_path(conversation_id: str, file_path: str) -> str:
    """
    Get the full path to a file in a conversation directory.
    
    Args:
        conversation_id: The conversation ID
        file_path: Path to the file within the conversation directory
        
    Returns:
        The full path to the file
    """
    root_dir = get_root_dir(conversation_id)
    if not root_dir:
        logger.error(f"Root directory not found for conversation: {conversation_id}")
        return None
    
    return os.path.join(root_dir, file_path)

def get_file_content_type(file_path: str) -> str:
    """
    Determine the content type for a file based on its extension.
    
    Args:
        file_path: Path to the file
        
    Returns:
        The content type for the file
    """
    file_extension = os.path.splitext(file_path)[1].lower()
    content_type, _ = mimetypes.guess_type(file_path)
    
    # Use explicit content types for common file types to ensure proper handling
    if file_extension == '.md':
        content_type = 'text/markdown'
    elif file_extension == '.png':
        content_type = 'image/png'
    elif file_extension in ['.jpg', '.jpeg']:
        content_type = 'image/jpeg'
    elif file_extension == '.html':
        content_type = 'text/html'
    
    return content_type

def list_files(conversation_id: str) -> List[Dict[str, Any]]:
    """
    List all files in a conversation directory.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        List of file information dictionaries
    """
    root_dir = get_root_dir(conversation_id)
    if not root_dir:
        logger.error(f"Root directory not found for conversation: {conversation_id}")
        return []
    
    files = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            # Skip temporary or hidden files
            if filename.startswith('.') or filename.endswith('.tmp'):
                continue
            
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir)
            
            # Determine the file type based on extension
            file_extension = os.path.splitext(filename)[1].lower()
            content_type = get_file_content_type(filename)
            
            # Get file size
            file_size = os.path.getsize(full_path)
            
            # Determine file type category
            file_type = "other"
            if content_type:
                if content_type.startswith('image/'):
                    file_type = "image"
                elif content_type.startswith('text/'):
                    file_type = "text"
                elif content_type.startswith('application/'):
                    file_type = "application"
            
            # Create file URL
            file_url = f"/api/conversation/{conversation_id}/files/{rel_path}"
            
            logger.info(f"Found file: {rel_path}, type: {file_type}, size: {file_size} bytes, content-type: {content_type}")
            
            files.append({
                "name": filename,
                "path": rel_path,
                "url": file_url,
                "size": file_size,
                "content_type": content_type,
                "type": file_type,
                "extension": file_extension,
            })
    
    return files 