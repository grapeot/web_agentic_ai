# Frontend Documentation

## Overview

The frontend implements a chat interface with support for:
- Text messages
- Tool calls and results
- File previews
- Markdown/HTML rendering
- Auto-execution of tools
- Real-time updates via polling

## Message Rendering Logic

### Message Types

1. **Text Messages**
   - User messages: Simple text with Markdown support
   - Assistant messages: Text with Markdown support
   - Thinking process: Special format showing Claude's thinking

2. **Tool Calls**
   - Collapsible sections with:
     - Header showing tool name
     - Input parameters in JSON format
     - Result container for tool output
   - Toggle functionality for expanding/collapsing

3. **Tool Results**
   - Can be standalone or attached to tool calls
   - Special handling for different result types:
     - File results (images, markdown, html)
     - Command outputs
     - JSON data
     - Generated files

### Rendering Flow

1. **Message Addition**
   ```javascript
   addMessageToChat(role, content)
   ```
   - Creates message container with appropriate class
   - Processes content through Markdown parser
   - Applies syntax highlighting to code blocks
   - Handles image loading and zoom functionality

2. **Tool Call Addition**
   ```javascript
   addToolCallToChat(toolCall)
   ```
   - Creates collapsible tool call container
   - Formats input parameters as JSON
   - Prepares result container
   - Sets up event listeners for toggling

3. **Tool Result Addition**
   ```javascript
   addToolResultToChat(result, toolUseId)
   ```
   - Finds matching tool call container
   - Processes result based on type:
     - File results: Preview + download options
     - Command output: Formatted display
     - JSON data: Pretty printed
   - Adds interactive elements (preview buttons, toggles)

## File Handling

### Supported File Types

1. **Images**
   - Direct inline display
   - Click to zoom
   - Download option

2. **Markdown**
   - Preview button
   - Rendered view with syntax highlighting
   - Close/expand options

3. **HTML**
   - Preview in sandbox iframe
   - Open in new tab option
   - Security restrictions applied

### File Result Structure

```javascript
{
  status: "success",
  file_path: string,
  file_url: string,
  render_type: "image" | "markdown" | "html",
  view_url?: string
}
```

## Real-time Updates

### Polling Mechanism

1. **Initialization**
   - Starts when auto-execute is enabled
   - 5-second interval checks

2. **Update Process**
   - Fetches new messages
   - Tracks displayed content to prevent duplicates
   - Updates UI progressively

3. **State Management**
   - Maintains conversation history
   - Tracks tool calls and results
   - Manages auto-execution state

## UI Components

### Message Display
- Chat container with scrolling
- Message bubbles with role-based styling
- Code block formatting
- Image handling

### Tool Interface
- Collapsible sections
- JSON formatting
- Result previews
- Interactive elements

### Control Elements
- Send button
- Temperature/token controls
- Auto-execute toggle
- Clear chat function

## Best Practices

1. **Error Handling**
   - Graceful fallbacks for parsing errors
   - Image load error handling
   - Network request error management

2. **Performance**
   - Lazy loading of previews
   - Efficient DOM updates
   - Debounced polling

3. **Security**
   - HTML sanitization
   - Sandboxed iframes
   - URL validation

4. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

## Event Handling

1. **User Interactions**
   - Message sending
   - Tool result submission
   - Preview toggling
   - File downloads

2. **System Events**
   - Auto-execution updates
   - Polling responses
   - Error conditions

## State Management

1. **Conversation State**
   - Message history
   - Current tool call
   - Auto-execution status

2. **UI State**
   - Loading indicators
   - Preview states
   - Collapse states

## Integration Points

1. **API Endpoints**
   - Chat messages
   - Tool results
   - File handling
   - Status updates

2. **External Libraries**
   - Marked (Markdown parsing)
   - Highlight.js (code highlighting)
   - Bootstrap (UI components) 