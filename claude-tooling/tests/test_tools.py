#!/usr/bin/env python3
"""
Test script for tool modules.
This script tests each tool function to ensure they work correctly.
"""

import os
import sys
import json
import logging
from typing import Dict, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
# Updated path to point to claude-tooling directory (parent of tests)
parent_dir = os.path.dirname(current_dir)  
app_dir = os.path.join(parent_dir, "app")
if app_dir not in sys.path:
    sys.path.append(app_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the tools
from app.tools.file_tools import save_file, read_file
from app.tools.command_tools import run_command, install_python_package
from app.tools.tool_wrapper import process_tool_calls, format_tool_results_for_claude, TOOL_DEFINITIONS

def test_save_file():
    """Test the save_file function."""
    logger.info("Testing save_file function...")
    
    # Create a test file
    test_file = "test_output/test_file.txt"
    test_content = "This is a test file content."
    
    result = save_file(test_file, test_content)
    
    if result["status"] == "success":
        logger.info("save_file test passed!")
    else:
        logger.error(f"save_file test failed: {result}")
    
    return result

def test_read_file():
    """Test the read_file function."""
    logger.info("Testing read_file function...")
    
    # First create a test file
    test_file = "test_output/test_file.txt"
    test_content = "This is a test file content for reading."
    
    save_file(test_file, test_content)
    
    # Now read it back
    result = read_file(test_file)
    
    if result["status"] == "success" and result["content"] == test_content:
        logger.info("read_file test passed!")
    else:
        logger.error(f"read_file test failed: {result}")
    
    return result

def test_run_command():
    """Test the run_command function."""
    logger.info("Testing run_command function...")
    
    # Simple echo command
    result = run_command("echo 'Hello, World!'")
    
    if result["status"] == "success" and "Hello, World!" in result["stdout"]:
        logger.info("run_command test passed!")
    else:
        logger.error(f"run_command test failed: {result}")
    
    return result

def test_tool_wrapper():
    """Test the tool wrapper functionality."""
    logger.info("Testing tool wrapper functionality...")
    
    # Create a mock tool call
    mock_tool_calls = [
        {
            "id": "test_tool_id_123",
            "name": "save_file",
            "input": {
                "file_path": "test_output/wrapper_test.txt",
                "content": "This file was created through the tool wrapper."
            }
        }
    ]
    
    # Process the tool call
    tool_results = process_tool_calls(mock_tool_calls)
    
    # Format for Claude
    claude_format = format_tool_results_for_claude(tool_results)
    
    if len(tool_results) == 1 and len(claude_format) == 1:
        logger.info("tool_wrapper test passed!")
    else:
        logger.error(f"tool_wrapper test failed: {tool_results}")
    
    return {
        "tool_results": tool_results,
        "claude_format": claude_format
    }

def run_all_tests():
    """Run all tests and report results."""
    logger.info("Starting tool module tests...")
    
    # Create test output directory if it doesn't exist
    os.makedirs("test_output", exist_ok=True)
    
    # Run all tests
    results = {
        "save_file": test_save_file(),
        "read_file": test_read_file(),
        "run_command": test_run_command(),
        "tool_wrapper": test_tool_wrapper()
    }
    
    # Print summary
    logger.info("Test results summary:")
    for test_name, result in results.items():
        if isinstance(result, dict) and result.get("status") == "success":
            logger.info(f"✅ {test_name}: PASSED")
        elif isinstance(result, dict) and "tool_results" in result:
            # Special case for tool_wrapper which returns a compound result
            if len(result["tool_results"]) > 0:
                logger.info(f"✅ {test_name}: PASSED")
            else:
                logger.info(f"❌ {test_name}: FAILED")
        else:
            logger.info(f"❌ {test_name}: FAILED")
    
    return results

if __name__ == "__main__":
    results = run_all_tests() 