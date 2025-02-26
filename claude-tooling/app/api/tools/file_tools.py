import os
import logging
from typing import Dict, Any, Optional, Union

logger = logging.getLogger(__name__)

def save_file(file_path: str, content: str) -> Dict[str, Any]:
    """
    Save content to a file. Creates directories in the path if they don't exist.
    
    Args:
        file_path: Path where the file should be saved
        content: Content to write to the file
        
    Returns:
        Dict with status and message
    """
    try:
        # Ensure file_path is not empty
        if not file_path:
            logger.error("Empty file path provided")
            return {
                "status": "error",
                "message": "Empty file path provided",
            }
            
        # Make sure directory exists
        directory = os.path.dirname(file_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            logger.info(f"Created directory: {directory}")
            
        # Write the file
        with open(file_path, 'w') as f:
            f.write(content)
            
        logger.info(f"File saved successfully to {file_path}")
        return {
            "status": "success",
            "message": f"File saved successfully to {file_path}",
            "file_path": file_path
        }
    except Exception as e:
        error_msg = f"Error saving file: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
        }
    
def read_file(file_path: str) -> Dict[str, Any]:
    """
    Read content from a file.
    
    Args:
        file_path: Path to the file to read
        
    Returns:
        Dict with status, message and content if successful
    """
    try:
        # Ensure file_path is not empty
        if not file_path:
            logger.error("Empty file path provided")
            return {
                "status": "error",
                "message": "Empty file path provided",
            }
            
        # Check if file exists
        if not os.path.exists(file_path):
            error_msg = f"File not found: {file_path}"
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
            }
            
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
            
        logger.info(f"File read successfully from {file_path}")
        return {
            "status": "success",
            "message": f"File read successfully from {file_path}",
            "content": content,
            "file_path": file_path
        }
    except Exception as e:
        error_msg = f"Error reading file: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
        } 