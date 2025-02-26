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

3. Web Tools Tests - Test the web search and content extraction tools:
   ```bash
   python -m unittest claude-tooling/tests/test_web_tools.py
   ```
   
   You can also test the web tools manually:
   ```bash
   # Test web search
   python claude-tooling/scripts/test_web_tools.py search "your search query"
   
   # Test content extraction
   python claude-tooling/scripts/test_web_tools.py extract https://example.com
   
   # Test both with default examples
   python claude-tooling/scripts/test_web_tools.py all
   ```

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

## Available Tools

Claude can leverage various tools to enhance its capabilities:

### File Tools

- **save_file**: Save content to a file. Creates directories in the path if they don't exist.
- **read_file**: Read content from a file.

### Command Tools

- **run_terminal_command**: Run a terminal command and return the result.
- **install_python_package**: Install a Python package using pip.

### Web Tools

- **web_search**: Search the web using DuckDuckGo and return results with URLs and text snippets.
- **extract_web_content**: Extract text content from web pages and return it in a readable format with hyperlinks preserved as markdown.

## Web Tools Usage Examples

### Web Search

The `web_search` tool allows Claude to search the web for information:

```python
# Example tool call from Claude
{
    "name": "web_search",
    "input": {
        "query": "climate change latest research",
        "max_results": 5,
        "max_retries": 3
    }
}
```

The tool will return search results including URLs, titles, and text snippets.

### Web Content Extraction

The `extract_web_content` tool allows Claude to extract the main content from web pages:

```python
# Example tool call from Claude
{
    "name": "extract_web_content",
    "input": {
        "urls": ["https://example.com", "https://another-example.com"],
        "max_concurrent": 3
    }
}
```

The tool will return the extracted text content from each web page, with hyperlinks preserved in markdown format.

## Dependencies and Setup

### Required Packages

- **Core:** fastapi, uvicorn, anthropic, python-dotenv, pydantic
- **Web Tools:** duckduckgo-search, playwright, html5lib, asyncio

Install all dependencies:
```bash
pip install -r claude-tooling/requirements.txt
```

### Playwright Setup

For web content extraction, you'll need to initialize Playwright:

```bash
# Install Playwright browser binaries after installing dependencies
playwright install chromium

# You can also install all browsers
# playwright install
```

Playwright is used to render JavaScript-heavy web pages for content extraction. The first time you run the web content extraction tool, it may take a moment to download the browser binaries if they're not already installed.

## AI Assistant Configuration

This project uses `.cursorrules` to configure the AI assistant. The assistant can:
- Help with coding tasks
- Verify screenshots
- Perform web searches
- Analyze images and code

## GitHub Workflows

This project uses GitHub Actions to automatically run tests on Pull Requests and after merges to the main branch.

### CI Workflow

The continuous integration workflow runs all unit tests to ensure code quality:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f claude-tooling/requirements.txt ]; then pip install -r claude-tooling/requirements.txt; fi
          playwright install chromium
      - name: Run tests
        run: |
          python -m unittest discover claude-tooling/tests
```

To implement this workflow:

1. Create the `.github/workflows` directory in your repository
2. Add the `ci.yml` file with the content above
3. Commit and push to your repository

The workflow will automatically run tests when:
- A new PR is created or updated
- Code is merged into the main/master branch

You can view workflow results in the "Actions" tab of your GitHub repository.

## License

MIT License