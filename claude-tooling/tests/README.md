# Testing Strategy for Claude Tooling API

This document outlines the testing strategy for the Claude Tooling API, particularly focusing on how tests support refactoring the large app.py file into smaller, more maintainable modules.

## Test Structure

The testing suite is organized into multiple specialized test files to cover different aspects of the API:

- **test_app_api.py**: Tests the API endpoints and basic functionality
- **test_auto_execute.py**: Specifically tests the automatic tool execution functionality
- **test_app_modularity.py**: Ensures functionality is preserved during refactoring
- **test_tools.py**: Tests the core tool functionality
- **test_web_tools.py**: Tests the web-based tool functionality

## Running Tests

We provide a test runner script to make it easy to run tests:

```bash
# Run all tests
python scripts/run_tests.py

# Run specific test groups
python scripts/run_tests.py --api            # Only API tests
python scripts/run_tests.py --auto-execute   # Only auto-execute tests
python scripts/run_tests.py --modularity     # Only modularity tests

# Run with verbose output
python scripts/run_tests.py --verbose

# Run with coverage reporting
python scripts/run_tests.py --coverage
```

## Testing for Refactoring

The tests are designed to support refactoring the large `app/api/app.py` file into smaller, more maintainable modules. Here's how to use the tests during refactoring:

### 1. Before Refactoring

Run the full test suite to establish a baseline:

```bash
python scripts/run_tests.py --verbose
```

Run with coverage to identify untested code sections:

```bash
python scripts/run_tests.py --coverage
```

### 2. During Refactoring

After refactoring each module, run the relevant test group:

```bash
python scripts/run_tests.py --api       # For API related changes
python scripts/run_tests.py --auto-execute  # For tool execution changes
```

Update `test_app_modularity.py` as you refactor to match your new module structure.

### 3. After Refactoring

Run the full test suite to verify everything still works:

```bash
python scripts/run_tests.py --all --coverage
```

## Suggested Refactoring Approach

Based on analyzing the app.py file, we recommend splitting it into these modules:

1. **app/api/app.py**: Keep this as the main FastAPI application but much slimmer
2. **app/api/models.py**: Move all Pydantic models here
3. **app/api/conversations.py**: Move conversation management logic here
4. **app/api/tool_execution.py**: Move automatic tool execution code here
5. **app/api/file_management.py**: Move file handling code here
6. **app/api/claude_client.py**: Wrap Anthropic API interaction here

## Refactoring Process

1. Start by extracting the Pydantic models to models.py
2. Extract the file management functionality 
3. Extract the conversation management code
4. Extract the tool execution code
5. Update imports in app.py to use these new modules
6. Run tests after each step to verify functionality

This approach allows for incremental refactoring with continuous verification of functionality, minimizing the risk of breaking changes.

## Key Areas Covered by Tests

- **API Endpoints**: Verifies all API endpoints function correctly
- **Tool Execution**: Tests the automatic tool execution and handling
- **Conversation Management**: Tests conversation storage and retrieval
- **Error Handling**: Ensures errors are properly caught and reported
- **Module Cohesion**: Tests that refactored modules work together properly

## Test Mocking

The tests use mocking extensively to avoid actual API calls and external dependencies:

- **Anthropic Client**: Mocked to return predefined responses
- **Tool Execution**: Mocked to simulate tool execution without actually running tools
- **Conversation Storage**: Tested with in-memory mock storage

## Troubleshooting Tests

If tests are failing during refactoring:

1. Check import paths in both the application code and test code
2. Verify that global state (e.g., `conversations`, `auto_execute_tasks`) is still accessible
3. Ensure that function signatures haven't changed
4. Check that the API routes are still registered correctly
5. Review test mocks to ensure they're still valid after refactoring

## Adding New Tests

When adding new functionality, follow these guidelines for test creation:

1. Add unit tests for individual components
2. Add integration tests for feature interactions
3. Update modularity tests to verify new components work with existing ones
4. Ensure test coverage for error cases and edge conditions 