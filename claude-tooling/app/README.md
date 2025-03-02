# Claude Tooling - Application

## Overview

Claude Tooling is an integration platform that connects Claude 3.7 with local tools through a web interface. The application enables users to interact with Claude in a chat-like interface while allowing the AI to execute local commands, search files, and perform other actions through a defined set of tools.

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
   - Converts Markdown responses to HTML for better rendering

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
   - `/api/files`: File operations within conversations

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
   - `markdown_service.py`: Detects and converts Markdown to HTML

5. **Tools**:
   - `tool_wrapper.py`: Defines the tool interface for Claude
   - Various tool implementations (file, web, command)

### Integration Points

1. **Anthropic API Integration**:
   - Sends messages to Claude with tool definitions
   - Processes tool use requests and results
   - Handles streaming responses

2. **Frontend-Backend Communication**:
   - REST API calls for chat interaction
   - Tool execution approval flow
   - File management operations

### Markdown Processing Pipeline

The application implements a backend Markdown-to-HTML conversion pipeline to ensure proper rendering of formatted content:

1. **Detection and Conversion**:
   - Automatically detects if content is likely to be Markdown
   - Converts Markdown to HTML using the markdown2 library
   - Sanitizes HTML output with bleach to prevent XSS attacks
   - Preserves line breaks and code formatting

2. **Response Processing**:
   - Chat API endpoints process all response content
   - Adds format metadata to converted content
   - Frontend renders HTML or plain text based on format indicators

3. **Security Measures**:
   - HTML content is sanitized to prevent XSS attacks
   - Only specific HTML tags and attributes are allowed
   - Plain text is safely escaped if not identified as Markdown

This approach allows the application to handle LLM-generated Markdown content properly while maintaining security best practices.

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
   python -m app.api.app
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

- Tool execution is synchronous and blocking by default
- Background tasks are used for continuous processing
- All API responses include proper error handling
- File operations are constrained to conversation directories
- Command execution can be configured to require manual approval 

## File and Image Handling

The application implements a comprehensive file and image handling system that enables seamless integration of generated files within the conversation flow:

1. **Image Rendering**:
   - Images generated by tools are automatically displayed in the chat interface
   - Backend provides image URLs through the `/api/conversation/{conversation_id}/files/{file_path}` endpoint
   - Frontend detects image file types and renders appropriate previews

2. **File URL Structure**:
   - Files are stored in conversation-specific directories (`runs/{timestamp}`)
   - File URLs are generated as `/api/conversation/{conversation_id}/files/{relative_path}`
   - Both `file_url` and `url` fields are supported across the application for maximum compatibility

3. **Markdown Image Integration**:
   - Markdown images are rendered using the `markdown_render` field with a proper format specifier
   - Image file results include a `render_type: "image"` field to trigger proper rendering
   - The rendering system generates appropriate HTML for both single and multiple image displays

4. **Cache and Performance**:
   - Image files are served with appropriate cache headers to optimize performance
   - Content types are automatically detected based on file extensions
   - Debug headers provide transparency into file serving operations

5. **File Preview Controls**:
   - File previews include appropriate actions based on file type (view, download)
   - Image thumbnails are generated for better user experience
   - All file operations maintain proper security boundaries within conversation contexts 

## Implementation Lessons

During the development of the application, several important lessons were learned that might be helpful for future development or similar projects:

1. **File URL Handling**:
   - Always check for both `file_url` and `url` fields when processing file results
   - Use a fallback mechanism: `const fileUrl = file.url || file.file_url`
   - Ensure file URLs are properly joined with server base URL for absolute references

2. **Image Rendering Pipeline**:
   - The `markdown_render` field with `render_type: "image"` provides clear type information
   - Always verify the existence of files before attempting to serve them
   - Use appropriate content types and cache headers for different file types
   - Include debugging information in headers without exposing sensitive paths

3. **Error Handling**:
   - Log detailed errors including stack traces for server-side issues
   - Provide user-friendly error messages in the UI
   - Check file permissions and existence at multiple points in the pipeline
   - Include sufficient context in error messages for troubleshooting

4. **Frontend-Backend Coordination**:
   - Ensure consistent field naming across frontend and backend components
   - Document the fields expected by each component clearly
   - Use the same file URL construction logic on both sides
   - Test with various file types and sizes to ensure robust handling 