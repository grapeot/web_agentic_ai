/**
 * UI Module - Handles DOM operations and interface rendering
 */
import * as config from './config.js';
import { state } from './state.js';
import * as utils from './utils.js';
import * as filePreview from './filePreview.js';
const ROLES = config.ROLES;
const TOOL_DISPLAY = config.TOOL_DISPLAY;
const MESSAGE_TYPES = config.MESSAGE_TYPES;

/**
 * DOM element cache
 * Populated during initialization to avoid repeated DOM queries
 */
const elements = {
  chatMessages: null,
  userInput: null,
  sendButton: null,
  temperatureSlider: null,
  tempValue: null,
  maxTokensSlider: null,
  tokensValue: null,
  thinkingModeSwitch: null,
  thinkingBudgetSlider: null,
  budgetValue: null,
  autoExecuteToolsSwitch: null,
  clearChatButton: null,
  responseSpinner: null,
  toolsSpinner: null,
  toolsGroup: null,
  toolResultModal: null,
  toolResult: null,
  submitToolResultButton: null,
  autoExecutionIndicator: null,
  cancelAutoExecutionButton: null
};

/**
 * Initialize UI element references
 */
function initializeUI() {
  // Cache DOM elements
  elements.chatMessages = document.getElementById('chat-messages');
  elements.userInput = document.getElementById('user-input');
  elements.sendButton = document.getElementById('send-button');
  elements.temperatureSlider = document.getElementById('temperature');
  elements.tempValue = document.getElementById('temp-value');
  elements.maxTokensSlider = document.getElementById('max-tokens');
  elements.tokensValue = document.getElementById('tokens-value');
  elements.thinkingModeSwitch = document.getElementById('thinking-mode');
  elements.thinkingBudgetSlider = document.getElementById('thinking-budget');
  elements.budgetValue = document.getElementById('budget-value');
  elements.autoExecuteToolsSwitch = document.getElementById('auto-execute-tools');
  elements.clearChatButton = document.getElementById('clear-chat');
  elements.responseSpinner = document.getElementById('response-spinner');
  elements.toolsSpinner = document.getElementById('tools-spinner');
  elements.toolsGroup = document.getElementById('tools-group');
  elements.toolResultModal = document.getElementById('toolResultModal');
  elements.toolResult = document.getElementById('toolResult');
  elements.submitToolResultButton = document.getElementById('submitToolResult');
  elements.autoExecutionIndicator = document.getElementById('auto-execution-indicator');
  elements.cancelAutoExecutionButton = document.getElementById('cancel-auto-execution');
}

/**
 * Get UI elements
 * @returns {Object} UI element references
 */
function getElements() {
  return elements;
}

/**
 * Set loading state
 * @param {boolean} isLoading - Whether to show loading state
 */
function setLoading(isLoading) {
  if (elements.responseSpinner) {
    elements.responseSpinner.style.display = isLoading ? 'block' : 'none';
  }
  if (elements.sendButton) {
    elements.sendButton.disabled = isLoading;
  }
}

/**
 * Set tools loading state
 * @param {boolean} isLoading - Whether to show tools loading state
 */
function setToolsLoading(isLoading) {
  if (elements.toolsSpinner) {
    elements.toolsSpinner.style.display = isLoading ? 'block' : 'none';
  }
}

/**
 * Set auto-execution indicator visibility
 * @param {boolean} visible - Whether the indicator should be visible
 * @param {string} status - Current execution status
 */
function setAutoExecutionIndicator(visible, status) {
  if (elements.autoExecutionIndicator) {
    elements.autoExecutionIndicator.style.display = visible ? 'block' : 'none';
    
    // Update the text content based on the state
    if (visible) {
      const label = elements.autoExecutionIndicator.querySelector('span#auto-execution-status');
      if (label) {
        if (status === "waiting_for_claude") {
          label.textContent = 'Waiting for Claude to respond...';
        } else if (status === "executing_tool") {
          label.textContent = 'Executing tool...';
        } else if (status === "in_progress") {
          label.textContent = 'Processing...';
        } else {
          label.textContent = 'Auto-executing tools...';
        }
      }
      
      // Show cancel button
      const cancelButton = elements.autoExecutionIndicator.querySelector('#cancel-auto-execution');
      if (cancelButton) {
        cancelButton.style.display = 'inline-block';
      }
    }
  }
}

/**
 * Update progress indicator with detailed progress information
 * @param {Object} progress - Progress information object
 */
function updateProgressIndicator(progress) {
  if (!progress) return;
  
  const statusElement = document.getElementById('auto-execution-status');
  if (!statusElement) return;
  
  // Update status message
  if (progress.message) {
    statusElement.textContent = progress.message;
    
    // Update status color based on status
    statusElement.className = 'status-indicator';
    if (progress.status === 'error') {
      statusElement.classList.add('error');
    } else if (progress.status === 'waiting_for_claude') {
      statusElement.classList.add('waiting');
    } else if (progress.status === 'executing_tool') {
      statusElement.classList.add('running');
    } else if (progress.status === 'paused') {
      statusElement.classList.add('paused');
    } else if (progress.status === 'completed') {
      statusElement.classList.add('completed');
    }
  }
  
  // Add progress bar if we have percentage and it's not complete or error
  if (progress.progress_pct !== undefined && 
      progress.status !== 'completed' && 
      progress.status !== 'error') {
    
    // Check if progress bar already exists
    let progressBar = document.getElementById('execution-progress-bar');
    if (!progressBar) {
      // Create progress bar container
      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-container';
      progressContainer.id = 'execution-progress-container';
      
      // Create progress bar
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.id = 'execution-progress-bar';
      
      // Append to container
      progressContainer.appendChild(progressBar);
      
      // Insert after status element
      statusElement.parentNode.insertBefore(progressContainer, statusElement.nextSibling);
    }
    
    // Update progress bar width
    progressBar.style.width = `${progress.progress_pct}%`;
  } else if (progress.status === 'completed' || progress.status === 'error') {
    // Remove progress bar if completed or error
    const progressContainer = document.getElementById('execution-progress-container');
    if (progressContainer) {
      progressContainer.remove();
    }
  }
}

/**
 * Show tool result modal
 */
function showToolResultModal() {
  if (elements.toolResultModal) {
    elements.toolResultModal.style.display = 'block';
  }
}

/**
 * Hide tool result modal
 */
function hideToolResultModal() {
  if (elements.toolResultModal) {
    elements.toolResultModal.style.display = 'none';
    if (elements.toolResult) {
      elements.toolResult.value = '';
    }
  }
}

/**
 * Clear chat interface
 */
function clearChat() {
  if (elements.chatMessages) {
    elements.chatMessages.innerHTML = '';
  }
  if (elements.userInput) {
    elements.userInput.value = '';
  }
}

/**
 * Add message to chat
 * @param {string} role - Message role (user/assistant)
 * @param {string|Object|Array} content - Message content
 * @param {string} type - Message type (text/thinking)
 */
function addMessageToChat(role, content, type) {
  console.log('Adding message type:', typeof content, role, content, type);
  
  // Skip only if type is explicitly set to THINKING
  if (type && type === MESSAGE_TYPES.THINKING) {
    console.log('Skipping thinking message');
    return;
  }

  const messageDiv = document.createElement('div');
  // Add correct role-specific class
  messageDiv.classList.add('message');
  if (role === config.ROLES.USER) {
    messageDiv.classList.add('user-message');
  } else if (role === config.ROLES.ASSISTANT) {
    messageDiv.classList.add('assistant-message');
  }
  
  // Extract the actual text content
  let textContent = '';
  if (typeof content === 'string') {
    textContent = content;
  } else if (content && typeof content === 'object') {
    if (Array.isArray(content)) {
      // Handle array of content blocks
      textContent = content
        .filter(block => block.type === 'text' && block.text)
        .map(block => block.text)
        .join('\n');
    } else if (content.type === 'text' && content.text) {
      // Handle single content object with type and text fields
      textContent = content.text;
    } else if (content.content) {
      // Handle object with direct content field
      textContent = content.content;
    } else if (content.text) {
      // Handle object with direct text field
      textContent = content.text;
    }
  }
  
  if (!textContent) {
    console.warn('No valid text content to display:', content);
    return;
  }
  
  // Skip if this exact message content was already processed
  if (state.hasProcessedContent(textContent.trim())) {
    console.log('Skipping already processed message:', textContent.substring(0, 50) + '...');
    return;
  }
  
  // Mark this content as processed to prevent duplicates
  state.addProcessedContent(textContent.trim());
  
  // Function to render markdown content
  const renderMarkdown = () => {
    try {
      // Simple plain text rendering - no markdown, escape HTML for security
      const safeText = escapeHtml(textContent).replace(/\n/g, '<br>');
      messageDiv.innerHTML = safeText;
      
      // We can't apply syntax highlighting anymore since we're escaping everything
    } catch (error) {
      console.error('Error parsing text:', error);
      // Fallback to plain text with line breaks
      messageDiv.innerHTML = escapeHtml(textContent).replace(/\n/g, '<br>');
    }
  };

  // Render content immediately
  renderMarkdown();
  
  // No need for delayed rendering since we're not using marked
  
  // Only append if we have content
  if (messageDiv.textContent || messageDiv.innerHTML) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
}

/**
 * Add thinking content to chat
 * @param {string} content - Thinking content
 */
function addThinkingToChat(content) {
  if (!content) return;
  
  const thinkingDiv = document.createElement('div');
  thinkingDiv.classList.add('thinking-section', 'collapsible');
  
  // Add toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.classList.add('thinking-toggle');
  toggleBtn.textContent = config.TOOL_DISPLAY.EXPAND;
  toggleBtn.onclick = () => {
    thinkingDiv.classList.toggle('collapsed');
    toggleBtn.textContent = thinkingDiv.classList.contains('collapsed') 
      ? config.TOOL_DISPLAY.EXPAND 
      : config.TOOL_DISPLAY.COLLAPSE;
  };
  
  // Add thinking content
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('thinking-content');
  contentDiv.innerHTML = escapeHtml(content).replace(/\n/g, '<br>'); // Plain text with line breaks, escaped
  
  thinkingDiv.appendChild(toggleBtn);
  thinkingDiv.appendChild(contentDiv);
  
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Start collapsed
  thinkingDiv.classList.add('collapsed');
}

/**
 * Add tool call to chat
 * @param {Object} toolCall - Tool call object
 */
function addToolCallToChat(toolCall) {
  if (!elements.chatMessages) return;
  
  console.log('Adding tool call to chat:', toolCall.name);
  
  // Create tool call element
  const toolCallDiv = document.createElement('div');
  toolCallDiv.className = 'tool-call';
  toolCallDiv.dataset.toolUseId = toolCall.id;
  
  // Format tool input as JSON
  const formattedInput = JSON.stringify(toolCall.input, null, 2);
  
  // Create tool call content with content initially collapsed
  const toolCallHtml = `
    <div class="tool-call-header">
      <span class="toggle-arrow">${TOOL_DISPLAY.EXPAND_ARROW}</span>
      <strong>${toolCall.name}</strong>
    </div>
    <div class="tool-content" style="display: none;">
      <div class="tool-section-label">Input:</div>
      <pre class="tool-input"><code class="language-json">${escapeHtml(formattedInput)}</code></pre>
    </div>
  `;
  
  toolCallDiv.innerHTML = toolCallHtml;
  elements.chatMessages.appendChild(toolCallDiv);
  
  // Apply syntax highlighting
  if (window.hljs) {
    toolCallDiv.querySelectorAll('pre code').forEach(block => {
      try {
        window.hljs.highlightBlock(block);
      } catch (e) {
        console.error('Error applying syntax highlighting:', e);
      }
    });
  }
  
  // Set up toggle functionality
  setupToolCallToggle(toolCallDiv);
  
  // Scroll to bottom
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  
  // Debug state object
  console.log('State object in addToolCallToChat:', state);
  
  // Show tool result modal if auto-execute is disabled
  try {
    if (typeof state.getSettings === 'function') {
      const settings = state.getSettings();
      if (!settings.autoExecuteTools) {
        state.setCurrentToolUseId(toolCall.id);
        state.setWaitingForToolResult(true);
        showToolResultModal();
      }
    } else {
      console.error('state.getSettings is not a function:', state);
      // Fallback behavior - always show tool result modal
      state.setCurrentToolUseId(toolCall.id);
      state.setWaitingForToolResult(true);
      showToolResultModal();
    }
  } catch (e) {
    console.error('Error getting settings:', e);
    // Fallback behavior - always show tool result modal
    if (typeof state.setCurrentToolUseId === 'function') {
      state.setCurrentToolUseId(toolCall.id);
    }
    if (typeof state.setWaitingForToolResult === 'function') {
      state.setWaitingForToolResult(true);
    }
    showToolResultModal();
  }
}

/**
 * Process and format file result for display
 * @param {Object} result - File result object
 * @param {boolean} isMultiple - Whether processing multiple files
 * @returns {string} Formatted HTML
 */
function processFileResults(result, isMultiple = false) {
  if (isMultiple && Array.isArray(result.files)) {
    // Multiple files display
    let filesHtml = `
      <div class="generated-files">
        <h4>Generated Files (${result.files.length})</h4>
        <ul class="files-list">
    `;
    
    result.files.forEach(file => {
      filesHtml += generateFileListItem(file);
    });
    
    filesHtml += `
        </ul>
        <div class="files-details-toggle">Details ${TOOL_DISPLAY.EXPAND_ARROW}</div>
        <div class="files-details" style="display:none;">
          <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
        </div>
      </div>
    `;
    
    return filesHtml;
  } else {
    // Single file display
    const file = isMultiple ? result.files[0] : result;
    return `
      <div class="file-result">
        <h4>${escapeHtml(file.name || 'Generated File')}</h4>
        ${generateFilePreview(file)}
        ${generateFileActions(file)}
        <div class="file-details-toggle">Details ${TOOL_DISPLAY.EXPAND_ARROW}</div>
        <div class="file-details" style="display:none;">
          <pre>${escapeHtml(JSON.stringify(file, null, 2))}</pre>
        </div>
      </div>
    `;
  }
}

/**
 * Generate preview section for a file
 * @param {Object} file - File object
 * @returns {string} Preview HTML
 */
function generateFilePreview(file) {
  const isImage = file.mime_type && file.mime_type.startsWith('image/');
  const isMarkdown = file.name && file.name.endsWith('.md');
  const isHtml = file.name && (file.name.endsWith('.html') || file.name.endsWith('.htm'));
  
  if (isImage && file.url) {
    return `<img src="${file.url}" alt="${escapeHtml(file.name)}" class="file-preview" />`;
  } else if (isMarkdown && file.url) {
    return `
      <div class="markdown-actions">
        <button class="view-markdown-btn" data-url="${file.url}">View Markdown</button>
      </div>
      <div class="markdown-preview" style="display:none;"></div>
    `;
  } else if (isHtml && file.url) {
    return `
      <div class="html-actions">
        <button class="view-html-btn" data-url="${file.url}">View HTML</button>
        <a href="${file.url}" target="_blank" class="open-html-link">Open in new tab</a>
      </div>
      <div class="html-preview" style="display:none;"></div>
    `;
  }
  return '';
}

/**
 * Generate actions section for a file
 * @param {Object} file - File object
 * @returns {string} Actions HTML
 */
function generateFileActions(file) {
  if (!file.url) return '';
  
  return `
    <div class="file-actions">
      <a href="${file.url}" download="${file.name}" class="download-link">Download File</a>
    </div>
  `;
}

/**
 * Generate list item for a file in multiple files view
 * @param {Object} file - File object
 * @returns {string} List item HTML
 */
function generateFileListItem(file) {
  const isMarkdown = file.name && file.name.endsWith('.md');
  const isHtml = file.name && (file.name.endsWith('.html') || file.name.endsWith('.htm'));
  
  let actionsHtml = '';
  if (isMarkdown && file.url) {
    actionsHtml += `<button class="view-markdown-btn" data-url="${file.url}">View</button>`;
  } else if (isHtml && file.url) {
    actionsHtml += `<button class="view-html-btn" data-url="${file.url}">View</button>`;
  }
  if (file.url) {
    actionsHtml += `<a href="${file.url}" download="${file.name}" class="download-link">Download</a>`;
  }
  
  return `
    <li class="file-item">
      <span class="file-name">${escapeHtml(file.name || 'Unnamed File')}</span>
      <div class="file-actions">${actionsHtml}</div>
    </li>
  `;
}

/**
 * Add tool result to chat
 * @param {Object|string} result - Tool result
 * @param {string} toolUseId - Tool use ID
 */
function addToolResultToChat(result, toolUseId) {
  console.log(`Adding tool result for ${toolUseId}:`, result);
  
  // Find the tool call div
  const toolCallDiv = document.querySelector(`[data-tool-use-id="${toolUseId}"]`);
  if (!toolCallDiv) {
    console.error(`Tool call div not found for ID: ${toolUseId}`);
    return;
  }
  
  // Parse the result if it's a string
  let resultObj = result;
  if (typeof result === 'string') {
    try {
      resultObj = JSON.parse(result);
    } catch (e) {
      console.warn('Error parsing tool result:', e);
      resultObj = { 
        status: 'error', 
        error: `Failed to parse result: ${e.message}`, 
        rawResult: result 
      };
    }
  }
  
  // Remove waiting status from tool call div
  toolCallDiv.classList.remove('waiting');
  
  // Get or create result container
  let resultContainer = toolCallDiv.querySelector('.tool-result-container');
  if (!resultContainer) {
    resultContainer = document.createElement('div');
    resultContainer.className = 'tool-result-container';
    toolCallDiv.appendChild(resultContainer);
  } else {
    // Clear existing result content
    resultContainer.innerHTML = '';
  }
  
  // Add result content
  const resultContent = document.createElement('div');
  resultContent.className = 'tool-result-content';
  
  // Process standard properties
  if (resultObj.status) {
    resultContent.innerHTML += generateStatusContent(resultObj);
  }
  
  // Standard result text display
  if (resultObj.stdout || resultObj.stderr || resultObj.output || resultObj.result || resultObj.response) {
    const output = resultObj.stdout || resultObj.output || resultObj.result || resultObj.response || '';
    const error = resultObj.stderr || resultObj.error || '';
    
    // Display stdout first if present
    if (output && output.trim() !== '') {
      const outputDiv = document.createElement('div');
      outputDiv.className = 'tool-output';
      
      const outputContent = document.createElement('pre');
      outputContent.className = 'output-content';
      outputContent.textContent = output;
      
      const outputLabel = document.createElement('div');
      outputLabel.className = 'tool-section-label';
      outputLabel.innerHTML = '<i class="fas fa-terminal"></i> Output';
      
      // Apply initial collapsed state if configured
      if (config.TOOL_DISPLAY.INITIAL_COLLAPSED) {
        outputContent.style.display = 'none';
        outputLabel.className += ' collapsed';
        outputLabel.innerHTML += ` <span class="toggle-arrow">${config.TOOL_DISPLAY.EXPAND_ARROW}</span>`;
        
        // Add click event to toggle visibility
        outputLabel.addEventListener('click', function() {
          const isCollapsed = outputContent.style.display === 'none';
          outputContent.style.display = isCollapsed ? 'block' : 'none';
          this.classList.toggle('collapsed');
          const arrow = this.querySelector('.toggle-arrow');
          if (arrow) {
            arrow.innerHTML = isCollapsed ? config.TOOL_DISPLAY.COLLAPSE_ARROW : config.TOOL_DISPLAY.EXPAND_ARROW;
          }
        });
      }
      
      outputDiv.appendChild(outputLabel);
      outputDiv.appendChild(outputContent);
      resultContent.appendChild(outputDiv);
    }
    
    // Display stderr if present
    if (error && error.trim() !== '') {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'tool-error';
      
      const errorContent = document.createElement('pre');
      errorContent.className = 'error-content';
      errorContent.textContent = error;
      
      const errorLabel = document.createElement('div');
      errorLabel.className = 'tool-section-label';
      errorLabel.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error/Warnings';
      
      // Apply initial collapsed state if configured
      if (config.TOOL_DISPLAY.INITIAL_COLLAPSED) {
        errorContent.style.display = 'none';
        errorLabel.className += ' collapsed';
        errorLabel.innerHTML += ` <span class="toggle-arrow">${config.TOOL_DISPLAY.EXPAND_ARROW}</span>`;
        
        // Add click event to toggle visibility
        errorLabel.addEventListener('click', function() {
          const isCollapsed = errorContent.style.display === 'none';
          errorContent.style.display = isCollapsed ? 'block' : 'none';
          this.classList.toggle('collapsed');
          const arrow = this.querySelector('.toggle-arrow');
          if (arrow) {
            arrow.innerHTML = isCollapsed ? config.TOOL_DISPLAY.COLLAPSE_ARROW : config.TOOL_DISPLAY.EXPAND_ARROW;
          }
        });
      }
      
      errorDiv.appendChild(errorLabel);
      errorDiv.appendChild(errorContent);
      resultContent.appendChild(errorDiv);
    }
  }
  
  // Check for and display generated files
  if (resultObj._hasGeneratedFiles && resultObj.generated_files) {
    const filesContainer = document.createElement('div');
    filesContainer.className = 'generated-files-container';
    
    // Use filePreview module to handle the files
    const filePreviewElement = filePreview.displayToolGeneratedFiles(resultObj, filesContainer);
    if (filePreviewElement) {
      resultContent.appendChild(filesContainer);
    }
  }
  
  // For file handling tools, display file content
  if (resultObj.files || resultObj.file_path || resultObj.file_url) {
    appendFileContent(resultContent, toolCallDiv, resultObj);
  }
  
  resultContainer.appendChild(resultContent);
  
  // Add to tool call div
  if (!toolCallDiv.contains(resultContainer)) {
    toolCallDiv.appendChild(resultContainer);
  }
  
  // Expand the tool call div if collapsed
  if (toolCallDiv.classList.contains('collapsed')) {
    toolCallDiv.classList.remove('collapsed');
    const toggle = toolCallDiv.querySelector('.toggle-arrow');
    if (toggle) {
      toggle.innerHTML = config.TOOL_DISPLAY.COLLAPSE_ARROW;
    }
  }
  
  // Scroll to the result
  toolCallDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Generate status content HTML
 * @param {Object} result - Result object
 * @returns {string} Status content HTML
 */
function generateStatusContent(result) {
  let content = `
    <div class="status-line ${result.status}">
      <strong>Status:</strong> ${escapeHtml(result.status)}
    </div>
    <div class="message-line">
      <strong>Message:</strong> ${escapeHtml(result.message)}
    </div>
  `;
  
  if (result.file_path) {
    content += `
      <div class="file-path-line">
        <strong>File:</strong> ${escapeHtml(result.file_path)}
      </div>
    `;
  }
  
  return content;
}

/**
 * Append file content to the result container
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement} toolCallDiv - Tool call element
 * @param {Object} result - Result object
 */
function appendFileContent(container, toolCallDiv, result) {
  try {
    const toolInput = toolCallDiv.querySelector('.tool-input code');
    if (!toolInput) return;
    
    const inputJson = JSON.parse(toolInput.textContent);
    if (!inputJson?.content) return;
    
    const fileContentDiv = document.createElement('div');
    fileContentDiv.className = 'file-content';
    
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    
    // Set language class based on file extension
    if (result.file_path) {
      const extension = result.file_path.split('.').pop().toLowerCase();
      const languageMap = {
        py: 'python',
        js: 'javascript',
        ts: 'typescript',
        jsx: 'javascript',
        tsx: 'typescript',
        html: 'html',
        css: 'css'
      };
      code.className = `language-${languageMap[extension] || extension}`;
    }
    
    code.textContent = inputJson.content;
    pre.appendChild(code);
    fileContentDiv.appendChild(pre);
    container.appendChild(fileContentDiv);
    
    try {
      hljs.highlightElement(code);
    } catch (err) {
      console.warn('Failed to highlight code:', err);
    }
  } catch (err) {
    console.warn('Failed to extract file content from tool input:', err);
  }
}

/**
 * Setup toggle functionality for tool call UI
 * @param {HTMLElement} toolCallDiv - Tool call element
 */
function setupToolCallToggle(toolCallDiv) {
  const header = toolCallDiv.querySelector('.tool-call-header');
  const content = toolCallDiv.querySelector('.tool-content');
  const toggle = toolCallDiv.querySelector('.toggle-arrow');
  
  if (header && content && toggle) {
    header.addEventListener('click', function() {
      const isCollapsed = content.style.display === 'none';
      content.style.display = isCollapsed ? 'block' : 'none';
      toggle.innerHTML = isCollapsed ? TOOL_DISPLAY.COLLAPSE_ARROW : TOOL_DISPLAY.EXPAND_ARROW;
    });
  }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message system-message error';
  errorDiv.textContent = message;
  
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  console.error('UI Error:', message);
}

/**
 * Render available tools
 * @param {Array} tools - Array of tool objects
 */
function renderTools(tools) {
  const toolsList = elements.toolsGroup;
  if (!toolsList) return;
  
  toolsList.innerHTML = '';
  
  tools.forEach(tool => {
    const li = document.createElement('li');
    li.className = 'tool-item';
    
    const nameElement = document.createElement('div');
    nameElement.className = 'tool-name';
    nameElement.textContent = tool.name;
    
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'tool-description';
    descriptionElement.textContent = tool.description || 'No description';
    
    li.appendChild(nameElement);
    li.appendChild(descriptionElement);
    toolsList.appendChild(li);
  });
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.toString().replace(/[&<>"']/g, char => entities[char]);
}

/**
 * Fetch and display markdown content
 * @param {string} url - URL to fetch markdown from
 * @param {HTMLElement} container - Container to display markdown in
 */
function fetchAndDisplayMarkdown(url, container) {
  fetch(url)
    .then(response => response.text())
    .then(markdown => {
      try {
        // Display as plain text with line breaks, escape HTML for security
        container.innerHTML = escapeHtml(markdown).replace(/\n/g, '<br>');
      } catch (err) {
        console.error('Error rendering content:', err);
        container.textContent = markdown; // Use textContent for safety
      }
    })
    .catch(err => {
      console.error('Error fetching content:', err);
      container.textContent = 'Error loading content';
    });
}

/**
 * Display HTML preview
 * @param {string} url - URL to fetch HTML from
 * @param {HTMLElement} container - Container to display HTML in
 */
function displayHtmlPreview(url, container) {
  fetch(url)
    .then(response => response.text())
    .then(html => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '400px';
        iframe.style.border = '1px solid #ddd';
        container.innerHTML = '';
        container.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
      } catch (err) {
        console.error('Error displaying HTML:', err);
        container.textContent = 'Error displaying HTML content';
      }
    })
    .catch(err => {
      console.error('Error fetching HTML:', err);
      container.textContent = 'Error loading HTML content';
    });
}

export {
  initializeUI,
  getElements,
  setLoading,
  setToolsLoading,
  setAutoExecutionIndicator,
  showToolResultModal,
  hideToolResultModal,
  clearChat,
  addMessageToChat,
  addThinkingToChat,
  addToolCallToChat,
  addToolResultToChat,
  fetchAndDisplayMarkdown,
  displayHtmlPreview,
  renderTools,
  escapeHtml,
  setupToolCallToggle,
  showError
};