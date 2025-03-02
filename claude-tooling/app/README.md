# Claude Tooling - Application

## Overview

Claude Tooling is an integration platform that connects Claude 3.7 with local tools through a web interface. The application enables users to interact with Claude in a chat-like interface while allowing the AI to execute local commands, search files, and perform other actions through a defined set of tools. Each conversation is assigned a unique directory with a timestamp in the `runs` folder for better organization of generated files.

## Technology Stack

### Backend
- **FastAPI**: High-performance web framework for building APIs
- **Anthropic API**: Integration with Claude 3.7 for AI capabilities
- **Uvicorn**: ASGI server for running the FastAPI application
- **Pydantic**: Data validation and settings management

### Frontend
- **Vanilla JavaScript**: Core frontend implementation
- **HTML/CSS**: UI structure and styling
- **REST API**: Communication with the backend

## Application Structure

```
app/
├── api/               # Backend API implementation
│   ├── models/        # Data schemas and models
│   ├── routes/        # API endpoints
│   ├── services/      # Business logic services
│   ├── tools/         # Tool implementations
│   └── app.py         # FastAPI application entry point
├── frontend/          # Frontend implementation
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript modules
│   └── index.html     # Main HTML page
├── public/            # Static assets
└── __init__.py        # Package initialization
```

## Core Features

### API Module

The API module provides the core functionality for the application:

1. **Chat Integration**:
   - Connects to Claude 3.7 through Anthropic's API
   - Manages conversation state and history
   - Processes tool calls from Claude
   - Supports "thinking mode" to see Claude's reasoning process
   - Maintains organized conversation directories with timestamps

2. **Tool Framework**:
   - Implements various tools Claude can use:
     - File tools (reading/editing files)
     - Web tools (search, etc.)
     - Command tools (running local commands)
   - Auto-executes tools when requested by Claude
   - Formats tool results for Claude consumption

3. **Conversation Management**:
   - Creates and manages conversation contexts
   - Stores conversation history and files
   - Provides file access and manipulation within conversations

4. **API Endpoints**:
   - `/api/chat`: Main endpoint for chat interactions
   - `/api/tool-results`: Submit tool execution results
   - `/api/conversation`: Manage conversations
   - `/api/conversation/{conversation_id}/files/{file_path:path}`: File operations within conversations
   - `/api/conversation/{conversation_id}/cancel`: Cancel ongoing tool execution
   - `/api/conversation/{conversation_id}/root`: Get conversation root directory
   - `/api/tools`: Retrieve available tools

### Frontend Module

The frontend provides the user interface for interacting with Claude:

1. **Chat Interface**:
   - Message display and input
   - Tool status visualization
   - File preview and management

2. **Tool Execution**:
   - Display of tool execution requests
   - Manual approval of sensitive operations
   - Visualization of tool execution results
   - Cancellation of in-progress auto-executing tools
   - File preview with support for markdown, HTML, and images
   - Collapsible tool calls and results for better organization

## Implementation Details

### API Implementation

1. **FastAPI Application (`app.py`)**:
   - Initializes the application and dependencies
   - Sets up CORS and middleware
   - Configures Anthropic client
   - Mounts static files and routers

2. **Data Models (`models/schemas.py`)**:
   - Defines request/response schemas using Pydantic
   - Models for messages, tool calls, and tool outputs

3. **API Routes**:
   - `chat.py`: Core chat functionality and tool processing
   - `conversation.py`: Conversation management endpoints
   - `files.py`: File operations within conversations

4. **Services**:
   - `conversation.py`: Manages conversation state and storage
   - `file_service.py`: Handles file operations
   - `tool_execution.py`: Processes and executes tool calls

5. **Tools**:
   - `tool_wrapper.py`: Defines the tool interface for Claude and provides post-processing capabilities
   - `file_tools.py`: File reading, writing, and manipulation tools
   - `command_tools.py`: Command execution and processing
   - `web_tools.py`: Web search and content extraction
   - Intelligent file detection: Uses Claude to detect generated files from command outputs

### Integration Points

1. **Anthropic API Integration**:
   - Sends messages to Claude with tool definitions
   - Processes tool use requests and results
   - Handles streaming responses

2. **Frontend-Backend Communication**:
   - REST API calls for chat interaction
   - Tool execution approval flow
   - File management operations

## Development Guide

### Setup and Running

1. **Environment Setup**:
   ```bash
   # Install dependencies
   pip install -r requirements.txt
   
   # Set Anthropic API key
   export ANTHROPIC_API_KEY=your-api-key
   ```

2. **Running the Application**:
   ```bash
   # Basic single-worker mode
   python claude-tooling/run.py
   
   # Multi-worker mode for better concurrency
   python claude-tooling/run.py --workers 4
   
   # Production mode with Gunicorn (Linux/Mac only)
   python claude-tooling/run.py --use-gunicorn --workers 9
   ```
   The application will be available at `http://localhost:8000`

### Adding New Tools

To add new tools for Claude:

1. Create a new tool implementation in `app/api/tools/`
2. Add tool definition to `TOOL_DEFINITIONS` in `tool_wrapper.py`
3. Implement execution logic in the appropriate service
4. Update the frontend to handle the new tool type if needed

### Security Considerations

- Tool execution runs with the same permissions as the application
- Command execution should be carefully validated
- Production deployments should restrict CORS and implement authentication

## Behavior Guarantees

- Tool execution uses background tasks for asynchronous processing
- Frontend polls for updates during tool execution
- Tool execution can be cancelled by the user
- All API responses include proper error handling
- File operations are constrained to conversation directories
- Command execution can be configured to require manual approval
- Thinking mode support for seeing Claude's reasoning process
- Automatic file detection identifies created files from commands
- Enhanced file metadata for better rendering in the frontend 