#!/usr/bin/env python3
"""
Tests for the Markdown service module.
"""

import os
import sys
import unittest
import pytest
from typing import Dict, List, Any

# Add the parent directory to sys.path to allow importing the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.api.services.markdown_service import MarkdownService

class TestMarkdownService(unittest.TestCase):
    """Tests for the MarkdownService class."""
    
    def test_is_likely_markdown(self):
        """Test the _is_likely_markdown method."""
        # Test cases that should be identified as Markdown
        markdown_texts = [
            "# Heading 1",
            "## Heading 2",
            "This is *italic* and **bold** text",
            "- List item 1\n- List item 2",
            "1. Numbered item\n2. Another item",
            "[Link text](https://example.com)",
            "```python\nprint('Hello World')\n```",
            "> This is a blockquote",
            "| Column 1 | Column 2 |\n|----------|----------|",
        ]
        
        # Test cases that should not be identified as Markdown
        non_markdown_texts = [
            "Plain text without any markdown",
            "Just some regular text.",
            "1 + 2 = 3",
            "Hello World!",
            "a * b = c",  # This has an asterisk but not in markdown context
        ]
        
        # Test positive cases
        for text in markdown_texts:
            self.assertTrue(
                MarkdownService._is_likely_markdown(text),
                f"Failed to identify as Markdown: {text}"
            )
        
        # Test negative cases
        for text in non_markdown_texts:
            self.assertFalse(
                MarkdownService._is_likely_markdown(text),
                f"Incorrectly identified as Markdown: {text}"
            )
    
    def test_convert_to_html(self):
        """Test the convert_to_html method."""
        # Test basic Markdown conversion
        markdown_text = "# Heading\n\nThis is **bold** text."
        result = MarkdownService.convert_to_html(markdown_text)
        
        # Check that the result has the expected structure
        self.assertIsInstance(result, dict)
        self.assertIn("text", result)
        self.assertIn("format", result)
        self.assertEqual(result["format"], "html")
        
        # Check that the HTML contains expected elements
        html = result["text"]
        self.assertIn("<h1>Heading</h1>", html)
        self.assertIn("<strong>bold</strong>", html)
        
        # Test plain text handling
        plain_text = "Just plain text"
        result_plain = MarkdownService.convert_to_html(plain_text)
        self.assertEqual(result_plain["format"], "text")
        self.assertEqual(result_plain["text"], plain_text)
        
        # Test with explicit Markdown flag
        result_forced = MarkdownService.convert_to_html(plain_text, is_markdown=True)
        self.assertEqual(result_forced["format"], "html")
    
    def test_html_sanitization(self):
        """Test that HTML is properly sanitized."""
        # Test with potentially dangerous HTML
        dangerous_html = '<script>alert("XSS")</script><b>Bold text</b>'
        result = MarkdownService.convert_to_html(dangerous_html, is_markdown=True)
        
        # Check format
        self.assertEqual(result["format"], "html")
        
        # Script tags should be removed
        self.assertNotIn("<script>", result["text"])
        
        # Note: bleach removes tags but keeps their content, so we expect "alert" text to remain
        # We should check that the script tag itself is gone
        self.assertNotIn("<script>", result["text"])
        
        # Safe tags should remain
        self.assertIn("<b>Bold text</b>", result["text"])
        
        # Test with more dangerous attributes
        html_with_dangerous_attrs = '<a href="javascript:alert(\'xss\')" onclick="evil()">Click me</a>'
        result_attrs = MarkdownService.convert_to_html(html_with_dangerous_attrs, is_markdown=True)
        
        # javascript: protocol and event handlers should be removed
        self.assertNotIn("javascript:", result_attrs["text"])
        self.assertNotIn("onclick", result_attrs["text"])
        
        # The link tag itself should remain
        self.assertIn("<a", result_attrs["text"])
        self.assertIn("Click me</a>", result_attrs["text"])
    
    def test_process_message_content(self):
        """Test processing of message content array."""
        # Create a sample message content array
        content = [
            {"type": "text", "text": "# Heading\n\nThis is a paragraph."},
            {"type": "text", "text": "Plain text without markdown."},
            {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}
        ]
        
        # Process the content
        processed_content = MarkdownService.process_message_content(content)
        
        # Check that text content was processed correctly
        self.assertEqual(len(processed_content), 3)
        
        # First item should have format field if it's HTML
        first_item = processed_content[0]
        self.assertIn("format", first_item)
        self.assertEqual(first_item["format"], "html")
        self.assertIn("<h1>Heading</h1>", first_item["text"])
        
        # Check that plain text remains as text
        second_item = processed_content[1]
        self.assertEqual(second_item["text"], "Plain text without markdown.")
        self.assertNotIn("format", second_item)
        
        # Check that non-text content is unchanged
        third_item = processed_content[2]
        self.assertEqual(third_item["type"], "image_url")
        self.assertEqual(third_item["image_url"]["url"], "https://example.com/image.jpg")

if __name__ == "__main__":
    unittest.main() 