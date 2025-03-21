# Agentic AI Chat

A Cursor-like AI development environment with advanced agentic capabilities, on a Web interface.

![Robot Icon](claude-tooling/app/frontend/favicon.svg) 

WARNING: the project is mainly for demo purpose only, not for production use. It has severe security issues that essentially allows any user to access your system.

![Example screenshot](screenshot.png)

## Quick Start

1. Activate the virtual environment:
   ```bash
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

2. Configure your environment:
   - Copy `.env.example` to `.env` if you haven't already
   - Add your API keys in `.env` (optional)

3. Run the server:
   ```bash
   # Basic single-worker mode (default)
   python claude-tooling/run.py
   
   # Multi-worker mode for better concurrency. 
   # WARNING: It still has some issues. Ideally we would need an external data source to share data between workers.
   python claude-tooling/run.py --workers 4
   
   # Production mode with Gunicorn (Linux/Mac only)
   # WARNING: It still has some issues. Ideally we would need an external data source to share data between workers.
   python claude-tooling/run.py --use-gunicorn --workers 9
   ```

## Features

- **Advanced AI Assistant** configured via `.cursorrules`
- **Auto Tool Execution** for seamless AI interaction
- **File Management** tools for reading and writing files
- **Command Execution** capabilities for terminal operations
- **Web Tools** for searching and extracting web content
- **Conversation Root Directories** - Each conversation is automatically assigned a unique directory in `runs/<timestamp>` for better organization of generated files
- **Server Concurrency** - Support for multiple workers to handle concurrent requests for better performance
- **Enhanced UI for Tool Calls** - Collapsible tool calls with clear visualization of inputs and results, automatic expansion when results arrive, and visual indicators for completed tool executions
- **Modular Frontend Architecture** - Well-structured frontend code with clear separation of concerns for better maintainability and extensibility
- **Reliable Tool Completion Detection** - Improved tracking of tool execution status and accurate auto-execution indicator management

## Frontend Architecture

The frontend code follows a modular architecture with clear separation of concerns:

- **state.js** - Centralized state management using a singleton pattern
- **api.js** - API communication layer for backend interaction
- **tools.js** - Tool call handling and auto-execution management
- **ui.js** - User interface rendering and DOM operations
- **events.js** - Event handling and user interaction processing
- **config.js** - Configuration constants and settings
- **filePreview.js** - File preview functionality for generated files
- **utils.js** - Utility functions for common operations
- **main.js** - Application initialization and coordination

See [frontend/README.md](claude-tooling/app/frontend/README.md) for detailed documentation of the frontend architecture.

## Testing

The project includes a comprehensive test suite to ensure functionality and assist with code refactoring:

```bash
# Run all tests with the test runner script
python claude-tooling/scripts/run_tests.py

# Run specific test groups
python claude-tooling/scripts/run_tests.py --api
python claude-tooling/scripts/run_tests.py --auto-execute
python claude-tooling/scripts/run_tests.py --modularity

# Run tests with verbose output and coverage reports
python claude-tooling/scripts/run_tests.py --verbose --coverage
```

See [tests/README.md](claude-tooling/tests/README.md) for detailed information about the testing strategy and how to use tests for refactoring.

## Dependencies

- Activate the Python virtual environment in `./venv`
- Install dependencies: `pip install -r claude-tooling/requirements.txt`
- For web tools: `playwright install chromium`

## CI/CD

GitHub Actions automatically run tests on pull requests and merges to main branches. View workflow details in `.github/workflows/ci.yml`.

## License

MIT License