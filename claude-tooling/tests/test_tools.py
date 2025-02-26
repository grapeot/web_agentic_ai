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
import asyncio
from unittest.mock import patch

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
from app.api.tools.file_tools import save_file, read_file
from app.api.tools.command_tools import run_command, install_python_package
from app.api.tools.web_tools import search, extract_content
from app.api.tools.tool_wrapper import process_tool_calls, format_tool_results_for_claude, TOOL_DEFINITIONS

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

def test_web_search():
    """Test the web search functionality with a mocked response."""
    logger.info("Testing web search function...")
    
    try:
        # Use a simple query that should work with mocked response
        query = "test query"
        
        # Patch the search function to avoid actual network calls
        with patch('app.api.tools.web_tools.search_with_retry') as mock_search:
            # Set up mock return value
            mock_results = [
                {
                    "href": "https://example.com/result1",
                    "title": "Test Result 1",
                    "body": "This is a test search result."
                }
            ]
            
            # Configure the mock to return the results directly (not as a Future)
            mock_search.return_value = mock_results
            
            # Run the search function
            result = search(query)
            
            if result["status"] == "success" and "results" in result:
                logger.info("web_search test passed!")
            else:
                logger.error(f"web_search test failed: {result}")
                
            return result
    except Exception as e:
        logger.error(f"web_search test failed with exception: {str(e)}")
        return {
            "status": "error",
            "message": f"Exception: {str(e)}"
        }

def test_extract_content():
    """Test the web content extraction functionality with a mocked response."""
    logger.info("Testing web content extraction function...")
    
    try:
        # Use a simple URL for testing
        urls = ["https://example.com"]
        
        # Patch the extract function to avoid actual network calls
        with patch('app.api.tools.web_tools.process_urls') as mock_process:
            # Set up mock return value
            mock_results = [
                {
                    "url": "https://example.com",
                    "status": "success",
                    "content": "This is extracted content from the test page."
                }
            ]
            
            # Configure the mock to return the results directly (not as a Future)
            mock_process.return_value = mock_results
            
            # Run the extract function
            result = extract_content(urls)
            
            if result["status"] == "success" and "results" in result:
                logger.info("extract_content test passed!")
            else:
                logger.error(f"extract_content test failed: {result}")
                
            return result
    except Exception as e:
        logger.error(f"extract_content test failed with exception: {str(e)}")
        return {
            "status": "error",
            "message": f"Exception: {str(e)}"
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
        "tool_wrapper": test_tool_wrapper(),
        "web_search": test_web_search(),
        "extract_content": test_extract_content()
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