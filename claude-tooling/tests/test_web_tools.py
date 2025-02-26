#!/usr/bin/env python3
"""
Test script for web tool modules.
This script tests the web search and content extraction tools.
"""

import os
import sys
import json
import logging
import asyncio
import unittest
from unittest.mock import patch, MagicMock
from typing import Dict, Any, List

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
app_dir = os.path.join(parent_dir, "app")
if app_dir not in sys.path:
    sys.path.append(app_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the tools
from app.tools.web_tools import (
    search, extract_content, 
    web_search, search_with_retry, format_search_results, 
    extract_web_content, validate_url, parse_html
)


# Mock data for testing
MOCK_SEARCH_RESULTS = [
    {
        "href": "https://example.com/page1",
        "title": "Example Page 1",
        "body": "This is the first example search result."
    },
    {
        "href": "https://example.com/page2",
        "title": "Example Page 2",
        "body": "This is the second example search result."
    }
]

MOCK_HTML_CONTENT = """
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Test Heading</h1>
    <p>This is a paragraph of text.</p>
    <a href="https://example.com">Example Link</a>
    <script>
        console.log("This should be skipped");
    </script>
    <style>
        body { color: black; }
    </style>
</body>
</html>
"""

# Tests for web search functionality
class TestWebSearch(unittest.TestCase):
    """Tests for the web search functionality."""
    
    @patch('app.tools.web_tools.DDGS')
    async def test_search_with_retry_success(self, mock_ddgs):
        """Test successful search with retry."""
        # Setup the mock
        mock_instance = MagicMock()
        mock_instance.__enter__.return_value.text.return_value = MOCK_SEARCH_RESULTS
        mock_ddgs.return_value = mock_instance
        
        # Call the function
        results = await search_with_retry("test query")
        
        # Assertions
        self.assertEqual(results, MOCK_SEARCH_RESULTS)
        mock_instance.__enter__.return_value.text.assert_called_once()
    
    @patch('app.tools.web_tools.DDGS')
    async def test_search_with_retry_no_results(self, mock_ddgs):
        """Test search with no results."""
        # Setup the mock
        mock_instance = MagicMock()
        mock_instance.__enter__.return_value.text.return_value = []
        mock_ddgs.return_value = mock_instance
        
        # Call the function
        results = await search_with_retry("test query")
        
        # Assertions
        self.assertEqual(results, [])
    
    @patch('app.tools.web_tools.DDGS')
    async def test_search_with_retry_error(self, mock_ddgs):
        """Test search with error and retry."""
        # Setup the mock to raise an exception on first call, then succeed
        mock_instance_fail = MagicMock()
        mock_instance_fail.__enter__.return_value.text.side_effect = Exception("Test error")
        
        mock_instance_success = MagicMock()
        mock_instance_success.__enter__.return_value.text.return_value = MOCK_SEARCH_RESULTS
        
        mock_ddgs.side_effect = [mock_instance_fail, mock_instance_success]
        
        # Call the function with retry
        with patch('app.tools.web_tools.asyncio.sleep', return_value=None) as mock_sleep:
            results = await search_with_retry("test query", max_retries=2)
            
            # Assertions
            self.assertEqual(results, MOCK_SEARCH_RESULTS)
            mock_sleep.assert_called_once()
    
    def test_format_search_results(self):
        """Test formatting search results."""
        formatted = format_search_results(MOCK_SEARCH_RESULTS)
        
        # Check if it contains expected strings
        self.assertIn("Result 1", formatted)
        self.assertIn("Example Page 1", formatted)
        self.assertIn("https://example.com/page1", formatted)
        self.assertIn("This is the first example search result.", formatted)
    
    @patch('app.tools.web_tools.search_with_retry')
    async def test_web_search_success(self, mock_search):
        """Test web search with successful results."""
        # Setup mock
        mock_search.return_value = MOCK_SEARCH_RESULTS
        
        # Call function
        result = await web_search("test query")
        
        # Assertions
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["results"], MOCK_SEARCH_RESULTS)
        self.assertIn("formatted_results", result)
    
    @patch('app.tools.web_tools.search_with_retry')
    async def test_web_search_empty(self, mock_search):
        """Test web search with no results."""
        # Setup mock
        mock_search.return_value = []
        
        # Call function
        result = await web_search("test query")
        
        # Assertions
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["results"], [])
        self.assertIn("no results found", result["message"].lower())
    
    @patch('app.tools.web_tools.search_with_retry')
    async def test_web_search_error(self, mock_search):
        """Test web search with error."""
        # Setup mock
        mock_search.side_effect = Exception("Test search error")
        
        # Call function
        result = await web_search("test query")
        
        # Assertions
        self.assertEqual(result["status"], "error")
        self.assertIn("error", result["message"].lower())
    
    @patch('app.tools.web_tools.web_search')
    def test_search_wrapper(self, mock_web_search):
        """Test the synchronous wrapper for web_search."""
        # Setup mock
        mock_result = {"status": "success", "results": MOCK_SEARCH_RESULTS}
        mock_web_search.return_value = asyncio.Future()
        mock_web_search.return_value.set_result(mock_result)
        
        # Call function
        result = search("test query")
        
        # Assertions
        self.assertEqual(result, mock_result)


# Tests for web content extraction functionality
class TestWebContentExtraction(unittest.TestCase):
    """Tests for the web content extraction functionality."""
    
    def test_validate_url_valid(self):
        """Test URL validation with valid URLs."""
        valid_urls = [
            "https://example.com",
            "http://example.com/page?param=value",
            "https://sub.domain.example.com/path/to/page.html"
        ]
        
        for url in valid_urls:
            self.assertTrue(validate_url(url))
    
    def test_validate_url_invalid(self):
        """Test URL validation with invalid URLs."""
        invalid_urls = [
            "",
            "example.com",  # missing scheme
            "https://",     # missing netloc
            "not a url"
        ]
        
        for url in invalid_urls:
            self.assertFalse(validate_url(url))
    
    def test_parse_html(self):
        """Test HTML parsing to extract text content."""
        result = parse_html(MOCK_HTML_CONTENT)
        
        # Check if content is properly extracted
        self.assertIn("Test Heading", result)
        self.assertIn("This is a paragraph of text", result)
        self.assertIn("[Example Link](https://example.com)", result)
        
        # Check if script and style content is skipped
        self.assertNotIn("This should be skipped", result)
        self.assertNotIn("color: black", result)
    
    @patch('app.tools.web_tools.process_urls')
    async def test_extract_web_content_success(self, mock_process_urls):
        """Test successful web content extraction."""
        # Setup mock
        urls = ["https://example.com"]
        mock_process_urls.return_value = [
            {
                "url": "https://example.com",
                "status": "success",
                "content": "Extracted content from the page"
            }
        ]
        
        # Call function
        result = await extract_web_content(urls)
        
        # Assertions
        self.assertEqual(result["status"], "success")
        self.assertIn("results", result)
        self.assertIn("formatted_results", result)
    
    async def test_extract_web_content_invalid_urls(self):
        """Test web content extraction with invalid URLs."""
        # Call function with invalid URLs
        result = await extract_web_content(["not-a-valid-url"])
        
        # Assertions
        self.assertEqual(result["status"], "error")
        self.assertIn("No valid URLs", result["message"])
    
    @patch('app.tools.web_tools.process_urls')
    async def test_extract_web_content_error(self, mock_process_urls):
        """Test web content extraction with processing error."""
        # Setup mock to raise exception
        urls = ["https://example.com"]
        mock_process_urls.side_effect = Exception("Test processing error")
        
        # Call function
        result = await extract_web_content(urls)
        
        # Assertions
        self.assertEqual(result["status"], "error")
        self.assertIn("error", result["message"].lower())
    
    @patch('app.tools.web_tools.extract_web_content')
    def test_extract_content_wrapper(self, mock_extract):
        """Test the synchronous wrapper for extract_web_content."""
        # Setup mock
        urls = ["https://example.com"]
        mock_result = {"status": "success", "results": [{"content": "test"}]}
        mock_extract.return_value = asyncio.Future()
        mock_extract.return_value.set_result(mock_result)
        
        # Call function
        result = extract_content(urls)
        
        # Assertions
        self.assertEqual(result, mock_result)


def run_tests():
    """Run the unit tests for web tools."""
    logger.info("Starting web tools tests...")
    
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
    
    logger.info("Web tools tests completed")

if __name__ == "__main__":
    run_tests() 