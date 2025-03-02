"""
File handling routes for conversation files.
"""

import os
import logging
import mimetypes
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..services.conversation import get_root_dir
from ..services.file_service import get_file_path, get_file_content_type

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/conversation")

@router.get("/{conversation_id}/files/{file_path:path}")
async def serve_conversation_file(conversation_id: str, file_path: str):
    """
    Serve a file from a conversation directory
    
    Args:
        conversation_id: Conversation ID
        file_path: Path to the file within the conversation directory
    """
    try:
        logger.info(f"[FILE SERVING] Request to serve file: {file_path} for conversation: {conversation_id}")
        
        # Check if we have a root directory for this conversation
        if not get_root_dir(conversation_id):
            logger.error(f"[FILE SERVING] Root directory not found for conversation: {conversation_id}")
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        root_dir = get_root_dir(conversation_id)
        logger.info(f"[FILE SERVING] Found root directory: {root_dir}")
        
        # Resolve the full file path
        full_path = get_file_path(conversation_id, file_path)
        logger.info(f"[FILE SERVING] Resolved full file path: {full_path}")
        
        # Check if the file exists
        if not os.path.isfile(full_path):
            logger.error(f"[FILE SERVING] File not found: {full_path}")
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get file size for logging
        file_size = os.path.getsize(full_path)
        logger.info(f"[FILE SERVING] File size: {file_size} bytes")
        
        # Check file permissions
        file_permissions = os.stat(full_path).st_mode
        logger.info(f"[FILE SERVING] File permissions: {file_permissions:o}")
        
        # Determine content type based on file extension
        content_type = get_file_content_type(file_path)
        logger.info(f"[FILE SERVING] Determined content type: {content_type}")
        
        # For image files, provide additional information
        if content_type and content_type.startswith('image/'):
            logger.info(f"[FILE SERVING] Serving image file: {file_path}")
            try:
                # Check if we can read the first bytes of the file
                with open(full_path, 'rb') as f:
                    first_bytes = f.read(16)
                logger.info(f"[FILE SERVING] First bytes of image: {first_bytes.hex()}")
            except Exception as e:
                logger.warning(f"[FILE SERVING] Unable to read first bytes of image: {str(e)}")
        
        # Add additional headers for debugging
        headers = {
            "X-File-Path": file_path,
            "X-File-Size": str(file_size),
            "X-Content-Type": content_type or "unknown",
            "X-Debug-Full-Path": full_path,
        }
        
        # Ensure Cache-Control headers for proper browser caching
        if content_type and content_type.startswith('image/'):
            headers["Cache-Control"] = "public, max-age=3600"
            logger.info("[FILE SERVING] Added cache headers for image file")
        
        logger.info(f"[FILE SERVING] Serving file with headers: {headers}")
        
        # Return the file as a response
        logger.info(f"[FILE SERVING] Successfully preparing FileResponse for: {file_path}")
        
        # Create the response 
        response = FileResponse(
            path=full_path, 
            filename=os.path.basename(file_path),
            media_type=content_type,
            headers=headers
        )
        
        logger.info("[FILE SERVING] FileResponse created successfully")
        return response
    except Exception as e:
        logger.error(f"[FILE SERVING] Error serving file: {str(e)}")
        import traceback
        logger.error(f"[FILE SERVING] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error serving file: {str(e)}") 