# Frontend Documentation

## Project Structure

```
frontend/
├── css/                 # Style files
│   └── styles.css      # Main style file
├── js/                  # JavaScript source code
│   ├── modules/         # Modular components
│   │   ├── api.js      # API communication layer
│   │   ├── config.js   # Configuration constants
│   │   ├── events.js   # Event handling
│   │   ├── filePreview.js # File preview
│   │   ├── state.js    # State management
│   │   ├── tools.js    # Tool call handling
│   │   ├── ui.js       # UI rendering
│   │   └── utils.js    # Utility functions
│   └── main.js         # Application entry
├── node_modules/        # Dependencies
├── index.html          # Main page
├── package.json        # Project configuration
└── README.md           # Documentation
```

## Technology Stack

### 1. Core Dependencies
```json
{
  "type": "module",          // Using ES Modules
  "devDependencies": {
    "@babel/core": "^7.22.5",      // Babel core
    "@babel/preset-env": "^7.22.5", // Babel preset
    "jest": "^29.7.0",             // Testing framework
    "jest-environment-jsdom": "^29.7.0"  // DOM testing environment
  }
}
```

### 2. External Libraries
- Bootstrap 5.3.2 (UI framework)
- Font Awesome 6.4.0 (Icons)
- Highlight.js 11.7.0 (Code highlighting)

### 3. Style System
```css
:root {
  --primary-color: #4f46e5;    // Main color
  --bg-color: #f9fafb;         // Background color
  --card-bg: #ffffff;          // Card background
  --text-color: #1f2937;       // Text color
  // ... other theme variables
}
```

## Page Structure

### 1. Layout Components

**Tools Sidebar:**
```html
<div class="tools-container">
  <div class="tools-header">
    <h3><i class="fas fa-toolbox"></i>Available Tools</h3>
  </div>
  <ul id="tools-group" class="list-group tools-list"></ul>
</div>
```

**Chat Main Area:**
```html
<div class="chat-container">
  <div class="chat-header">...</div>
  <div id="chat-messages" class="chat-messages"></div>
  <div class="input-area">...</div>
</div>
```

**Settings Panel:**
```html
<div class="settings-panel">
  <!-- Temperature control -->
  <!-- Maximum token count -->
  <!-- Thinking mode setting -->
  <!-- Auto execution switch -->
</div>
```

### 2. Interactive Components

**Message Input:**
```html
<form id="chat-form">
  <textarea id="user-input"></textarea>
  <button type="submit" id="send-button">
    <i class="fas fa-paper-plane"></i>
  </button>
</form>
```

**Tool Result Modal:**
```html
<div class="modal" id="toolResultModal">
  <div class="modal-dialog">
    <div class="modal-content">
      <!-- Tool result input and submission -->
    </div>
  </div>
</div>
```

## Style Implementation

### 1. Responsive Design
- Elastic layout system
- Mobile device adaptation
- Breakpoint management
- Container adaptation

### 2. Theme System
- CSS variable definition
- Color system
- Space specification
- Shadow effect

### 3. Animation Effect
- Message fade-in
- State transition
- Loading animation
- Interactive feedback

### 4. Accessibility
- ARIA tag support
- Keyboard navigation
- Focus management
- Screen reader compatibility

## Core Function Implementation

### 1. State Management (state.js)

Using singleton pattern state manager:

**State Content:**
- Conversation history (messages)
- Tool call status (currentToolUseId, waitingForToolResult)
- Auto execution status (autoExecutingTools, pollingInterval)
- Settings (settings)
- Message deduplication tracking (processedMessageIds, processedTextContent)

**Key Methods:**
```javascript
state.reset()                    // Reset all states
state.addMessage(message)        // Add message to history
state.updateSetting(key, value)  // Update setting
state.hasProcessedMessage(id)    // Check if message has been processed
state.hasProcessedContent(text)  // Check if content has been processed
```

### 2. Tool Call Handling (tools.js)

Tool call lifecycle management:

**Core Functionality:**
- Message content parsing and tool call recognition
- Auto execution mode support
- Polling update mechanism
- Tool result processing and display
- Enhanced tool completion detection
- Automatic management of auto-execution indicator

**Key Flow:**
```javascript
processAssistantMessage(content)  // Process assistant message
startPollingForUpdates()         // Start polling update
updateChatWithNewMessages(msgs)   // Process new message update with tool result tracking
```

**Tool Result Tracking:**
```javascript
// Example of improved tool result tracking
function updateChatWithNewMessages(newMessages) {
  // Track if tool results exist in the current update
  let hasToolResults = false;
  
  // Process messages
  for (const message of newMessages) {
    // Look for tool results in user messages
    if (message.role === ROLES.USER && message.content) {
      for (const item of message.content) {
        if (item.type === MESSAGE_TYPES.TOOL_RESULT) {
          hasToolResults = true;
          // Process tool result
        }
      }
    }
  }
  
  // Update auto-execution indicator based on combined state
  if (hasToolResults && !hasNewToolCalls && !state.getCurrentToolUseId()) {
    // No more active tools, turn off indicator
    state.setAutoExecutingTools(false);
    ui.setAutoExecutionIndicator(false);
  }
}
```

### 3. UI Rendering (ui.js)

Interface rendering and interaction processing:

**DOM Element Cache:**
```javascript
const elements = {
  chatMessages: null,
  userInput: null,
  sendButton: null,
  // ... other UI elements
}
```

**Core Functionality:**
- Plain text rendering with HTML escaping
- Line break preservation
- Message deduplication display
- Loading status management
- Tool result modal
- Auto-execution indicator management

**Key Methods:**
```javascript
initializeUI()                   // Initialize UI elements
addMessageToChat(role, content)  // Add message to chat
setLoading(isLoading)           // Set loading status
setAutoExecutionIndicator(visible) // Set auto execution indicator
```

### 4. Main Program (main.js)

Application initialization and module integration:

**Initialization Flow:**
1. Initialize after DOM load is complete
2. Initialize UI components
3. Set event listeners
4. Reset state
5. Get and initialize available tools
6. Display welcome message

**Module Coordination:**
- Centralized initialization
- Clear dependency ordering
- Cross-module event coordination
- Error propagation management

**Test Support:**
- Provide test environment compatibility
- Export module interface for test use

### 5. API Communication Layer (api.js)

API implementation for communication with backend:

**Core Interface:**
```javascript
fetchAvailableTools()            // Get available tool list
sendMessage(msgs, settings, id)  // Send chat message
submitToolResult(id, result)     // Submit tool execution result
getConversationUpdates(id)       // Get conversation update
```

**Error Handling Mechanism:**
- HTTP status code verification
- Request error capture and logging
- Response data verification
- Session ID management

**Message Processing:**
- Message array verification and filtering
- Empty content filtering
- Debug log recording
- Error information formatting

### 6. Event Handling (events.js)

User interaction and event management:

**Event Listeners:**
```javascript
initializeEventListeners()      // Initialize all event listeners
handleChatSubmit(event)        // Process chat submission
handleSettingsSubmit(event)    // Process setting submission
handleToolExecution(event)     // Process tool execution
```

**Interactive Functionality:**
- Form submission processing
- Keyboard shortcut (Enter send)
- Settings panel switching
- Tool call folding/expanding

**State Synchronization:**
- Form disable status
- Loading indicator
- Setting verification
- Error prompt

### 7. Configuration Management (config.js)

System configuration and constant definition:

**API Configuration:**
```javascript
const API_URL = (() => {
  // Dynamic API endpoint detection
  if (window.API_BASE_URL) return window.API_BASE_URL;
  if (window.location.pathname.startsWith('/frontend/')) {
    return window.location.origin;
  }
  return '';
})();
```

**System Constants:**
```javascript
const POLLING_INTERVAL = 5000;  // Polling interval (milliseconds)
const DEFAULT_SETTINGS = {      // Default settings
  temperature: 0.5,
  maxTokens: 4000,
  thinkingMode: true,
  thinkingBudget: 2000,
  autoExecuteTools: true
};
```

**UI Constants:**
- Message type definition
- Role type definition
- File preview configuration
- CSS class name mapping

### 8. File Preview (filePreview.js)

File preview functionality implementation:

**Preview Type:**
```javascript
// Supported file types
const SUPPORTED_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
  MARKDOWN: ['md', 'markdown'],
  HTML: ['html', 'htm'],
  CODE: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'cs', 'go', 'rs'],
  STYLE: ['css', 'scss', 'less']
};
```

**Core Functionality:**
- Plain text file preview with line breaks
- HTML file safe preview
- Image file preview and zoom
- Code file highlighting (limited)
- Automatic display of tool-generated files

**Security Mechanism:**
- HTML sandbox isolation
- Link security attributes
- HTML content escaping
- Error boundary handling

### 9. Utility Functions (utils.js)

General purpose function set:

**String Processing:**
```javascript
escapeHtml(text)              // HTML special character escaping
cleanLineBreaks(text)         // Clean up extra line breaks
getFileName(path)             // Get file name
getFileExtension(filename)    // Get file extension
```

**JSON Processing:**
```javascript
safeJsonParse(str, default)   // Safe JSON parsing
safeJsonStringify(val, indent) // Safe JSON stringification
deepClone(obj)                // Deep clone object
```

**Performance Optimization:**
```javascript
debounce(func, wait)          // Function debounce
throttle(func, limit)         // Function throttle
```

**File Processing:**
```javascript
getFileType(filename)         // Get file type
getFileIcon(filename)         // Get file icon
```

## Behavior Guarantee

### 1. Message Processing
- Message deduplication (ID and content double check)
- Text content escaping for security
- Line break preservation
- Message type verification

### 2. Tool Call
- Tool call status synchronization
- Auto execution status management
- Polling update error handling
- Result display verification
- Reliable tool completion detection
- Accurate auto-execution indicator state

### 3. UI Rendering
- DOM element cache optimization
- Loading status management
- Dynamic content rendering
- Error boundary handling

### 4. State Management
- State update atomicity
- State access control
- Setting verification
- History record maintenance

### 5. API Communication
- Request error retry
- Response data verification
- Session status maintenance
- Debug log recording

### 6. Event Handling
- Form status synchronization
- User input verification
- Keyboard event handling
- Error feedback mechanism

### 7. Configuration Management
- Environment adaptation
- Type definition
- Constant maintenance
- Style mapping

### 8. File Preview
- Preview security isolation
- Rendering performance optimization
- File type validation
- Error handling mechanism
- Automatic detection and display of generated files

### 9. Utility Functions
- Function purity guarantee
- Error boundary handling
- Performance optimization support
- Type safety guarantee

## Development Guide

### 1. Adding New Tools
1. Add tool configuration in config.js
2. Implement tool handling logic in tools.js
3. Add corresponding UI components in ui.js
4. Update state management related code

### 2. Modifying Message Processing
1. Handle new message types in processAssistantMessage in tools.js
2. Add new rendering logic in ui.js
3. Update state tracking mechanism

### 3. Customizing UI Components
1. Add new elements in the elements object
2. Initialize in initializeUI
3. Implement corresponding handling methods
4. Add necessary state management code

### 4. Enhancing Tool Execution
1. Update tool result tracking in updateChatWithNewMessages in tools.js
2. Modify auto-execution indicator management in ui.js
3. Add appropriate state tracking in state.js

## Testing Points

### 1. State Management Testing
- State update correctness
- Message deduplication mechanism
- Settings validation
- State reset functionality

### 2. Tool Call Testing
- Tool call parsing
- Auto execution logic
- Polling update mechanism
- Result handling process
- Tool completion detection accuracy
- Auto-execution indicator state transitions

### 3. UI Rendering Testing
- Message rendering correctness
- Loading state switching
- Error handling mechanism
- Dynamic content updates
- Tool result display consistency

### 4. Integration Testing
- Module interactions
- State synchronization
- Error propagation
- Performance behavior
- Cross-module event handling 