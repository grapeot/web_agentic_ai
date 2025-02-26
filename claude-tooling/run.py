#!/usr/bin/env python3
"""
Run script for Claude Tooling application.
"""

import os
import argparse
import uvicorn
import sys
import multiprocessing
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def parse_args():
    """Parse command line arguments."""
    # Get CPU count for default workers
    cpu_count = multiprocessing.cpu_count()
    # Recommended workers formula: (2 * CPU_COUNT) + 1
    recommended_workers = (2 * cpu_count) + 1
    
    parser = argparse.ArgumentParser(description="Run the Claude Tooling application")
    parser.add_argument("--host", 
                        default=os.environ.get("HOST", "0.0.0.0"),
                        help="Host to bind the server to")
    parser.add_argument("--port", 
                        type=int,
                        default=int(os.environ.get("PORT", 8000)),
                        help="Port to bind the server to")
    parser.add_argument("--reload", 
                        action="store_true",
                        help="Enable auto-reload for development")
    parser.add_argument("--log-level", 
                        default=os.environ.get("LOG_LEVEL", "info"),
                        choices=["debug", "info", "warning", "error", "critical"],
                        help="Logging level")
    parser.add_argument("--force", 
                        action="store_true",
                        help="Force start even if API key is missing (not recommended)")
    parser.add_argument("--workers",
                        type=int,
                        default=int(os.environ.get("WORKERS", 1)),
                        help=f"Number of worker processes (default: 1, recommended for production: {recommended_workers})")
    parser.add_argument("--use-gunicorn",
                        action="store_true",
                        help="Use Gunicorn with Uvicorn workers (recommended for production)")
    return parser.parse_args()

def main():
    """Run the FastAPI application."""
    args = parse_args()
    
    # Check if ANTHROPIC_API_KEY is set
    api_key_missing = False
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("WARNING: ANTHROPIC_API_KEY environment variable is not set!")
        print("Please set it in the .env file or as an environment variable.")
        api_key_missing = True
    
    # Exit if API key is missing and not forced to continue
    if api_key_missing and not args.force:
        print("ERROR: Cannot start the application without required API keys.")
        print("Please set the required API keys or use --force to start anyway (not recommended for production).")
        sys.exit(1)
    
    print(f"Starting Claude Tooling API server at http://{args.host}:{args.port}")
    
    # Display concurrency info
    if args.workers > 1:
        print(f"Using {args.workers} worker processes for improved concurrency")
    else:
        print("Running in single-worker mode (limited concurrency)")
    
    try:
        if args.use_gunicorn:
            # Check if gunicorn is installed
            try:
                import gunicorn
            except ImportError:
                print("ERROR: Gunicorn is not installed. Run 'pip install gunicorn' to use this option.")
                sys.exit(1)
            
            # Important note for Windows users
            if sys.platform == 'win32':
                print("ERROR: Gunicorn is not supported on Windows. Please use standard Uvicorn workers instead.")
                sys.exit(1)
            
            print("Using Gunicorn with Uvicorn workers (recommended for production)")
            
            # Run using Gunicorn with Uvicorn workers
            from gunicorn.app.base import BaseApplication
            
            class GunicornApp(BaseApplication):
                def __init__(self, app_name, options=None):
                    self.app_name = app_name
                    self.options = options or {}
                    super().__init__()

                def load_config(self):
                    for key, value in self.options.items():
                        if key in self.cfg.settings and value is not None:
                            self.cfg.set(key.lower(), value)

                def load(self):
                    return self.app_name
            
            options = {
                'bind': f"{args.host}:{args.port}",
                'workers': args.workers,
                'worker_class': 'uvicorn.workers.UvicornWorker',
                'loglevel': args.log_level,
            }
            
            GunicornApp("app.api.app:app", options).run()
        else:
            # Run using Uvicorn directly
            if args.workers > 1 and args.reload:
                print("WARNING: When using multiple workers, the --reload flag might not work as expected.")
            
            # Run the application
            uvicorn.run(
                "app.api.app:app",
                host=args.host,
                port=args.port,
                reload=args.reload,
                log_level=args.log_level,
                workers=args.workers
            )
    except Exception as e:
        print(f"ERROR: Failed to start the server: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 