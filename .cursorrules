# Instructions

During your interaction with the user, if you find anything reusable in this project (e.g. version of a library, model name), especially about a fix to a mistake you made or a correction you received, you should take note in the `Lessons` section in the `.cursorrules` file so you will not make the same mistake again. 

You should also use the `.cursorrules` file as a Scratchpad to organize your thoughts. Especially when you receive a new task, you should first review the content of the Scratchpad, clear old different task if necessary, first explain the task, and plan the steps you need to take to complete the task. You can use todo markers to indicate the progress, e.g.
[X] Task 1
[ ] Task 2

Also update the progress of the task in the Scratchpad when you finish a subtask.
Especially when you finished a milestone, it will help to improve your depth of task accomplishment to use the Scratchpad to reflect and plan.
The goal is to help you maintain a big picture as well as the progress of the task. Always refer to the Scratchpad when you plan the next step.

# Lessons

## User Specified Lessons

- You have a python3 venv in ./venv. Use it.
- Include info useful for debugging in the program output.
- Read the file before you try to edit it.
- Due to Cursor's limit, when you use `git` and `gh` and need to submit a multiline commit message, first write the message in a file, and then use `git commit -F <filename>` or similar command to commit. And then remove the file. Include "[Cursor] " in the commit message and PR title.

## Cursor learned

- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
- Use 'gpt-4o' as the model name for OpenAI's GPT-4 with vision capabilities
- When using Anthropic API tool calling:
  - Tool results should be formatted with `tool_use_id` (not `tool_call_id`) and `content` (not `output`)
  - Tool results should be included as content blocks in a user message, not as a separate `tool_outputs` parameter
  - Assistant messages containing `tool_use` blocks must be followed by user messages with matching `tool_result` blocks
  - Preserve the complete response structure in conversation history, not just the extracted text
- In JavaScript class implementations, avoid using method names as property names to prevent naming conflicts. For example, don't use `this.isAutoExecutingTools = false` when you have a method called `isAutoExecutingTools()`. Use a different property name like `this.autoExecutingTools` instead.
- When rendering chat messages:
  - Use `innerHTML` instead of `textContent` when you want to render Markdown or HTML content 
  - Track processed message IDs to avoid duplicating messages during polling operations
  - Include proper handling of image elements in Markdown (error handling, responsive design)
  - To prevent message duplication, especially for the first message, track both message IDs and content:
    - Maintain a set of processed message content (`processedTextContent`) in addition to message IDs
    - Check this set before displaying any message to avoid duplicates
    - Update message processing functions across modules consistently (ensure main.js and tools.js agree on who displays messages)
  - For proper line break handling in messages:
    - Configure Marked library with `breaks: true` to convert line breaks to `<br>` tags
    - Check for both spaces and newlines when concatenating message chunks to avoid adding unnecessary spaces
    - Clean up consecutive line breaks by replacing 3+ consecutive line breaks with just 2
    - Extract line break processing into a reusable function across the codebase
    - Ensure consistent line break handling between the tools.js and ui.js modules

# Scratchpad

## Current Task: Rewrite frontend code in modular structure

Files to update:
[X] config.js - Configuration values and constants
[X] state.js - State management using StateManager class
[X] api.js - API interaction layer
[X] utils.js - Utility functions
[X] filePreview.js - File preview functionality
[X] tools.js - Tool handling and auto-execution
[X] events.js - Event handling and DOM interactions
[X] main.js - Main application logic and initialization

Progress:
- Completed implementation of config.js with all configuration values
- Implemented state.js with StateManager class for application state
- Created api.js with all API interaction functions
- Added utils.js with helper functions
- Implemented filePreview.js for handling file previews
- Completed tools.js with tool handling and auto-execution logic
- Implemented events.js with event listeners and handlers
- Created main.js to initialize and coordinate all modules

✅ Task completed! The frontend code has been successfully rewritten into a modular structure while maintaining the same functionality. Each module has clear responsibilities:

- config.js: Centralized configuration and constants
- state.js: Application state management
- api.js: API communication layer
- utils.js: Reusable utility functions
- filePreview.js: File preview functionality
- tools.js: Tool handling and auto-execution
- events.js: Event handling and DOM interactions
- main.js: Application initialization and coordination

The code is now more maintainable, testable, and follows better separation of concerns.