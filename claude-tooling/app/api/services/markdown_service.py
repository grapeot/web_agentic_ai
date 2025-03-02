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
            logger.debug("Empty text received, returning empty result")
            return {"text": "", "format": "text"}
        
        logger.info(f"Converting text to HTML, is_markdown: {is_markdown}, text length: {len(text)}")
        
        # Determine if text is likely Markdown if not explicitly specified
        if is_markdown is None:
            is_markdown = cls._is_likely_markdown(text)
            logger.info(f"Auto-detected content as {'Markdown' if is_markdown else 'plain text'}")
        
        # Process as plain text if not Markdown
        if not is_markdown:
            logger.debug("Processing as plain text (not Markdown)")
            return {"text": text, "format": "text"}
        
        try:
            logger.debug("Converting Markdown to HTML with markdown2")
            
            # Check for image links in markdown
            image_matches = re.findall(r'!\[(.*?)\]\((.*?)\)', text)
            if image_matches:
                logger.info(f"Found {len(image_matches)} image links in Markdown: {image_matches}")
            
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
            
            # Log if img tags are present in the generated HTML
            img_tags = re.findall(r'<img[^>]+>', html)
            if img_tags:
                logger.info(f"HTML contains {len(img_tags)} img tags: {img_tags}")
            
            # Sanitize HTML to prevent XSS
            logger.debug("Sanitizing HTML with bleach")
            pre_sanitize_length = len(html)
            sanitized_html = bleach.clean(
                html,
                tags=cls.ALLOWED_TAGS,
                attributes=cls.ALLOWED_ATTRIBUTES,
                strip=True
            )
            post_sanitize_length = len(sanitized_html)
            
            if pre_sanitize_length != post_sanitize_length:
                logger.warning(f"HTML size changed during sanitization: {pre_sanitize_length} -> {post_sanitize_length}")
                # Check if img tags were removed during sanitization
                img_tags_after = re.findall(r'<img[^>]+>', sanitized_html)
                if len(img_tags) != len(img_tags_after):
                    logger.warning(f"Some img tags were filtered out by sanitization. Before: {len(img_tags)}, After: {len(img_tags_after)}")
            
            logger.info("Successfully converted Markdown to HTML, returning format: html")
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
        
        # Check for image links specifically
        image_links = re.findall(r'!\[(.*?)\]\((.*?)\)', text)
        if image_links:
            logger.info(f"Detected Markdown image links: {image_links}")
            return True
            
        # Check for Markdown patterns
        for pattern in cls.MARKDOWN_PATTERNS:
            if re.search(pattern, text, re.MULTILINE):
                match = re.search(pattern, text, re.MULTILINE)
                if match:
                    logger.debug(f"Detected Markdown pattern: {pattern} with match: {match.group(0)[:30]}...")
                return True
                
        # Special case for documents like README.md
        if text.startswith('# ') or '## ' in text:
            logger.debug("Detected Markdown headers")
            return True
            
        # Check for code blocks which are strong indicators of Markdown
        if '```' in text or text.count('`') >= 2:
            logger.debug("Detected Markdown code blocks")
            return True
            
        logger.debug("Text does not appear to be Markdown")
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
            logger.debug("No content to process")
            return content
            
        logger.info(f"Processing message content with {len(content)} blocks")
        processed_content = []
        
        for i, item in enumerate(content):
            logger.debug(f"Processing content block {i}, type: {item.get('type')}")
            
            # Only process text type content
            if item.get("type") == "text":
                text = item.get("text", "")
                logger.info(f"Converting text block {i}, length: {len(text)}")
                result = cls.convert_to_html(text)
                
                # Create a new content item with converted text
                new_item = item.copy()
                new_item["text"] = result["text"]
                
                # Add format field if it's HTML
                if result["format"] == "html":
                    new_item["format"] = "html"
                    logger.info(f"Block {i} was converted to HTML format")
                    
                processed_content.append(new_item)
            else:
                # Pass through non-text content unchanged
                logger.debug(f"Passing through non-text content block: {item.get('type')}")
                processed_content.append(item)
                
        logger.info(f"Processed {len(processed_content)} content blocks")
        return processed_content 