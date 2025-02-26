import json
import logging
import os
import mimetypes
import sys
from typing import List, Dict, Any, Callable, Optional, Union
from .file_tools import save_file, read_file
from .command_tools import run_command, install_python_package
from .web_tools import search, extract_content

# Add the app directory to the Python path to allow importing from api
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if app_dir not in sys.path:
    sys.path.append(app_dir)

logger = logging.getLogger(__name__)

# Dictionary to store conversation root directories
CONVERSATION_ROOT_DIRS = {}

def set_conversation_root_dir(conversation_id: str, root_dir: str):
    """
    Set the root directory for a specific conversation.
    
    Args:
        conversation_id: The conversation ID
        root_dir: The root directory path
    """
    CONVERSATION_ROOT_DIRS[conversation_id] = root_dir
    logger.info(f"Set root directory for conversation {conversation_id}: {root_dir}")

def get_conversation_root_dir(conversation_id: str) -> Optional[str]:
    """
    Get the root directory for a specific conversation.
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        The root directory path or None if not found
    """
    return CONVERSATION_ROOT_DIRS.get(conversation_id)

# Tool definitions that match the schema expected by Claude API
TOOL_DEFINITIONS = [
    {
        "name": "save_file",
        "description": "Save content to a file. Creates directories in the path if they don't exist.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path where the file should be saved"
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file"
                }
            },
            "required": ["file_path", "content"]
        }
    },
    {
        "name": "read_file",
        "description": "Read content from a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the file to read"
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "run_terminal_command",
        "description": "Run a terminal command and return the result.",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Command to execute in the terminal"
                },
                "cwd": {
                    "type": "string",
                    "description": "Current working directory for the command (optional)"
                }
            },
            "required": ["command"]
        }
    },
    {
        "name": "install_python_package",
        "description": "Install a Python package using pip.",
        "input_schema": {
            "type": "object",
            "properties": {
                "package_name": {
                    "type": "string",
                    "description": "Name of the package to install"
                },
                "upgrade": {
                    "type": "boolean",
                    "description": "Whether to upgrade the package if already installed (optional)"
                }
            },
            "required": ["package_name"]
        }
    },
    {
        "name": "web_search",
        "description": "Search the web using DuckDuckGo and return results with URLs and text snippets.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (optional, default: 10, recommended: 10 for balance of comprehensiveness and relevance)"
                },
                "max_retries": {
                    "type": "integer",
                    "description": "Maximum number of retry attempts (optional, default: 3)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "extract_web_content",
        "description": "Extract text content from web pages and return it in a readable format with hyperlinks preserved as markdown.",
        "input_schema": {
            "type": "object",
            "properties": {
                "urls": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "List of URLs to process"
                },
                "max_concurrent": {
                    "type": "integer",
                    "description": "Maximum number of concurrent browser instances (optional, default: 3)"
                }
            },
            "required": ["urls"]
        }
    }
]

# Custom wrapper for save_file to handle conversation root directory
def save_file_with_root(file_path: str, content: str, conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Save content to a file, using the conversation root directory if available.
    
    Args:
        file_path: Path where the file should be saved
        content: Content to write to the file
        conversation_id: Optional conversation ID for context
        
    Returns:
        Dictionary with result information
    """
    if conversation_id and conversation_id in CONVERSATION_ROOT_DIRS:
        root_dir = CONVERSATION_ROOT_DIRS[conversation_id]
        # If file_path is not absolute, prepend the root directory
        if not os.path.isabs(file_path):
            file_path = os.path.join(root_dir, file_path)
            logger.info(f"Using conversation root directory for save_file: {file_path}")
    
    return save_file(file_path=file_path, content=content)

# Custom wrapper for read_file to handle conversation root directory
def read_file_with_root(file_path: str, conversation_id: Optional[str] = None) -> str:
    """
    Read content from a file, using the conversation root directory if available.
    
    Args:
        file_path: Path to the file to read
        conversation_id: Optional conversation ID for context
        
    Returns:
        The file content as a string
    """
    if conversation_id and conversation_id in CONVERSATION_ROOT_DIRS:
        root_dir = CONVERSATION_ROOT_DIRS[conversation_id]
        # If file_path is not absolute, prepend the root directory
        if not os.path.isabs(file_path):
            file_path = os.path.join(root_dir, file_path)
            logger.info(f"Using conversation root directory for read_file: {file_path}")
    
    return read_file(file_path=file_path)

# Custom wrapper for run_command to handle conversation root directory
def run_command_with_root(command: str, cwd: Optional[str] = None, conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Run a terminal command, using the conversation root directory if available.
    
    Args:
        command: Command to execute
        cwd: Current working directory (optional)
        conversation_id: Optional conversation ID for context
        
    Returns:
        Dictionary with command output and status
    """
    if conversation_id and conversation_id in CONVERSATION_ROOT_DIRS and not cwd:
        cwd = CONVERSATION_ROOT_DIRS[conversation_id]
        logger.info(f"Using conversation root directory for run_command: {cwd}")
    
    return run_command(command=command, cwd=cwd)

# Mapping from tool names to actual functions
TOOL_FUNCTIONS = {
    "save_file": save_file_with_root,
    "read_file": read_file_with_root,
    "run_terminal_command": run_command_with_root,
    "install_python_package": install_python_package,
    "web_search": search,
    "extract_web_content": extract_content
}

# Add a function to enhance file save results
def post_process_save_file(result: Dict[str, Any], conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Post-process file save results, adding file rendering information.
    
    Args:
        result: The result of the file save operation
        conversation_id: Conversation ID
        
    Returns:
        Enhanced result containing file rendering information
    """
    try:
        logger.info(f"Post-processing save_file result: {json.dumps(result)}")
        # Ensure result is in dictionary format
        if isinstance(result, str):
            try:
                result = json.loads(result)
                logger.info("Converted string result to dictionary")
            except:
                logger.warning(f"Failed to parse result as JSON: {result}")
                return result
        
        # Only process successfully saved files
        if result.get("status") == "success" and "file_path" in result:
            file_path = result["file_path"]
            file_name = os.path.basename(file_path)
            logger.info(f"Processing successful file save: {file_path}")
            
            # If we have a conversation ID and root directory
            if conversation_id and conversation_id in CONVERSATION_ROOT_DIRS:
                root_dir = CONVERSATION_ROOT_DIRS[conversation_id]
                logger.info(f"Found root directory for conversation {conversation_id}: {root_dir}")
                
                # Get path relative to the conversation root directory
                rel_path = os.path.relpath(file_path, root_dir)
                logger.info(f"Relative path: {rel_path}")
                
                # Add URL for accessing the file
                file_url = f"/api/conversation/{conversation_id}/files/{rel_path}"
                result["file_url"] = file_url
                logger.info(f"Added file_url: {file_url}")
                
                # Add rendering information based on file type
                content_type, _ = mimetypes.guess_type(file_path)
                logger.info(f"Determined content type: {content_type}")
                
                # Check for file extension as backup
                file_extension = os.path.splitext(file_path)[1].lower()
                logger.info(f"File extension: {file_extension}")
                
                # Handle image files
                if content_type and content_type.startswith('image/') or file_extension in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']:
                    if not content_type:
                        # Assign content type based on extension if not detected
                        if file_extension == '.png':
                            content_type = 'image/png'
                        elif file_extension in ['.jpg', '.jpeg']:
                            content_type = 'image/jpeg'
                        elif file_extension == '.gif':
                            content_type = 'image/gif'
                        elif file_extension == '.bmp':
                            content_type = 'image/bmp'
                        logger.info(f"Assigned content type from extension: {content_type}")
                    
                    result["render_type"] = "image"
                    result["content_type"] = content_type
                    result["markdown_render"] = f"![{file_name}]({result['file_url']})"
                    logger.info(f"Enhanced result for image file: {file_path} with render_type=image")
                    
                    # Check if file exists and get size
                    if os.path.exists(file_path):
                        file_size = os.path.getsize(file_path)
                        result["file_size"] = file_size
                        logger.info(f"Added file size: {file_size} bytes")
                    
                # Handle Markdown files
                elif file_path.lower().endswith('.md'):
                    result["render_type"] = "markdown"
                    result["view_url"] = result["file_url"]
                    logger.info(f"Enhanced result for markdown file: {file_path} with render_type=markdown")
                    
                # Handle HTML files
                elif file_path.lower().endswith('.html'):
                    result["render_type"] = "html"
                    result["view_url"] = result["file_url"]
                    logger.info(f"Enhanced result for html file: {file_path} with render_type=html")
                else:
                    logger.info(f"No special rendering applied for file type: {content_type}")
                
                logger.info(f"Final enhanced result: {json.dumps(result)}")
            else:
                logger.warning(f"Missing conversation_id or root directory: {conversation_id}")
    except Exception as e:
        logger.error(f"Error post-processing file result: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # If error occurs, return the original result
        pass
    
    return result

def process_tool_calls(tool_calls: List[Dict[str, Any]], conversation_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Process a list of tool calls and return results.
    
    Args:
        tool_calls: List of tool calls to process
        conversation_id: Optional conversation ID for context
        
    Returns:
        List of tool results
    """
    tool_results = []
    
    for tool_call in tool_calls:
        try:
            tool_name = tool_call.get("name")
            tool_input = tool_call.get("input", {})
            tool_id = tool_call.get("id")
            
            logger.info(f"Processing tool call: {tool_name} with input: {json.dumps(tool_input)}")
            
            # Process file paths with conversation root directory
            if tool_name == "save_file" and "file_path" in tool_input and conversation_id:
                result = save_file_with_root(tool_input["file_path"], tool_input["content"], conversation_id)
                # Post-process the result to add rendering information
                result = post_process_save_file(result, conversation_id)
            elif tool_name == "read_file" and "file_path" in tool_input and conversation_id:
                content = read_file_with_root(tool_input["file_path"], conversation_id)
                result = {"status": "success", "content": content}
            elif tool_name == "run_terminal_command":
                command = tool_input.get("command", "")
                cwd = tool_input.get("cwd")
                result = run_command_with_root(command, cwd, conversation_id)
                
                # Post-process command result to check for generated files
                if result.get("status") == "success" and conversation_id:
                    result = post_process_command_result(result, conversation_id)
                    
            elif tool_name == "install_python_package":
                package_name = tool_input.get("package_name", "")
                upgrade = tool_input.get("upgrade", False)
                command = f"pip install {'--upgrade ' if upgrade else ''}{package_name}"
                result = run_command(command)
            elif tool_name == "web_search":
                query = tool_input.get("query", "")
                max_results = tool_input.get("max_results", 10)
                max_retries = tool_input.get("max_retries", 3)
                result = search(query, max_results, max_retries)
            elif tool_name == "extract_web_content":
                urls = tool_input.get("urls", [])
                max_concurrent = tool_input.get("max_concurrent", 3)
                result = extract_content(urls, max_concurrent)
            else:
                result = {"status": "error", "message": f"Unknown tool: {tool_name}"}
                
            # Check if we need to add the tool_use_id to the result for tool result association
            if tool_id:
                logger.info(f"Tool call complete for ID {tool_id}: {result.get('status', 'unknown')}")
                tool_results.append({
                    "tool_use_id": tool_id,
                    "content": json.dumps(result, ensure_ascii=False)
                })
            else:
                logger.warning(f"Tool call missing ID: {tool_name}")
                # Still add the result without association
                tool_results.append({
                    "tool_use_id": f"unknown_{len(tool_results)}",
                    "content": json.dumps(result, ensure_ascii=False)
                })
                
        except Exception as e:
            logger.error(f"Error processing tool call: {str(e)}")
            
            # Include the error in the tool result
            error_result = {
                "status": "error",
                "message": f"Error processing tool call: {str(e)}"
            }
            
            if "id" in tool_call:
                tool_results.append({
                    "tool_use_id": tool_call["id"],
                    "content": json.dumps(error_result, ensure_ascii=False)
                })
            else:
                tool_results.append({
                    "tool_use_id": f"error_{len(tool_results)}",
                    "content": json.dumps(error_result, ensure_ascii=False)
                })
    
    return tool_results

def post_process_command_result(result: Dict[str, Any], conversation_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Post-process command execution results to detect created files using Claude.
    
    Args:
        result: Command execution result
        conversation_id: Conversation ID
        
    Returns:
        Enhanced result with file rendering information if files were created
    """
    try:
        logger.info(f"Post-processing command result for conversation {conversation_id}")
        
        if conversation_id not in CONVERSATION_ROOT_DIRS:
            logger.warning(f"No root directory found for conversation {conversation_id}")
            return result
            
        root_dir = CONVERSATION_ROOT_DIRS[conversation_id]
        
        # Extract command and outputs
        command = result.get("command", "")
        stdout = result.get("stdout", "")
        stderr = result.get("stderr", "")
        
        # Skip if empty output
        if not stdout and not stderr:
            return result
            
        # Use Claude to detect generated files
        try:
            # Try to import the Anthropic client from app.py
            try:
                from api.app import client
            except (ImportError, AttributeError):
                # Try to create a new client if import fails
                try:
                    import anthropic
                    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
                except Exception as e:
                    logger.error(f"Failed to create Anthropic client: {str(e)}")
                    return result
            
            # Prepare the prompt for Claude
            prompt = f"""Given the following command and its output, identify any files that were generated or created. 
            
Command:
```
{command}
```

Standard Output:
```
{stdout}
```

Standard Error:
```
{stderr}
```

Please return a JSON array of the filenames that were created during this command execution. 
Only include files that were NEWLY CREATED by this command (not just referenced or read).
Return an empty array if no files were created.
Format your response as a valid JSON array of strings, e.g. ["file1.png", "path/to/file2.txt"]. 
Just return the raw JSON array with no additional text or explanation.
"""
            
            # Call Claude to analyze the command and output
            try:
                response = client.messages.create(
                    max_tokens=1024,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt,
                        }
                    ],
                    model="claude-3-7-sonnet-20250219",
                )
                
                # Extract content from response based on its structure
                claude_content = ""
                if hasattr(response, 'content'):
                    if isinstance(response.content, list) and len(response.content) > 0:
                        # Handle content blocks format (Anthropic API v2)
                        for content_block in response.content:
                            if hasattr(content_block, 'type') and content_block.type == 'text':
                                if hasattr(content_block, 'text'):
                                    claude_content = content_block.text
                                    break
                            elif isinstance(content_block, dict):
                                if content_block.get('type') == 'text' and 'text' in content_block:
                                    claude_content = content_block['text']
                                    break
                    elif isinstance(response.content, str):
                        claude_content = response.content
                # Legacy API support
                elif hasattr(response, 'completion'):
                    claude_content = response.completion
                
                # Parse the JSON array - expected to be a list of filenames
                import json
                try:
                    # Try to find a JSON array in the response
                    import re
                    json_array_match = re.search(r'\[.*\]', claude_content)
                    if json_array_match:
                        potential_json = json_array_match.group(0)
                        detected_files = json.loads(potential_json)
                    else:
                        detected_files = json.loads(claude_content)
                        
                    if not isinstance(detected_files, list):
                        detected_files = []
                except json.JSONDecodeError:
                    detected_files = []
                    
                # Process the detected files
                enhanced_files = []
                for file_name in detected_files:
                    if not isinstance(file_name, str):
                        continue
                        
                    # Try to locate this file
                    full_path = find_file_in_workspace(file_name, root_dir)
                    
                    # Skip if file not found
                    if not full_path:
                        continue
                        
                    file_info = create_file_info(full_path, root_dir, conversation_id)
                    enhanced_files.append(file_info)
                    
                # Add found files to the result
                if enhanced_files:
                    result["generated_files"] = enhanced_files
                    
                    # If we found exactly one image file, add its rendering information directly to the result
                    # This helps with backward compatibility with the frontend
                    image_files = [f for f in enhanced_files if f.get("render_type") == "image"]
                    if len(image_files) == 1:
                        image_file = image_files[0]
                        result["file_path"] = image_file["file_path"]
                        result["file_url"] = image_file["file_url"]
                        result["render_type"] = "image"
                        result["content_type"] = image_file["content_type"]
                        result["markdown_render"] = image_file["markdown_render"]
                        
                    logger.info(f"Added {len(enhanced_files)} generated files to result")
                
            except Exception as e:
                logger.error(f"Error calling Claude API: {str(e)}")
                return result
                
        except Exception as e:
            logger.error(f"Error using Claude for file detection: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error post-processing command result: {str(e)}")
        
    return result

def find_file_in_workspace(file_name: str, root_dir: str) -> Optional[str]:
    """
    Try to find a file in the workspace.
    
    Args:
        file_name: Name of the file to find
        root_dir: Root directory to search in
        
    Returns:
        Full path to the file if found, None otherwise
    """
    # Try in the cwd first, but also search in subdirectories
    for root, dirs, files in os.walk(root_dir):
        if file_name in files:
            return os.path.join(root, file_name)
            
    # If the path contains directories, handle that too
    if os.path.dirname(file_name):
        candidate_path = os.path.join(root_dir, file_name)
        if os.path.exists(candidate_path):
            return candidate_path
    
    # If it still hasn't been found, try just the base filename
    base_name = os.path.basename(file_name)
    for root, dirs, files in os.walk(root_dir):
        if base_name in files:
            return os.path.join(root, base_name)
    
    return None

def create_file_info(full_path: str, root_dir: str, conversation_id: str) -> Dict[str, Any]:
    """
    Create file information dictionary for a file.
    
    Args:
        full_path: Full path to the file
        root_dir: Root directory
        conversation_id: Conversation ID
        
    Returns:
        Dictionary with file information
    """
    file_size = os.path.getsize(full_path)
    rel_path = os.path.relpath(full_path, root_dir)
    file_url = f"/api/conversation/{conversation_id}/files/{rel_path}"
    
    # Get content type
    content_type, _ = mimetypes.guess_type(full_path)
    file_extension = os.path.splitext(full_path)[1].lower()
    
    # Add specific content types for common file extensions
    if not content_type:
        if file_extension == '.png':
            content_type = 'image/png'
        elif file_extension in ['.jpg', '.jpeg']:
            content_type = 'image/jpeg'
        elif file_extension == '.gif':
            content_type = 'image/gif'
        elif file_extension == '.md':
            content_type = 'text/markdown'
        elif file_extension == '.html':
            content_type = 'text/html'
    
    # Create file info
    file_info = {
        "file_path": full_path,
        "file_name": os.path.basename(full_path),
        "relative_path": rel_path,
        "file_url": file_url,
        "file_size": file_size,
        "content_type": content_type
    }
    
    # Add render type based on file type
    if content_type and content_type.startswith('image/') or file_extension in ['.png', '.jpg', '.jpeg', '.gif']:
        file_info["render_type"] = "image"
        file_info["markdown_render"] = f"![{os.path.basename(full_path)}]({file_url})"
    elif file_extension == '.md':
        file_info["render_type"] = "markdown"
        file_info["view_url"] = file_url
    elif file_extension == '.html':
        file_info["render_type"] = "html"
        file_info["view_url"] = file_url
        
    return file_info

def format_tool_results_for_claude(tool_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format tool results for Claude's API format.
    
    Args:
        tool_results: List of tool results
        
    Returns:
        List of content blocks formatted for Claude API
    """
    formatted_results = []
    
    for result in tool_results:
        try:
            logger.info(f"Formatting tool result: {json.dumps(result)}")
            tool_use_id = result.get("tool_use_id")
            content = result.get("content")
            
            if tool_use_id and content:
                formatted_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use_id,
                    "content": content
                })
                logger.info(f"Successfully formatted tool result for tool_use_id: {tool_use_id}")
                # Add a debug log of the first few characters of content to verify formatting
                if isinstance(content, str) and len(content) > 0:
                    preview = content[:100] + "..." if len(content) > 100 else content
                    logger.info(f"Tool result content preview: {preview}")
            else:
                logger.warning(f"Invalid tool result format - missing tool_use_id or content: {result}")
        except Exception as e:
            logger.error(f"Error formatting tool result: {str(e)}")
    
    logger.info(f"Formatted {len(formatted_results)} tool results for Claude")
    return formatted_results 