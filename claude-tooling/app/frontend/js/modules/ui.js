/**
 * UI 模块 - 处理DOM操作和界面渲染
 */
import * as config from './config.js';
import { state } from './state.js';
const ROLES = config.ROLES;
const TOOL_DISPLAY = config.TOOL_DISPLAY;
const MESSAGE_TYPES = config.MESSAGE_TYPES;

/**
 * DOM元素缓存
 * 在初始化时填充，避免重复查询DOM
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
 * 初始化UI元素引用
 */
function initializeUI() {
  // 缓存DOM元素
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
 * 获取UI元素
 * @returns {Object} UI元素引用
 */
function getElements() {
  return elements;
}

/**
 * 显示加载状态
 * @param {boolean} isLoading - 是否显示加载状态
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
 * 设置工具加载状态
 * @param {boolean} isLoading - 是否显示工具加载状态
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
 * 显示工具结果模态框
 */
function showToolResultModal() {
  if (elements.toolResultModal) {
    elements.toolResultModal.style.display = 'block';
  }
}

/**
 * 隐藏工具结果模态框
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
 * 清空聊天界面
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
 * 添加消息到聊天界面
 * @param {string} role - 消息角色
 * @param {string} content - 消息内容
 */
function addMessageToChat(role, content) {
  if (!elements.chatMessages) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  // 根据消息类型处理内容
  if (typeof content === 'string') {
    // 纯文本消息
    messageDiv.textContent = content;
  } else if (content.type === MESSAGE_TYPES.TEXT) {
    // 结构化文本消息
    messageDiv.textContent = content.text;
  }
  
  elements.chatMessages.appendChild(messageDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * 添加思考内容到聊天界面
 * @param {string} thinking - 思考内容
 */
function addThinkingToChat(thinking) {
  if (!elements.chatMessages) return;
  
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = `message ${ROLES.THINKING}-message`;
  thinkingDiv.innerHTML = `<div class="thinking-label">思考过程:</div>
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
 * Add tool result to chat
 * @param {Object|string} result - Result object or string
 * @param {string} toolUseId - Tool use ID
 */
function addToolResultToChat(result, toolUseId) {
  if (!elements.chatMessages) return;
  
  // 查找对应的工具调用
  const toolCallDiv = document.querySelector(`.tool-call[data-tool-use-id="${toolUseId}"]`);
  if (!toolCallDiv) return;
  
  // Check if result already exists to prevent duplication
  if (toolCallDiv.querySelector('.tool-result')) {
    console.log(`Result for tool ${toolUseId} already displayed, skipping duplicate`);
    return;
  }
  
  // 查找状态标签
  const statusLabel = toolCallDiv.querySelector('.tool-status');
  if (statusLabel) {
    statusLabel.textContent = '已完成';
    statusLabel.classList.add('completed');
  }
  
  // 禁用执行按钮
  const executeButton = toolCallDiv.querySelector('.execute-tool-button');
  if (executeButton) {
    executeButton.disabled = true;
  }
  
  // 创建工具结果容器
  const resultDiv = document.createElement('div');
  resultDiv.className = 'tool-result';
  
  // 处理不同类型的结果
  try {
    // 尝试解析JSON结果
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    
    if (parsedResult.files) {
      // 文件结果
      if (Array.isArray(parsedResult.files) && parsedResult.files.length > 1) {
        resultDiv.innerHTML = processGeneratedFiles(parsedResult);
      } else {
        resultDiv.innerHTML = processFileResult(parsedResult.files[0]);
      }
      
      // 添加文件结果事件监听器
      addFileResultEventListeners(resultDiv, parsedResult);
    } else {
      // 普通结果
      resultDiv.innerHTML = processToolResult(resultDiv, parsedResult);
    }
  } catch (e) {
    // 非JSON格式，作为纯文本显示
    resultDiv.textContent = result;
  }
  
  // 添加到对应的工具调用后面
  toolCallDiv.appendChild(resultDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function processToolResult(container, result) {
  // 格式化JSON结果
  const formattedResult = JSON.stringify(result, null, 2);
  
  // 构建结果UI with content initially collapsed
  let resultHtml = `
    <div class="result-header">
      <span class="result-toggle">${TOOL_DISPLAY.EXPAND_ARROW}</span>
      <strong>Tool Result</strong>
    </div>
    <div class="result-content" style="display: none;">
      <pre class="result-json">${escapeHtml(formattedResult)}</pre>
    </div>
  `;
  
  // 为结果添加折叠/展开功能
  setTimeout(() => {
    const header = container.querySelector('.result-header');
    const content = container.querySelector('.result-content');
    const toggle = container.querySelector('.result-toggle');
    
    if (header && content && toggle) {
      header.addEventListener('click', function() {
        const isCollapsed = content.style.display === 'none';
        content.style.display = isCollapsed ? 'block' : 'none';
        toggle.innerHTML = isCollapsed ? TOOL_DISPLAY.COLLAPSE_ARROW : TOOL_DISPLAY.EXPAND_ARROW;
      });
    }
  }, 0);
  
  return resultHtml;
}

function processFileResult(fileResult) {
  // 基础文件信息
  let resultHtml = `
    <div class="file-result">
      <h4>${escapeHtml(fileResult.name || 'Generated File')}</h4>
  `;
  
  // 文件类型特定处理
  const isImage = fileResult.mime_type && fileResult.mime_type.startsWith('image/');
  const isMarkdown = fileResult.name && fileResult.name.endsWith('.md');
  const isHtml = fileResult.name && (fileResult.name.endsWith('.html') || fileResult.name.endsWith('.htm'));
  
  // 添加对应的预览
  if (isImage && fileResult.url) {
    resultHtml += `<img src="${fileResult.url}" alt="${escapeHtml(fileResult.name)}" class="file-preview" />`;
  } else if (isMarkdown && fileResult.url) {
    resultHtml += `
      <div class="markdown-actions">
        <button class="view-markdown-btn" data-url="${fileResult.url}">查看Markdown</button>
      </div>
      <div class="markdown-preview" style="display:none;"></div>
    `;
  } else if (isHtml && fileResult.url) {
    resultHtml += `
      <div class="html-actions">
        <button class="view-html-btn" data-url="${fileResult.url}">查看HTML</button>
        <a href="${fileResult.url}" target="_blank" class="open-html-link">在新标签页打开</a>
      </div>
      <div class="html-preview" style="display:none;"></div>
    `;
  }
  
  // 文件下载链接
  if (fileResult.url) {
    resultHtml += `
      <div class="file-download">
        <a href="${fileResult.url}" download="${fileResult.name}" class="download-link">下载文件</a>
      </div>
    `;
  }
  
  // 添加文件详细信息（折叠）
  resultHtml += `
      <div class="file-details-toggle">详细信息 ${TOOL_DISPLAY.EXPAND_ARROW}</div>
      <div class="file-details" style="display:none;">
        <pre>${escapeHtml(JSON.stringify(fileResult, null, 2))}</pre>
      </div>
    </div>
  `;
  
  return resultHtml;
}

function processGeneratedFiles(result) {
  let filesHtml = `
    <div class="generated-files">
      <h4>生成的文件 (${result.files.length})</h4>
      <ul class="files-list">
  `;
  
  // 为每个文件创建列表项
  result.files.forEach(file => {
    filesHtml += `
      <li class="file-item">
        <span class="file-name">${escapeHtml(file.name || 'Unnamed File')}</span>
        <div class="file-actions">
    `;
    
    // 根据文件类型添加操作按钮
    const isMarkdown = file.name && file.name.endsWith('.md');
    const isHtml = file.name && (file.name.endsWith('.html') || file.name.endsWith('.htm'));
    
    if (isMarkdown && file.url) {
      filesHtml += `<button class="view-markdown-btn" data-url="${file.url}">查看</button>`;
    } else if (isHtml && file.url) {
      filesHtml += `<button class="view-html-btn" data-url="${file.url}">查看</button>`;
    }
    
    // 下载链接
    if (file.url) {
      filesHtml += `<a href="${file.url}" download="${file.name}" class="download-link">下载</a>`;
    }
    
    filesHtml += `
        </div>
      </li>
    `;
  });
  
  filesHtml += `
      </ul>
      <div class="files-details-toggle">详细信息 ${TOOL_DISPLAY.EXPAND_ARROW}</div>
      <div class="files-details" style="display:none;">
        <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
      </div>
    </div>
  `;
  
  return filesHtml;
}

function addFileResultEventListeners(container, parsedResult) {
  setTimeout(() => {
    // Markdown查看按钮
    const markdownBtns = container.querySelectorAll('.view-markdown-btn');
    markdownBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const url = this.dataset.url;
        const previewContainer = this.parentElement.nextElementSibling || 
                                 this.parentElement.parentElement.querySelector('.markdown-preview');
        
        if (previewContainer) {
          if (previewContainer.style.display === 'none') {
            previewContainer.style.display = 'block';
            this.textContent = '隐藏Markdown';
            fetchAndDisplayMarkdown(url, previewContainer);
          } else {
            previewContainer.style.display = 'none';
            this.textContent = '查看Markdown';
          }
        }
      });
    });
    
    // HTML查看按钮
    const htmlBtns = container.querySelectorAll('.view-html-btn');
    htmlBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const url = this.dataset.url;
        const previewContainer = this.parentElement.nextElementSibling || 
                                this.parentElement.parentElement.querySelector('.html-preview');
        
        if (previewContainer) {
          if (previewContainer.style.display === 'none') {
            previewContainer.style.display = 'block';
            this.textContent = '隐藏HTML';
            displayHtmlPreview(url, previewContainer);
          } else {
            previewContainer.style.display = 'none';
            this.textContent = '查看HTML';
          }
        }
      });
    });
    
    // 文件详情切换
    const fileDetailsToggles = container.querySelectorAll('.file-details-toggle, .files-details-toggle');
    fileDetailsToggles.forEach(toggle => {
      toggle.addEventListener('click', function() {
        const details = this.nextElementSibling;
        if (details) {
          const isCollapsed = details.style.display === 'none';
          details.style.display = isCollapsed ? 'block' : 'none';
          this.innerHTML = `详细信息 ${isCollapsed ? TOOL_DISPLAY.COLLAPSE_ARROW : TOOL_DISPLAY.EXPAND_ARROW}`;
        }
      });
    });
  }, 0);
}

async function fetchAndDisplayMarkdown(url, container) {
  if (!container) return;
  
  // 显示加载状态
  container.innerHTML = '<div class="loading-spinner">加载中...</div>';
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const markdownText = await response.text();
    
    // 简单的Markdown渲染
    // 注意：实际项目中应使用完整的Markdown解析器
    let html = markdownText
      // 标题
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // 加粗
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 代码块
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // 列表项
      .replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>')
      // 段落
      .replace(/^(?!<[a-z])/gm, '<p>$&</p>');
    
    // 将连续的li元素包装在ul中
    html = html.replace(/<li>[\s\S]*?<\/li>(?=[\s\S]*?<li>|$)/g, '<ul>$&</ul>');
    
    // 清理空的p标签
    html = html.replace(/<p><\/p>/g, '');
    
    container.innerHTML = html;
    
    // 为链接添加样式和行为
    const links = container.querySelectorAll('a');
    links.forEach(link => {
      link.classList.add('markdown-link');
    });
    
  } catch (error) {
    console.error('Error loading markdown:', error);
    container.innerHTML = `<div class="error-message">加载失败: ${error.message}</div>`;
  }
}

function displayHtmlPreview(url, container) {
  if (!container) return;
  
  // 创建iframe以安全显示HTML
  const iframe = document.createElement('iframe');
  iframe.className = 'html-preview-frame';
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.src = url;
  
  // 创建关闭按钮
  const closeButton = document.createElement('button');
  closeButton.className = 'close-preview-btn';
  closeButton.textContent = '关闭预览';
  closeButton.addEventListener('click', () => {
    container.style.display = 'none';
    // 更新查看按钮文本
    const viewBtn = container.previousElementSibling.querySelector('.view-html-btn');
    if (viewBtn) {
      viewBtn.textContent = '查看HTML';
    }
  });
  
  // 清除现有内容
  container.innerHTML = '';
  container.appendChild(iframe);
  container.appendChild(closeButton);
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
 * 转义HTML特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
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

// ES模块导出
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
  setupToolCallToggle
}; 