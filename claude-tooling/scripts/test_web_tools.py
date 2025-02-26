#!/usr/bin/env python3
"""
Script to manually test the web tools functionality.
"""

import os
import sys
import json
import argparse
import asyncio

# Add parent directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the tools
from app.api.tools.web_tools import search, extract_content

def print_json(data):
    """Print JSON data in a readable format."""
    print(json.dumps(data, indent=2))

def test_web_search(query, max_results=5):
    """Test the web search functionality."""
    print(f"\n===== Testing Web Search =====")
    print(f"Query: {query}")
    print(f"Max Results: {max_results}")
    
    results = search(query, max_results=max_results)
    
    if results["status"] == "success":
        print("\n✅ Web search successful!")
        if "formatted_results" in results:
            print("\n----- Formatted Results -----")
            print(results["formatted_results"])
        else:
            print("\n----- Results -----")
            print_json(results["results"])
    else:
        print(f"\n❌ Web search failed: {results['message']}")
    
    return results

def test_extract_content(urls, max_concurrent=2):
    """Test the web content extraction functionality."""
    print(f"\n===== Testing Web Content Extraction =====")
    print(f"URLs: {urls}")
    print(f"Max Concurrent: {max_concurrent}")
    
    results = extract_content(urls, max_concurrent=max_concurrent)
    
    if results["status"] == "success":
        print("\n✅ Web content extraction successful!")
        if "formatted_results" in results:
            print("\n----- Formatted Results -----")
            print(results["formatted_results"])
        else:
            print("\n----- Results -----")
            print_json(results["results"])
    else:
        print(f"\n❌ Web content extraction failed: {results['message']}")
    
    return results

def main():
    parser = argparse.ArgumentParser(description="Test the web tools functionality")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Web search command
    search_parser = subparsers.add_parser("search", help="Test web search")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--max-results", type=int, default=5, help="Maximum number of results")
    
    # Web content extraction command
    extract_parser = subparsers.add_parser("extract", help="Test web content extraction")
    extract_parser.add_argument("urls", nargs="+", help="URLs to extract content from")
    extract_parser.add_argument("--max-concurrent", type=int, default=2, help="Maximum number of concurrent browser instances")
    
    # All tests command
    subparsers.add_parser("all", help="Run all tests with default examples")
    
    args = parser.parse_args()
    
    if args.command == "search":
        test_web_search(args.query, args.max_results)
    elif args.command == "extract":
        test_extract_content(args.urls, args.max_concurrent)
    elif args.command == "all":
        # Run both tests with example inputs
        test_web_search("latest developments in artificial intelligence")
        test_extract_content(["https://www.example.com", "https://en.wikipedia.org/wiki/Main_Page"])
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 