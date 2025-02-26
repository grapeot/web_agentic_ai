# cursor-web

A Cursor-powered AI development environment with advanced agentic capabilities.

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

## Testing

The project includes tests to verify functionality:

1. Tool Tests - Test the functionality of individual tools:
   ```bash
   python claude-tooling/tests/test_tools.py
   ```

2. Auto-Execute Tests - Test the automatic tool execution feature:
   ```bash
   python claude-tooling/tests/test_auto_execute.py "Test query message"
   ```
   Example:
   ```bash
   python claude-tooling/tests/test_auto_execute.py "Write a Python script to calculate the first 10 Fibonacci numbers"
   ```
   Press Ctrl+C at any time to interrupt the execution.

### Auto Tool Execution

The auto tool execution feature allows Claude to automatically execute tool calls and continue the conversation after receiving a user request, without requiring the user to manually submit the results of each tool call.

#### Features

- Fully automatic tool call execution without manual input
- Real-time execution progress display in the web interface
- Cancel function to stop ongoing automatic execution
- Switchable between automatic and manual modes

#### Usage

**Web Interface:**
1. Open the Web interface (http://localhost:8004)
2. Enable "Auto Execute Tools" in the settings panel
3. Input your request and send
4. Watch the automatic execution progress until completion

**Command Line Testing:**
```bash
python claude-tooling/tests/test_auto_execute.py "Create a simple Python script to calculate the sum from 1 to 100"
```

#### Implementation Details

- Backend: Uses `auto_execute_tools` parameter to control automatic execution
- Frontend: Includes progress indicators and polling mechanism for latest results
- For developers: Set `auto_execute_tools=true` in API requests to enable this feature
- Limitations: Only supports built-in tools; complex interactive tools may still require user intervention

## AI Assistant Configuration


This project uses `.cursorrules` to configure the AI assistant. The assistant can:
- Help with coding tasks
- Verify screenshots
- Perform web searches
- Analyze images and code

## License

MIT License