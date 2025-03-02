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
    logger.info(f"[FILE_SERVICE] Getting file path for conversation: {conversation_id}, file: {file_path}")
    root_dir = get_root_dir(conversation_id)
    if not root_dir:
        logger.error(f"[FILE_SERVICE] Root directory not found for conversation: {conversation_id}")
        return None
    
    full_path = os.path.join(root_dir, file_path)
    logger.info(f"[FILE_SERVICE] Full path resolved: {full_path}")
    
    # Check if the file exists
    file_exists = os.path.isfile(full_path)
    logger.info(f"[FILE_SERVICE] File exists: {file_exists}")
    
    return full_path

def get_file_content_type(file_path: str) -> str:
    """
    Determine the content type for a file based on its extension.
    
    Args:
        file_path: Path to the file
        
    Returns:
        The content type for the file
    """
    logger.info(f"[FILE_SERVICE] Getting content type for file: {file_path}")
    file_extension = os.path.splitext(file_path)[1].lower()
    logger.info(f"[FILE_SERVICE] File extension: {file_extension}")
    
    content_type, _ = mimetypes.guess_type(file_path)
    logger.info(f"[FILE_SERVICE] Initial content type guess: {content_type}")
    
    # Use explicit content types for common file types to ensure proper handling
    if file_extension == '.md':
        content_type = 'text/markdown'
    elif file_extension == '.png':
        content_type = 'image/png'
    elif file_extension in ['.jpg', '.jpeg']:
        content_type = 'image/jpeg'
    elif file_extension == '.html':
        content_type = 'text/html'
    
    logger.info(f"[FILE_SERVICE] Final content type: {content_type}")
    return content_type

def list_files(conversation_id: str) -> List[Dict[str, Any]]:
    """
    List all files in a conversation directory.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        List of file information dictionaries
    """
    logger.info(f"[FILE_SERVICE] Listing files for conversation: {conversation_id}")
    
    root_dir = get_root_dir(conversation_id)
    if not root_dir:
        logger.error(f"[FILE_SERVICE] Root directory not found for conversation: {conversation_id}")
        return []
    
    logger.info(f"[FILE_SERVICE] Found root directory: {root_dir}")
    
    files = []
    try:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            logger.info(f"[FILE_SERVICE] Scanning directory: {dirpath}, found {len(filenames)} files")
            
            for filename in filenames:
                # Skip temporary or hidden files
                if filename.startswith('.') or filename.endswith('.tmp'):
                    logger.debug(f"[FILE_SERVICE] Skipping hidden/temp file: {filename}")
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
                        logger.info(f"[FILE_SERVICE] Found image file: {rel_path}, size: {file_size}")
                    elif content_type.startswith('text/'):
                        file_type = "text"
                    elif content_type.startswith('application/'):
                        file_type = "application"
                
                # Create file URL
                file_url = f"/api/conversation/{conversation_id}/files/{rel_path}"
                
                # Check if file is readable
                is_readable = os.access(full_path, os.R_OK)
                logger.info(f"[FILE_SERVICE] File: {rel_path}, readable: {is_readable}")
                
                # For image files, check if they're valid
                if file_type == "image" and file_size > 0:
                    logger.info(f"[FILE_SERVICE] Processing image file: {rel_path}")
                    # Additional image-specific information could be added here
                
                logger.info(f"[FILE_SERVICE] Adding file to list: {rel_path}, type: {file_type}, size: {file_size} bytes, content-type: {content_type}")
                
                file_info = {
                    "name": filename,
                    "path": rel_path,
                    "url": file_url,
                    "file_url": file_url,  # Add file_url as an alternative to url
                    "size": file_size,
                    "content_type": content_type,
                    "type": file_type,
                    "extension": file_extension,
                }
                
                # For markdown-generated images, add additional fields
                if file_type == "image" and ("generated" in rel_path.lower() or "plot" in rel_path.lower()):
                    logger.info(f"[FILE_SERVICE] Adding markdown_render flag for image: {rel_path}")
                    file_info["markdown_render"] = True
                    file_info["render_type"] = "image"
                
                files.append(file_info)
        
        logger.info(f"[FILE_SERVICE] Total files found: {len(files)}")
    except Exception as e:
        logger.error(f"[FILE_SERVICE] Error listing files: {str(e)}")
        import traceback
        logger.error(f"[FILE_SERVICE] Traceback: {traceback.format_exc()}")
    
    return files 