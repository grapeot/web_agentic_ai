# Agentic AI Chat

A Cursor-like AI development environment with advanced agentic capabilities, on a Web interface.

WARNING: the project is mainly for demo purpose only, not for production use. It has severe security issues that essentially allows any user to access your system.

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
   
   # Multi-worker mode for better concurrency
   python claude-tooling/run.py --workers 4
   
   # Production mode with Gunicorn (Linux/Mac only)
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

## Testing

Run unit tests to verify functionality:

```bash
# Run all tests
python -m unittest discover claude-tooling/tests

# Test specific components
python claude-tooling/tests/test_tools.py
python claude-tooling/tests/test_auto_execute.py "Test query message"
python -m unittest claude-tooling/tests/test_web_tools.py
```

## Dependencies

- Activate the Python virtual environment in `./venv`
- Install dependencies: `pip install -r claude-tooling/requirements.txt`
- For web tools: `playwright install chromium`

## CI/CD

GitHub Actions automatically run tests on pull requests and merges to main branches. View workflow details in `.github/workflows/ci.yml`.

## License

MIT License