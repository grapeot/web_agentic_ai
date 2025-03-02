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
 * Add message to chat
 * @param {string} role - Message role (user/assistant)
 * @param {string|Object|Array} content - Message content
 * @param {string} type - Message type (text/thinking)
 */
function addMessageToChat(role, content, type) {
  console.log(`[DEBUG] addMessageToChat called with role: ${role}, type: ${type}`);
  console.log("[DEBUG] Content:", JSON.stringify(content, null, 2));
  
  // Skip only if type is explicitly set to THINKING
  if (type && type === MESSAGE_TYPES.THINKING) {
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
  let isHtml = false;
  
  if (typeof content === 'string') {
    console.log("[DEBUG] Content is string type");
    textContent = content;
  } else if (content && typeof content === 'object') {
    if (Array.isArray(content)) {
      console.log("[DEBUG] Content is array type with length:", content.length);
      // Handle array of content blocks
      // Check if any content blocks have HTML format
      isHtml = content.some(block => block.format === 'html');
      console.log("[DEBUG] Array content contains HTML format:", isHtml);
      
      if (isHtml) {
        // If HTML content is present, we need to handle each block properly
        textContent = content
          .filter(block => block.type === 'text' && block.text)
          .map(block => {
            console.log("[DEBUG] Processing block:", JSON.stringify(block, null, 2));
            // Use the HTML content if available, otherwise escape the text
            return block.format === 'html' ? block.text : escapeHtml(block.text).replace(/\n/g, '<br>');
          })
          .join('\n');
      } else {
        // For regular text content
        textContent = content
          .filter(block => block.type === 'text' && block.text)
          .map(block => block.text)
          .join('\n');
      }
    } else if (content.type === 'text' && content.text) {
      console.log("[DEBUG] Content is object with text field");
      // Handle single content object with type and text fields
      textContent = content.text;
      isHtml = content.format === 'html';
      console.log("[DEBUG] Single content is HTML format:", isHtml);
    } else if (content.content) {
      console.log("[DEBUG] Content has content field");
      // Handle object with direct content field
      textContent = content.content;
      isHtml = content.format === 'html';
      console.log("[DEBUG] Content object is HTML format:", isHtml);
    } else if (content.text) {
      console.log("[DEBUG] Content has text field");
      // Handle object with direct text field
      textContent = content.text;
      isHtml = content.format === 'html';
      console.log("[DEBUG] Text object is HTML format:", isHtml);
    }
  }
  
  if (!textContent) {
    console.warn('No valid text content to display:', content);
    return;
  }
  
  // Skip if this exact message content was already processed
  if (state.hasProcessedContent(textContent.trim())) {
    console.log("[DEBUG] Skipping duplicate content");
    return;
  }
  
  // Mark this content as processed to prevent duplicates
  state.addProcessedContent(textContent.trim());
  
  // Function to render content
  const renderContent = () => {
    try {
      if (isHtml) {
        // For HTML content (preprocessed on backend)
        console.log("[DEBUG] Rendering as HTML content");
        messageDiv.innerHTML = textContent;
      } else {
        // Simple plain text rendering - escape HTML for security
        console.log("[DEBUG] Rendering as plain text");
        const safeText = escapeHtml(textContent).replace(/\n/g, '<br>');
        messageDiv.innerHTML = safeText;
      }
    } catch (error) {
      console.error('Error rendering content:', error);
      // Fallback to plain text with line breaks
      messageDiv.innerHTML = escapeHtml(textContent).replace(/\n/g, '<br>');
    }
  };

  // Render content immediately
  renderContent();
  
  // Only append if we have content
  if (messageDiv.textContent || messageDiv.innerHTML) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      console.log("[DEBUG] Appending message to chat, innerHTML length:", messageDiv.innerHTML.length);
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
  console.log("[DEBUG] processFileResults called with:", JSON.stringify(result, null, 2));
  console.log("[DEBUG] isMultiple:", isMultiple);

  // Check if result is an array of files
  if (isMultiple && Array.isArray(result.files)) {
    console.log("[DEBUG] Processing multiple files:", result.files.length);
    // Generate list for multiple files
    return `
      <div class="file-results-container">
        <h4>Generated Files (${result.files.length})</h4>
        <ul class="file-list">
          ${result.files.map(file => generateFileListItem(file)).join('')}
        </ul>
      </div>
    `;
  }

  // For single file result
  if (!isMultiple) {
    // For single file in files array
    if (result.files && result.files.length === 1) {
      console.log("[DEBUG] Processing single file from files array");
      // Extract the single file for processing
      const singleFile = result.files[0];
      
      // Check if file has markdown_render field
      if (singleFile.markdown_render) {
        console.log("[DEBUG] Found markdown_render in single file:", singleFile.markdown_render);
        
        // Special handling for image files with markdown_render
        if (singleFile.render_type === "image" || 
            (singleFile.content_type && singleFile.content_type.startsWith('image/'))) {
          console.log("[DEBUG] Rendering image from markdown_render");
          console.log("[DEBUG] Image URL:", singleFile.file_url);
          
          return `
            <div class="file-result">
              <h4>${escapeHtml(singleFile.file_name || singleFile.file_path?.split('/').pop() || 'Generated Image')}</h4>
              <div class="image-container">
                <img src="${singleFile.file_url}" alt="Generated image" class="file-preview" />
              </div>
              <div class="file-actions">
                <a href="${singleFile.file_url}" download class="download-link">Download Image</a>
              </div>
              <div class="file-details-toggle">Details ${TOOL_DISPLAY.EXPAND_ARROW}</div>
              <div class="file-details" style="display:none;">
                <pre>${escapeHtml(JSON.stringify(singleFile, null, 2))}</pre>
              </div>
            </div>
          `;
        }
      }
      
      // Default handling for single file
      return generateFileActions(singleFile);
    }
    
    // Direct file result (not in files array)
    if (result.markdown_render && result.render_type === "image") {
      console.log("[DEBUG] Rendering direct image from markdown_render");
      console.log("[DEBUG] Image URL:", result.file_url);
      return `
        <div class="file-result">
          <h4>${escapeHtml(result.file_name || result.file_path?.split('/').pop() || 'Generated Image')}</h4>
          <div class="image-container">
            <img src="${result.file_url}" alt="Generated image" class="file-preview" />
          </div>
          <div class="file-actions">
            <a href="${result.file_url}" download class="download-link">Download Image</a>
          </div>
          <div class="file-details-toggle">Details ${TOOL_DISPLAY.EXPAND_ARROW}</div>
          <div class="file-details" style="display:none;">
            <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
          </div>
        </div>
      `;
    }
    
    // Use the direct markdown_render content if available
    if (result.markdown_render && typeof result.markdown_render === 'string') {
      console.log("[DEBUG] Rendering content from direct markdown_render");
      return `
        <div class="markdown-result">
          <div class="markdown-content">${result.markdown_render}</div>
        </div>
      `;
    }
    
    // Default handling for direct result
    return generateFileActions(result);
  }

  // Fallback for unexpected result structure
  console.log("[DEBUG] No recognizable file structure, returning generic result");
  return `
    <div class="result-data">
      <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
    </div>
  `;
}

/**
 * Generate actions section for a file
 * @param {Object} file - File object
 * @returns {string} Actions HTML
 */
function generateFileActions(file) {
  console.log("[DEBUG] generateFileActions called for file:", file.file_name || file.file_path);
  
  const fileName = file.file_name || (file.file_path ? file.file_path.split('/').pop() : 'File');
  const fileUrl = file.file_url || file.url;
  
  if (!fileUrl) {
    console.log("[DEBUG] No file URL available for actions");
    return `
      <div class="file-result">
        <h4>${escapeHtml(fileName)}</h4>
        <div class="file-error">No file URL available</div>
      </div>
    `;
  }
  
  // Check for markdown_render with render_type first
  if (file.markdown_render && (file.render_type === "image" || 
      (file.content_type && file.content_type.startsWith('image/')))) {
    console.log("[DEBUG] Generating full file result for markdown_render image");
    console.log("[DEBUG] Image URL:", fileUrl);
    return `
      <div class="file-result">
        <h4>${escapeHtml(fileName)}</h4>
        <div class="image-container">
          <img src="${fileUrl}" alt="${escapeHtml(fileName)}" class="file-preview" />
        </div>
        <div class="file-actions">
          <a href="${fileUrl}" target="_blank" class="view-link">View Full Size</a>
          <a href="${fileUrl}" download="${fileName}" class="download-link">Download</a>
        </div>
        <div class="file-details-toggle">Details ${TOOL_DISPLAY.EXPAND_ARROW}</div>
        <div class="file-details" style="display:none;">
          <pre>${escapeHtml(JSON.stringify(file, null, 2))}</pre>
        </div>
      </div>
    `;
  }
  
  // Handle by file type
  const isImage = (file.mime_type && file.mime_type.startsWith('image/')) || 
                 (file.content_type && file.content_type.startsWith('image/')) ||
                 (file.render_type === 'image');
  const isMarkdown = file.file_name && file.file_name.endsWith('.md');
  const isHtml = file.file_name && (file.file_name.endsWith('.html') || file.file_name.endsWith('.htm'));
  
  console.log("[DEBUG] File type detection - isImage:", isImage, "isMarkdown:", isMarkdown, "isHtml:", isHtml);
  
  // Generate appropriate actions based on file type
  let previewHtml = generateFilePreview(file);
  let actionsHtml = '';
  
  if (isImage) {
    actionsHtml = `
      <div class="file-actions">
        <a href="${fileUrl}" target="_blank" class="view-link">View Full Size</a>
        <a href="${fileUrl}" download="${fileName}" class="download-link">Download</a>
      </div>
    `;
  } else if (isMarkdown) {
    actionsHtml = `
      <div class="file-actions">
        <button class="view-markdown-btn" data-url="${fileUrl}">View Markdown</button>
        <a href="${fileUrl}" download="${fileName}" class="download-link">Download</a>
      </div>
    `;
  } else if (isHtml) {
    actionsHtml = `
      <div class="file-actions">
        <button class="view-html-btn" data-url="${fileUrl}">View HTML</button>
        <a href="${fileUrl}" target="_blank" class="view-link">Open in new tab</a>
        <a href="${fileUrl}" download="${fileName}" class="download-link">Download</a>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="file-actions">
        <a href="${fileUrl}" download="${fileName}" class="download-link">Download</a>
      </div>
    `;
  }
  
  return `
    <div class="file-result">
      <h4>${escapeHtml(fileName)}</h4>
      ${previewHtml}
      ${actionsHtml}
      <div class="file-details-toggle">Details ${TOOL_DISPLAY.EXPAND_ARROW}</div>
      <div class="file-details" style="display:none;">
        <pre>${escapeHtml(JSON.stringify(file, null, 2))}</pre>
      </div>
    </div>
  `;
}

/**
 * Generate preview section for a file
 * @param {Object} file - File object
 * @returns {string} Preview HTML
 */
function generateFilePreview(file) {
  console.log("[DEBUG] generateFilePreview called for file:", file.file_name || file.file_path);
  
  const fileUrl = file.file_url || file.url;
  if (!fileUrl) {
    console.log("[DEBUG] No URL available for preview");
    return '';
  }
  
  // First check for markdown_render with render_type, which is the modern way
  if (file.markdown_render && (file.render_type === "image" || 
     (file.content_type && file.content_type.startsWith('image/')))) {
    console.log("[DEBUG] Generating preview for markdown_render image");
    console.log("[DEBUG] Image URL:", fileUrl);
    return `
      <div class="image-container">
        <img src="${fileUrl}" alt="${escapeHtml(file.file_name || file.file_path?.split('/').pop() || 'Generated image')}" class="file-preview" />
      </div>
    `;
  }
  
  // Handle by file type
  const isImage = file.mime_type && file.mime_type.startsWith('image/') || 
                 (file.content_type && file.content_type.startsWith('image/')) ||
                 (file.render_type === 'image');
  const isMarkdown = file.file_name && file.file_name.endsWith('.md');
  const isHtml = file.file_name && (file.file_name.endsWith('.html') || file.file_name.endsWith('.htm'));
  
  console.log("[DEBUG] File type detection - isImage:", isImage, "isMarkdown:", isMarkdown, "isHtml:", isHtml);
  
  if (isImage) {
    console.log("[DEBUG] Generating preview for standard image, URL:", fileUrl);
    return `
      <div class="image-container">
        <img src="${fileUrl}" alt="${escapeHtml(file.file_name || file.file_path?.split('/').pop() || 'Generated image')}" class="file-preview" />
      </div>
    `;
  } else if (isMarkdown) {
    console.log("[DEBUG] Generating markdown preview buttons, URL:", fileUrl);
    return `
      <div class="markdown-actions">
        <button class="view-markdown-btn" data-url="${fileUrl}">View Markdown</button>
      </div>
      <div class="markdown-preview" style="display:none;"></div>
    `;
  } else if (isHtml) {
    console.log("[DEBUG] Generating HTML preview buttons, URL:", fileUrl);
    return `
      <div class="html-actions">
        <button class="view-html-btn" data-url="${fileUrl}">View HTML</button>
        <a href="${fileUrl}" target="_blank" class="open-html-link">Open in new tab</a>
      </div>
      <div class="html-preview" style="display:none;"></div>
    `;
  }
  
  console.log("[DEBUG] No preview generated for file");
  return '';
}

/**
 * Generate list item for a file in multiple files view
 * @param {Object} file - File object
 * @returns {string} List item HTML
 */
function generateFileListItem(file) {
  console.log("[DEBUG] generateFileListItem called for file:", file.file_name || file.file_path);
  
  const fileUrl = file.file_url || file.url;
  const fileName = file.file_name || (file.file_path ? file.file_path.split('/').pop() : 'File');
  
  if (!fileUrl) {
    console.log("[DEBUG] No URL available for file in list");
    return `
      <li class="file-item">
        <span class="file-name">${escapeHtml(fileName)}</span>
        <div class="file-error">No URL available</div>
      </li>
    `;
  }
  
  // Check for markdown_render and render_type
  if (file.markdown_render && (file.render_type === "image" || 
      (file.content_type && file.content_type.startsWith('image/')))) {
    console.log("[DEBUG] Generating list item for markdown_render image");
    console.log("[DEBUG] Image URL:", fileUrl);
    return `
      <li class="file-item">
        <span class="file-name">${escapeHtml(fileName)}</span>
        <div class="file-preview-thumbnail">
          <img src="${fileUrl}" alt="Image thumbnail" class="thumbnail" />
        </div>
        <div class="file-actions">
          <a href="${fileUrl}" target="_blank" class="view-link">View</a>
          <a href="${fileUrl}" download="${fileName}" class="download-link">Download</a>
        </div>
      </li>
    `;
  }

  // Handle by file type
  const isMarkdown = file.file_name && file.file_name.endsWith('.md');
  const isHtml = file.file_name && (file.file_name.endsWith('.html') || file.file_name.endsWith('.htm'));
  const isImage = (file.mime_type && file.mime_type.startsWith('image/')) || 
                 (file.content_type && file.content_type.startsWith('image/')) ||
                 (file.render_type === 'image');
  
  console.log("[DEBUG] In list item - File type detection - isImage:", isImage, "isMarkdown:", isMarkdown, "isHtml:", isHtml);
  
  // Generate preview if it's an image
  let previewHtml = '';
  if (isImage && fileUrl) {
    previewHtml = `
      <div class="file-preview-thumbnail">
        <img src="${fileUrl}" alt="Image thumbnail" class="thumbnail" />
      </div>
    `;
    console.log("[DEBUG] Generated preview HTML for image");
  }
  
  // Generate appropriate actions based on file type
  let actionsHtml = '';
  if (isMarkdown) {
    actionsHtml += `<button class="view-markdown-btn" data-url="${fileUrl}">View</button>`;
  } else if (isHtml) {
    actionsHtml += `<button class="view-html-btn" data-url="${fileUrl}">View</button>`;
  } else if (isImage) {
    actionsHtml += `<a href="${fileUrl}" target="_blank" class="view-link">View</a>`;
  }
  
  actionsHtml += `<a href="${fileUrl}" download="${fileName}" class="download-link">Download</a>`;
  console.log("[DEBUG] Generated actions HTML:", actionsHtml);
  
  // Create final list item
  const listItemHtml = `
    <li class="file-item">
      <span class="file-name">${escapeHtml(fileName)}</span>
      ${previewHtml}
      <div class="file-actions">
        ${actionsHtml}
      </div>
    </li>
  `;
  
  console.log("[DEBUG] Final list item HTML length:", listItemHtml.length);
  return listItemHtml;
}

/**
 * Add tool result to chat
 * @param {Object|string} result - Result object or string
 * @param {string} toolUseId - Tool use ID
 */
function addToolResultToChat(result, toolUseId) {
  console.log("[DEBUG] addToolResultToChat called with toolUseId:", toolUseId);
  console.log("[DEBUG] Tool result:", JSON.stringify(result, null, 2));
  
  if (!elements.chatMessages) return;
  
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
    console.log("[DEBUG] Parsed tool result:", JSON.stringify(parsedResult, null, 2));
    
    if (typeof parsedResult === 'object' && parsedResult !== null) {
      // Check for markdown_render field - this is a key indicator for rendering content as HTML
      const hasMarkdownContent = parsedResult.markdown_render || 
                               (parsedResult.format === 'html') ||
                               (parsedResult.files && parsedResult.files.some(f => f.markdown_render));
      
      console.log("[DEBUG] Has markdown content:", hasMarkdownContent);
      
      if (parsedResult.status === 'success' && parsedResult.message) {
        // Handle successful operation result
        console.log("[DEBUG] Handling success message:", parsedResult.message);
        const statusContent = document.createElement('div');
        statusContent.className = 'tool-result-status';
        statusContent.innerHTML = generateStatusContent(parsedResult);
        contentDiv.appendChild(statusContent);
        
        // For save_file tool, also show the file content
        if (parsedResult.message.includes('File saved')) {
          console.log("[DEBUG] Adding file content for saved file");
          appendFileContent(contentDiv, toolCallDiv, parsedResult);
        }
      } else if (parsedResult.files) {
        // Handle file results
        console.log("[DEBUG] Processing file results, multiple files:", Array.isArray(parsedResult.files));
        const fileResultsHtml = processFileResults(parsedResult, Array.isArray(parsedResult.files));
        console.log("[DEBUG] Generated file results HTML length:", fileResultsHtml.length);
        contentDiv.innerHTML = fileResultsHtml;
      } else if (parsedResult.markdown_render) {
        // Handle direct markdown_render content
        console.log("[DEBUG] Handling markdown_render content:", parsedResult.markdown_render);
        // Use innerHTML to properly render the HTML content from markdown
        contentDiv.innerHTML = `<div class="markdown-content">${parsedResult.markdown_render}</div>`;
      } else {
        // Handle other object results
        console.log("[DEBUG] Handling generic object result");
        const pre = document.createElement('pre');
        pre.className = 'result-json';
        pre.textContent = JSON.stringify(parsedResult, null, 2);
        contentDiv.appendChild(pre);
      }
    } else {
      // Handle primitive values
      console.log("[DEBUG] Handling primitive result value");
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
  
  console.log("[DEBUG] Appending tool result to tool call div");
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
  console.log("[DEBUG] fetchAndDisplayMarkdown called with URL:", url);
  
  // Show loading indicator
  if (container.querySelector('.markdown-preview')) {
    const preview = container.querySelector('.markdown-preview');
    preview.style.display = 'block';
    preview.innerHTML = '<div class="loading-indicator">Loading markdown...</div>';
  }
  
  fetch(url)
    .then(response => response.text())
    .then(markdown => {
      try {
        console.log("[DEBUG] Received markdown content, length:", markdown.length);
        
        // Check if we have access to marked library for proper Markdown rendering
        if (window.marked) {
          console.log("[DEBUG] Using marked library to convert markdown to HTML");
          // Configure marked options
          marked.setOptions({
            breaks: true, // Add line breaks
            gfm: true,    // Use GitHub Flavored Markdown
            headerIds: true,
            sanitize: false // We'll sanitize with DOMPurify if available
          });
          
          // Convert markdown to HTML
          const html = marked.parse(markdown);
          console.log("[DEBUG] Converted markdown to HTML, checking for image tags");
          
          // Look for image tags
          const imgPattern = /<img[^>]+>/g;
          const imgTags = html.match(imgPattern);
          if (imgTags) {
            console.log("[DEBUG] Found image tags in HTML:", imgTags.length);
          }
          
          // Use DOMPurify if available, otherwise use the HTML directly
          let cleanHtml = window.DOMPurify ? DOMPurify.sanitize(html) : html;
          
          // Display in the preview container
          if (container.querySelector('.markdown-preview')) {
            const preview = container.querySelector('.markdown-preview');
            preview.style.display = 'block';
            preview.innerHTML = `
              <div class="markdown-content">
                ${cleanHtml}
              </div>
            `;
            
            // Make all links open in new tab
            preview.querySelectorAll('a').forEach(a => {
              a.setAttribute('target', '_blank');
              a.setAttribute('rel', 'noopener noreferrer');
            });
            
            // Add click handlers to images for expanded view
            preview.querySelectorAll('img').forEach(img => {
              img.addEventListener('click', function() {
                window.open(this.src, '_blank');
              });
              img.style.cursor = 'pointer';
            });
          } else {
            console.log("[DEBUG] No preview container found, creating one");
            const preview = document.createElement('div');
            preview.className = 'markdown-preview';
            preview.style.display = 'block';
            preview.innerHTML = `
              <div class="markdown-content">
                ${cleanHtml}
              </div>
            `;
            container.appendChild(preview);
          }
        } else {
          // Fallback to simple rendering with line breaks if marked library is not available
          console.log("[DEBUG] Marked library not available, using fallback rendering");
          
          // Display as plain text with line breaks, escape HTML for security
          if (container.querySelector('.markdown-preview')) {
            const preview = container.querySelector('.markdown-preview');
            preview.style.display = 'block';
            preview.innerHTML = escapeHtml(markdown).replace(/\n/g, '<br>');
          } else {
            const preview = document.createElement('div');
            preview.className = 'markdown-preview';
            preview.style.display = 'block';
            preview.innerHTML = escapeHtml(markdown).replace(/\n/g, '<br>');
            container.appendChild(preview);
          }
        }
      } catch (err) {
        console.error('[ERROR] Error rendering markdown content:', err);
        
        // Fallback on error
        if (container.querySelector('.markdown-preview')) {
          const preview = container.querySelector('.markdown-preview');
          preview.style.display = 'block';
          preview.innerHTML = '<div class="error-message">Error rendering markdown</div>';
          preview.appendChild(document.createTextNode(markdown)); // Add as text for safety
        }
      }
    })
    .catch(err => {
      console.error('[ERROR] Error fetching markdown content:', err);
      
      if (container.querySelector('.markdown-preview')) {
        const preview = container.querySelector('.markdown-preview');
        preview.style.display = 'block';
        preview.innerHTML = '<div class="error-message">Error loading content: ' + err.message + '</div>';
      }
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