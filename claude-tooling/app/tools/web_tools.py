import logging
import sys
import time
from typing import Dict, Any, List, Optional
import httpx
from urllib.parse import urlparse
import asyncio
from playwright.async_api import async_playwright
import html5lib

logger = logging.getLogger(__name__)

# DuckDuckGo search implementation
async def search_with_retry(query: str, max_results: int = 10, max_retries: int = 3) -> List[Dict[str, str]]:
    """
    Search using DuckDuckGo and return results with URLs and text snippets.
    
    Args:
        query (str): Search query
        max_results (int): Maximum number of results to return
        max_retries (int): Maximum number of retry attempts
        
    Returns:
        List of dictionaries containing search results
    """
    from duckduckgo_search import DDGS
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Searching for query: {query} (attempt {attempt + 1}/{max_retries})")
            
            # Use DDGS synchronously but within an async context
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                
            if not results:
                logger.info("No results found")
                return []
            
            logger.info(f"Found {len(results)} results")
            return results
                
        except Exception as e:
            logger.error(f"Search attempt {attempt + 1}/{max_retries} failed: {str(e)}")
            if attempt < max_retries - 1:  # If not the last attempt
                logger.info(f"Waiting 1 second before retry...")
                await asyncio.sleep(1)  # Wait 1 second before retry
            else:
                logger.error(f"All {max_retries} attempts failed")
                raise

def format_search_results(results: List[Dict[str, str]]) -> str:
    """Format search results into a readable string."""
    formatted_results = []
    
    for i, r in enumerate(results, 1):
        formatted_results.append(f"\n=== Result {i} ===")
        formatted_results.append(f"URL: {r.get('href', 'N/A')}")
        formatted_results.append(f"Title: {r.get('title', 'N/A')}")
        formatted_results.append(f"Snippet: {r.get('body', 'N/A')}")
    
    return "\n".join(formatted_results)

async def web_search(query: str, max_results: int = 10, max_retries: int = 3) -> Dict[str, Any]:
    """
    Web search function using DuckDuckGo.
    
    Args:
        query: Search query
        max_results: Maximum number of results to return
        max_retries: Maximum number of retry attempts
        
    Returns:
        Dict with status, message and results
    """
    try:
        results = await search_with_retry(query, max_results, max_retries)
        
        if not results:
            return {
                "status": "success",
                "message": "Search successful but no results found",
                "results": []
            }
        
        formatted_results = format_search_results(results)
        
        return {
            "status": "success",
            "message": f"Found {len(results)} results for query: {query}",
            "results": results,
            "formatted_results": formatted_results
        }
            
    except Exception as e:
        error_msg = f"Search failed: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg
        }

# Web content extraction implementation
def validate_url(url: str) -> bool:
    """Validate if the given string is a valid URL."""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def parse_html(html_content: Optional[str]) -> str:
    """Parse HTML content and extract text with hyperlinks in markdown format."""
    if not html_content:
        return ""
    
    try:
        document = html5lib.parse(html_content)
        result = []
        seen_texts = set()  # To avoid duplicates
        
        def should_skip_element(elem) -> bool:
            """Check if the element should be skipped."""
            # Skip script and style tags
            if elem.tag in ['{http://www.w3.org/1999/xhtml}script', 
                          '{http://www.w3.org/1999/xhtml}style']:
                return True
            # Skip empty elements or elements with only whitespace
            if not any(text.strip() for text in elem.itertext()):
                return True
            return False
        
        def process_element(elem, depth=0):
            """Process an element and its children recursively."""
            if should_skip_element(elem):
                return
            
            # Handle text content
            if hasattr(elem, 'text') and elem.text:
                text = elem.text.strip()
                if text and text not in seen_texts:
                    # Check if this is an anchor tag
                    if elem.tag == '{http://www.w3.org/1999/xhtml}a':
                        href = None
                        for attr, value in elem.items():
                            if attr.endswith('href'):
                                href = value
                                break
                        if href and not href.startswith(('#', 'javascript:')):
                            # Format as markdown link
                            link_text = f"[{text}]({href})"
                            result.append("  " * depth + link_text)
                            seen_texts.add(text)
                    else:
                        result.append("  " * depth + text)
                        seen_texts.add(text)
            
            # Process children
            for child in elem:
                process_element(child, depth + 1)
            
            # Handle tail text
            if hasattr(elem, 'tail') and elem.tail:
                tail = elem.tail.strip()
                if tail and tail not in seen_texts:
                    result.append("  " * depth + tail)
                    seen_texts.add(tail)
        
        # Start processing from the body tag
        body = document.find('.//{http://www.w3.org/1999/xhtml}body')
        if body is not None:
            process_element(body)
        else:
            # Fallback to processing the entire document
            process_element(document)
        
        # Filter out common unwanted patterns
        filtered_result = []
        for line in result:
            # Skip lines that are likely to be noise
            if any(pattern in line.lower() for pattern in [
                'var ', 
                'function()', 
                '.js',
                '.css',
                'google-analytics',
                'disqus',
                '{',
                '}'
            ]):
                continue
            filtered_result.append(line)
        
        return '\n'.join(filtered_result)
    except Exception as e:
        logger.error(f"Error parsing HTML: {str(e)}")
        return ""

async def fetch_page(url: str, context) -> Optional[str]:
    """Asynchronously fetch a webpage's content."""
    page = await context.new_page()
    try:
        logger.info(f"Fetching {url}")
        await page.goto(url)
        await page.wait_for_load_state('networkidle')
        content = await page.content()
        logger.info(f"Successfully fetched {url}")
        return content
    except Exception as e:
        logger.error(f"Error fetching {url}: {str(e)}")
        return None
    finally:
        await page.close()

async def process_urls(urls: List[str], max_concurrent: int = 3) -> List[Dict[str, Any]]:
    """Process multiple URLs concurrently."""
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            # Create browser contexts
            n_contexts = min(len(urls), max_concurrent)
            contexts = [await browser.new_context() for _ in range(n_contexts)]
            
            # Create tasks for each URL
            tasks = []
            for i, url in enumerate(urls):
                context = contexts[i % len(contexts)]
                task = fetch_page(url, context)
                tasks.append((url, task))
            
            # Gather results
            for url, task in tasks:
                try:
                    html_content = await task
                    text_content = parse_html(html_content)
                    
                    results.append({
                        "url": url,
                        "status": "success" if html_content else "error",
                        "content": text_content
                    })
                except Exception as e:
                    logger.error(f"Error processing {url}: {str(e)}")
                    results.append({
                        "url": url,
                        "status": "error",
                        "message": str(e)
                    })
                
            return results
            
        finally:
            # Cleanup
            for context in contexts:
                await context.close()
            await browser.close()

async def extract_web_content(urls: List[str], max_concurrent: int = 3) -> Dict[str, Any]:
    """
    Extract text content from web pages.
    
    Args:
        urls: List of URLs to process
        max_concurrent: Maximum number of concurrent browser instances
        
    Returns:
        Dict with status, message and extracted content
    """
    try:
        # Validate URLs
        valid_urls = []
        invalid_urls = []
        
        for url in urls:
            if validate_url(url):
                valid_urls.append(url)
            else:
                invalid_urls.append(url)
        
        if not valid_urls:
            return {
                "status": "error",
                "message": f"No valid URLs provided. Invalid URLs: {invalid_urls}"
            }
        
        if invalid_urls:
            logger.warning(f"Skipping invalid URLs: {invalid_urls}")
        
        # Process valid URLs
        start_time = time.time()
        results = await process_urls(valid_urls, max_concurrent)
        
        # Format results
        formatted_results = []
        for result in results:
            if result["status"] == "success":
                formatted_results.append(f"\n=== Content from {result['url']} ===")
                formatted_results.append(result["content"])
                formatted_results.append("=" * 80)
            else:
                formatted_results.append(f"\n=== Error fetching {result['url']} ===")
                formatted_results.append(result.get("message", "Unknown error"))
                formatted_results.append("=" * 80)
        
        processing_time = time.time() - start_time
        
        return {
            "status": "success",
            "message": f"Processed {len(valid_urls)} URLs in {processing_time:.2f}s",
            "results": results,
            "formatted_results": "\n".join(formatted_results),
            "invalid_urls": invalid_urls if invalid_urls else None
        }
            
    except Exception as e:
        error_msg = f"Error extracting web content: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg
        }

# Synchronous wrappers for the async functions
def search(query: str, max_results: int = 10, max_retries: int = 3) -> Dict[str, Any]:
    """Synchronous wrapper for web_search"""
    try:
        # Create a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(web_search(query, max_results, max_retries))
        loop.close()
        return result
    except Exception as e:
        error_msg = f"Search failed: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg
        }

def extract_content(urls: List[str], max_concurrent: int = 3) -> Dict[str, Any]:
    """Synchronous wrapper for extract_web_content"""
    try:
        # Create a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(extract_web_content(urls, max_concurrent))
        loop.close()
        return result
    except Exception as e:
        error_msg = f"Error extracting web content: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg
        } 