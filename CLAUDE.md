# CLAUDE.md - Agentic AI Web Interface Guide

## Commands
- **Run App**: `python claude-tooling/run.py` (basic mode), `python claude-tooling/run.py --workers 4` (multi-worker)
- **Tests**: `python claude-tooling/scripts/run_tests.py` (all tests)
- **Single Test Group**: `python claude-tooling/scripts/run_tests.py --api` (options: --api, --auto-execute, --modularity)
- **Coverage**: `python claude-tooling/scripts/run_tests.py --coverage`
- **Dependencies**: `pip install -r claude-tooling/requirements.txt`

## Documentation
- **Frontend Documentation**: See [claude-tooling/app/frontend/README.md](claude-tooling/app/frontend/README.md)
- **Backend Documentation**: See [claude-tooling/app/README.md](claude-tooling/app/README.md)
- **Testing Documentation**: See [claude-tooling/tests/README.md](claude-tooling/tests/README.md)

## Code Style Guidelines
- **Python**: Use Python 3.9+ with type annotations
- **JS Frontend**: Modular architecture with separation of concerns (state.js, api.js, tools.js, ui.js, etc.)
- **Naming**: camelCase for JS, snake_case for Python
- **Modules**: Keep code modular with single responsibility principle
- **Error Handling**: Provide detailed error messages in logs, clean user-facing errors
- **Documentation**: Update README.md when adding features
- **Tools**: Use tools in Anthropic API with proper ID tracking
- **State Management**: Use StateManager singleton in frontend for centralized state

## Frontend Architecture
- **state.js**: Centralized state using singleton pattern (messages, tool status, settings)
- **api.js**: Backend communication (sendMessage, fetchTools, getUpdates)
- **tools.js**: Tool call processing and auto-execution logic
- **ui.js**: DOM rendering and interface management
- **events.js**: User interaction and event handling
- **config.js**: System constants and configuration values
- **filePreview.js**: File preview functionality for generated files

## Agent Rules
- Track progress in Scratchpad sections for complex tasks
- Note lessons learned from mistakes
- Use the Python venv in ./venv
- Include debugging info in output
- Read files before editing