#!/usr/bin/env python3
"""
FastAPI application to integrate Claude 3.7 with local tools.
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import anthropic
from dotenv import load_dotenv

# Import routes
from .routes import chat_router, conversation_router, files_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Claude Tooling API",
    description="API for interacting with Claude 3.7 and local tools",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
try:
    client = anthropic.Anthropic(
        api_key=os.environ.get("ANTHROPIC_API_KEY")
    )
    logger.info("Anthropic client initialized successfully")

    # Inject the client into the chat router
    from .routes.chat import client as chat_client
    chat_client = client

except Exception as e:
    logger.error(f"Failed to initialize Anthropic client: {str(e)}")
    raise

# Include routers
app.include_router(chat_router)
app.include_router(conversation_router)
app.include_router(files_router)

# Add root route to redirect to frontend
@app.get("/")
async def root():
    """Redirect root to the frontend UI"""
    return RedirectResponse(url="/frontend/index.html")

# Mount static files for frontend
app.mount("/frontend", StaticFiles(directory=os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 