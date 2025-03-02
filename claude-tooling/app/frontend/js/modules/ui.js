/**
 * UI Module - Handles DOM operations and interface rendering
 */
import * as config from './config.js';
import { state } from './state.js';
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
 */
function setAutoExecutionIndicator(visible) {
  if (elements.autoExecutionIndicator) {
    elements.autoExecutionIndicator.style.display = visible ? 'block' : 'none';
    
    // Update the text content based on the state
    if (visible) {
      const label = elements.autoExecutionIndicator.querySelector('span');
      if (label) {
        label.textContent = 'Auto-executing tool...';
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
 * Add message to chat interface
 * @param {string} role - Message role
 * @param {string|Object} content - Message content
 */
function addMessageToChat(role, content) {
  if (!elements.chatMessages) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  // Debug the content type
  console.log('Adding message type:', typeof content, role, content);
  
  try {
    let processedContent = '';
    
    // Object handling
    if (content && typeof content === 'object') {
      // Debug log for object content
      console.log('Processing object content:', content);
      
      // Handle text property if present (direct access)
      if (content.text && typeof content.text === 'string') {
        console.log('Rendering text property:', content.text);
        processedContent = content.text;
      }
      // Handle structured text object
      else if (content.type === MESSAGE_TYPES.TEXT && typeof content.text === 'string') {
        console.log('Rendering text content:', content.text);
        processedContent = content.text;
      } 
      // Handle content property if present
      else if (content.content && typeof content.content === 'string') {
        console.log('Rendering content property:', content.content);
        processedContent = content.content;
      }
      // Handle tool results with status and message
      else if (content.status && content.message) {
        console.log('Rendering tool result with status and message');
        processedContent = `Status: ${content.status}\nMessage: ${content.message}`;
        
        // Add file path if available
        if (content.file_path) {
          processedContent += `\nFile path: ${content.file_path}`;
        }
      }
      // Last resort: stringify the entire object
      else {
        console.log('Rendering stringified object');
        try {
          // Try to parse JSON first in case it's a stringified JSON
          if (typeof content === 'string') {
            const parsedContent = JSON.parse(content);
            processedContent = JSON.stringify(parsedContent, null, 2);
          } else {
            processedContent = JSON.stringify(content, null, 2);
          }
        } catch (e) {
          // If JSON parsing fails, use string representation
          processedContent = String(content);
        }
      }
    } 
    // String handling
    else if (typeof content === 'string') {
      processedContent = content;
    }
    else {
      // Fallback for null/undefined or other types
      processedContent = '<em>(No content)</em>';
    }
    
    // Check if content contains Markdown
    const hasMarkdown = /[*_`#\[\]\\]/.test(processedContent);
    
    if (hasMarkdown) {
      // Apply Markdown parsing with fallback for errors
      try {
        if (processedContent && processedContent.trim()) {
          messageDiv.innerHTML = marked.parse(processedContent);
        } else {
          messageDiv.innerHTML = '<em>(Empty content)</em>';
        }
      } catch (markdownError) {
        console.warn('Markdown parsing failed:', markdownError);
        // Fallback to plain text with manual line break handling
        messageDiv.textContent = processedContent;
      }
      
      // Apply syntax highlighting to code blocks
      messageDiv.querySelectorAll('pre code').forEach((block) => {
        try {
          hljs.highlightElement(block);
        } catch (err) {
          console.warn('Failed to highlight code block:', err);
        }
      });
      
      // Ensure image links display correctly
      messageDiv.querySelectorAll('img').forEach(img => {
        // Add loading events and error handling
        img.onerror = () => {
          console.error(`Failed to load image: ${img.src}`);
          img.alt = 'Image failed to load';
          img.classList.add('image-load-error');
        };
        
        // Add click event for image zoom effect
        img.onclick = () => {
          img.classList.toggle('expanded');
        };
      });
    } else {
      // For plain text, use textContent and handle line breaks
      messageDiv.textContent = processedContent;
    }
  } catch (error) {
    console.error('Error rendering message content:', error);
    // Emergency fallback - just display the string representation safely
    messageDiv.textContent = String(content);
  }
  
  elements.chatMessages.appendChild(messageDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * Add thinking content to chat interface
 * @param {string} thinking - Thinking content
 */
function addThinkingToChat(thinking) {
  if (!elements.chatMessages) return;
  
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = `message ${ROLES.THINKING}-message`;
  thinkingDiv.innerHTML = `<div class="thinking-label">Thinking Process:</div>
                          <pre class="thinking-content">${escapeHtml(thinking)}</pre>`;
  
  elements.chatMessages.appendChild(thinkingDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
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
 * @param {Object|string} result - Result object or string
 * @param {string} toolUseId - Tool use ID
 */
function addToolResultToChat(result, toolUseId) {
  if (!elements.chatMessages) return;
  
  console.log('Adding tool result:', typeof result, result, 'for tool ID:', toolUseId);
  
  const toolCallDiv = document.querySelector(`.tool-call[data-tool-use-id="${toolUseId}"]`);
  if (!toolCallDiv || toolCallDiv.querySelector('.tool-result')) {
    console.warn(`Tool call not found or result already displayed for ${toolUseId}`);
    return;
  }
  
  const resultDiv = document.createElement('div');
  resultDiv.className = 'tool-result';
  
  // Create header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'result-header';
  headerDiv.innerHTML = `
    <span class="result-toggle">${TOOL_DISPLAY.EXPAND_ARROW}</span>
    <strong>Tool Result</strong>
  `;
  resultDiv.appendChild(headerDiv);
  
  // Create content container
  const contentDiv = document.createElement('div');
  contentDiv.className = 'result-content';
  contentDiv.style.display = 'none';
  resultDiv.appendChild(contentDiv);
  
  try {
    // Parse result if needed
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    
    if (typeof parsedResult === 'object' && parsedResult !== null) {
      if (parsedResult.status === 'success' && parsedResult.message) {
        // Handle successful operation result
        const statusContent = document.createElement('div');
        statusContent.className = 'tool-result-status';
        statusContent.innerHTML = generateStatusContent(parsedResult);
        contentDiv.appendChild(statusContent);
        
        // For save_file tool, also show the file content
        if (parsedResult.message.includes('File saved')) {
          appendFileContent(contentDiv, toolCallDiv, parsedResult);
        }
      } else if (parsedResult.files) {
        // Handle file results
        contentDiv.innerHTML = processFileResults(parsedResult, Array.isArray(parsedResult.files));
      } else {
        // Handle other object results
        const pre = document.createElement('pre');
        pre.className = 'result-json';
        pre.textContent = JSON.stringify(parsedResult, null, 2);
        contentDiv.appendChild(pre);
      }
    } else {
      // Handle primitive values
      const textDiv = document.createElement('div');
      textDiv.className = 'result-text';
      textDiv.textContent = String(parsedResult);
      contentDiv.appendChild(textDiv);
    }
  } catch (e) {
    console.error('Error processing tool result:', e);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    contentDiv.appendChild(errorDiv);
  }
  
  // Add toggle functionality
  headerDiv.addEventListener('click', () => {
    const isCollapsed = contentDiv.style.display === 'none';
    contentDiv.style.display = isCollapsed ? 'block' : 'none';
    headerDiv.querySelector('.result-toggle').innerHTML = 
      isCollapsed ? TOOL_DISPLAY.COLLAPSE_ARROW : TOOL_DISPLAY.EXPAND_ARROW;
  });
  
  toolCallDiv.appendChild(resultDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
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
        ts: 'javascript',
        jsx: 'javascript',
        tsx: 'javascript',
        html: 'html',
        htm: 'html',
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
 * Render available tools
 * @param {Array} tools - Array of tool objects
 */
function renderTools(tools) {
    const toolsList = elements.toolsGroup;
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
        container.innerHTML = marked.parse(markdown);
        // Apply syntax highlighting to code blocks
        container.querySelectorAll('pre code').forEach(block => {
          hljs.highlightElement(block);
        });
      } catch (err) {
        console.error('Error rendering markdown:', err);
        container.textContent = markdown;
      }
    })
    .catch(err => {
      console.error('Error fetching markdown:', err);
      container.textContent = 'Error loading markdown content';
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
        // Create a sandbox iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '400px';
        iframe.style.border = '1px solid #ddd';
        container.innerHTML = '';
        container.appendChild(iframe);
        
        // Write the HTML to the iframe
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

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message system-message error';
  errorDiv.textContent = message;
  
  // Add to chat
  if (elements.chatMessages) {
    elements.chatMessages.appendChild(errorDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }
  
  // Log error
  console.error('UI Error:', message);
}

// ES module export
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
