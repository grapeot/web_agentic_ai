"""
Markdown processing service for converting Markdown to HTML.
"""

import re
import logging
import markdown2
import bleach
from typing import Optional, List, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class MarkdownService:
    """Service for processing and converting Markdown content to HTML."""
    
    # Allowed HTML tags for sanitization
    ALLOWED_TAGS = [
        'a', 'abbr', 'acronym', 'b', 'blockquote', 'br', 'code', 'div', 'em',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol',
        'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead',
        'tr', 'ul'
    ]
    
    # Allowed HTML attributes for sanitization
    ALLOWED_ATTRIBUTES = {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'td': ['colspan', 'rowspan', 'align'],
        'th': ['colspan', 'rowspan', 'align'],
        '*': ['class', 'id']
    }
    
    # Markdown patterns for detection
    MARKDOWN_PATTERNS = [
        r'^#+ ',          # Headers
        r'\*\*.*?\*\*',   # Bold
        r'`.*?`',         # Inline code
        r'```[\s\S]*?```',# Code blocks
        r'!\[.*?\]\(.*?\)',# Images
        r'\[.*?\]\(.*?\)',# Links
        r'^\s*[\*\-\+] ', # Unordered lists
        r'^\s*\d+\. ',    # Ordered lists
        r'\|.+\|',        # Tables
        r'^>\s',          # Blockquotes
    ]
    
    @classmethod
    def convert_to_html(cls, text: str, is_markdown: Optional[bool] = None) -> Dict[str, Any]:
        """
        Convert Markdown text to HTML.
        
        Args:
            text: Text content to convert
            is_markdown: Force treatment as Markdown if True, as plain text if False.
                         Auto-detect if None.
        
        Returns:
            Dict with converted text and format information:
            {
                "text": <converted_text>,
                "format": "html" or "text"
            }
        """
        if not text:
            return {"text": "", "format": "text"}
        
        # Determine if text is likely Markdown if not explicitly specified
        if is_markdown is None:
            is_markdown = cls._is_likely_markdown(text)
            logger.debug(f"Auto-detected content as {'Markdown' if is_markdown else 'plain text'}")
        
        # Process as plain text if not Markdown
        if not is_markdown:
            return {"text": text, "format": "text"}
        
        try:
            # Convert Markdown to HTML using markdown2
            html = markdown2.markdown(
                text,
                extras=[
                    "fenced-code-blocks", 
                    "tables", 
                    "break-on-newline",
                    "code-friendly"
                ]
            )
            
            # Sanitize HTML to prevent XSS
            sanitized_html = bleach.clean(
                html,
                tags=cls.ALLOWED_TAGS,
                attributes=cls.ALLOWED_ATTRIBUTES,
                strip=True
            )
            
            logger.debug("Successfully converted Markdown to HTML")
            return {"text": sanitized_html, "format": "html"}
            
        except Exception as e:
            logger.error(f"Error converting Markdown to HTML: {str(e)}")
            # Fall back to plain text on error
            return {"text": text, "format": "text"}
    
    @classmethod
    def _is_likely_markdown(cls, text: str) -> bool:
        """
        Determine if text likely contains Markdown formatting.
        
        Args:
            text: Text to analyze
            
        Returns:
            True if text likely contains Markdown, False otherwise
        """
        # Quick checks for common Markdown patterns
        if not text or len(text) < 3:
            return False
            
        # Count line breaks - plain text usually has more than Markdown
        line_breaks = text.count('\n')
        
        # Check for Markdown patterns
        for pattern in cls.MARKDOWN_PATTERNS:
            if re.search(pattern, text, re.MULTILINE):
                return True
                
        # Special case for documents like README.md
        if text.startswith('# ') or '## ' in text:
            return True
            
        # Check for code blocks which are strong indicators of Markdown
        if '```' in text or text.count('`') >= 2:
            return True
            
        return False
        
    @classmethod
    def process_message_content(cls, content: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process a message's content array, converting any Markdown text to HTML.
        
        Args:
            content: List of content blocks (e.g., from Claude's response)
            
        Returns:
            Processed content with Markdown converted to HTML
        """
        if not content:
            return content
            
        processed_content = []
        
        for item in content:
            # Only process text type content
            if item.get("type") == "text":
                text = item.get("text", "")
                result = cls.convert_to_html(text)
                
                # Create a new content item with converted text
                new_item = item.copy()
                new_item["text"] = result["text"]
                
                # Add format field if it's HTML
                if result["format"] == "html":
                    new_item["format"] = "html"
                    
                processed_content.append(new_item)
            else:
                # Pass through non-text content unchanged
                processed_content.append(item)
                
        return processed_content 