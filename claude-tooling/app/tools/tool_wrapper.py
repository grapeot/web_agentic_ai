import json
import logging
from typing import List, Dict, Any, Callable, Optional, Union
from .file_tools import save_file, read_file
from .command_tools import run_command, install_python_package
from .web_tools import search, extract_content

logger = logging.getLogger(__name__)

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
                    "description": "Maximum number of results to return (optional, default: 10)"
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

# Mapping from tool names to actual functions
TOOL_FUNCTIONS = {
    "save_file": save_file,
    "read_file": read_file,
    "run_terminal_command": run_command,
    "install_python_package": install_python_package,
    "web_search": search,
    "extract_web_content": extract_content
}

def process_tool_calls(tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Process tool calls from Claude and execute them.
    
    Args:
        tool_calls: List of tool call objects from Claude
        
    Returns:
        List of tool result objects in the format expected by Claude
    """
    tool_results = []
    
    for tool_call in tool_calls:
        tool_name = tool_call.get("name")
        tool_input = tool_call.get("input", {})
        tool_id = tool_call.get("id")
        
        logger.info(f"Processing tool call: {tool_name} with input: {tool_input}")
        
        result = None
        
        # Check if the tool exists
        if tool_name in TOOL_FUNCTIONS:
            try:
                # Call the appropriate function
                function = TOOL_FUNCTIONS[tool_name]
                result = function(**tool_input)
            except Exception as e:
                logger.error(f"Error executing tool {tool_name}: {str(e)}")
                result = {
                    "status": "error",
                    "message": f"Error executing tool {tool_name}: {str(e)}"
                }
        else:
            logger.error(f"Unknown tool: {tool_name}")
            result = {
                "status": "error",
                "message": f"Unknown tool: {tool_name}"
            }
        
        # Convert result to JSON string if it's not already a string
        result_str = result if isinstance(result, str) else json.dumps(result)
        logger.info(f"Tool call result: {result}")
        
        # Format the result as expected by Claude
        tool_results.append({
            "tool_use_id": tool_id,
            "content": result_str
        })
    
    return tool_results

def format_tool_results_for_claude(tool_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format tool results as content blocks in a user message for Claude.
    
    Args:
        tool_results: List of tool result objects
        
    Returns:
        List of content blocks in the format expected by Claude
    """
    tool_result_blocks = []
    for result in tool_results:
        tool_result_blocks.append({
            "type": "tool_result",
            "tool_use_id": result["tool_use_id"],
            "content": result["content"]
        })
    
    return tool_result_blocks 