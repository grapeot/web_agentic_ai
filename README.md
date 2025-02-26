# Agentic AI Chat

A Cursor-like AI development environment with advanced agentic capabilities, on a Web interface.

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

## Features

- **Advanced AI Assistant** configured via `.cursorrules`
- **Auto Tool Execution** for seamless AI interaction
- **File Management** tools for reading and writing files
- **Command Execution** capabilities for terminal operations
- **Web Tools** for searching and extracting web content

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