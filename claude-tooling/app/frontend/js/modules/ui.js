/**
 * UI 模块 - 处理DOM操作和界面渲染
 */
import { ROLES, TOOL_DISPLAY, MESSAGE_TYPES } from './config.js';

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
  toolResultTextarea: null,
  submitToolResultButton: null,
  autoExecutionIndicator: null,
  cancelAutoExecutionButton: null
};

/**
 * 初始化UI元素引用
 */
export function initializeUI() {
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
  elements.toolResultModal = new bootstrap.Modal(document.getElementById('toolResultModal'));
  elements.toolResultTextarea = document.getElementById('toolResult');
  elements.submitToolResultButton = document.getElementById('submitToolResult');
  elements.autoExecutionIndicator = document.getElementById('auto-execution-indicator');
  elements.cancelAutoExecutionButton = document.getElementById('cancel-auto-execution');
  
  return elements;
}

/**
 * 获取UI元素
 * @returns {Object} UI元素引用
 */
export function getElements() {
  return elements;
}

/**
 * 显示加载状态
 * @param {boolean} isLoading - 是否显示加载状态
 */
export function setLoading(isLoading) {
  if (elements.responseSpinner) {
    elements.responseSpinner.style.display = isLoading ? 'block' : 'none';
  }
}

/**
 * 设置工具加载状态
 * @param {boolean} isLoading - 是否显示工具加载状态
 */
export function setToolsLoading(isLoading) {
  if (elements.toolsSpinner) {
    elements.toolsSpinner.style.display = isLoading ? 'block' : 'none';
  }
}

/**
 * 显示或隐藏自动执行指示器
 * @param {boolean} visible - 是否显示
 */
export function setAutoExecutionIndicator(visible) {
  if (elements.autoExecutionIndicator) {
    elements.autoExecutionIndicator.style.display = visible ? 'block' : 'none';
  }
}

/**
 * 显示工具结果模态框
 */
export function showToolResultModal() {
  if (elements.toolResultModal) {
    elements.toolResultTextarea.value = '';
    elements.toolResultModal.show();
  }
}

/**
 * 隐藏工具结果模态框
 */
export function hideToolResultModal() {
  if (elements.toolResultModal) {
    elements.toolResultModal.hide();
  }
}

/**
 * 清空聊天界面
 */
export function clearChat() {
  if (elements.chatMessages) {
    elements.chatMessages.innerHTML = '';
  }
}

/**
 * 添加消息到聊天界面
 * @param {string} role - 消息角色
 * @param {string} content - 消息内容
 */
export function addMessageToChat(role, content) {
  if (!elements.chatMessages) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  messageDiv.innerHTML = marked.parse(content);
  elements.chatMessages.appendChild(messageDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  
  // 应用代码高亮
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
}

/**
 * 添加思考内容到聊天界面
 * @param {string} thinking - 思考内容
 */
export function addThinkingToChat(thinking) {
  if (!elements.chatMessages) return;
  
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message thinking';
  thinkingDiv.innerHTML = '<h5>思考过程:</h5>' + marked.parse(thinking);
  elements.chatMessages.appendChild(thinkingDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  
  // 应用代码高亮
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
}

/**
 * 添加工具调用到聊天界面
 * @param {Object} toolCall - 工具调用对象
 */
export function addToolCallToChat(toolCall) {
  if (!elements.chatMessages) return;
  
  const toolCallDiv = document.createElement('div');
  toolCallDiv.className = 'message tool-call';
  toolCallDiv.dataset.toolId = toolCall.id;
  
  const header = document.createElement('div');
  header.className = 'tool-call-header';
  
  const arrow = document.createElement('span');
  arrow.className = 'toggle-arrow';
  arrow.innerHTML = TOOL_DISPLAY.COLLAPSE_ARROW; // 初始折叠状态
  header.appendChild(arrow);
  
  const headerText = document.createElement('span');
  headerText.textContent = `工具调用: ${toolCall.name}`;
  header.appendChild(headerText);
  
  toolCallDiv.appendChild(header);
  
  const content = document.createElement('div');
  content.className = 'tool-content collapsed'; // 默认折叠
  
  if (toolCall.input) {
    const inputLabel = document.createElement('div');
    inputLabel.className = 'tool-section-label';
    inputLabel.textContent = '输入参数:';
    content.appendChild(inputLabel);
    
    const toolInput = document.createElement('div');
    toolInput.className = 'tool-input';
    
    try {
      let jsonInput;
      if (typeof toolCall.input === 'string') {
        jsonInput = JSON.parse(toolCall.input);
      } else {
        jsonInput = toolCall.input;
      }
      
      const formattedJson = JSON.stringify(jsonInput, null, 2);
      toolInput.innerHTML = `<pre>${formattedJson}</pre>`;
    } catch (e) {
      toolInput.innerHTML = `<pre>${toolCall.input}</pre>`;
    }
    
    content.appendChild(toolInput);
  }
  
  const resultLabel = document.createElement('div');
  resultLabel.className = 'tool-section-label';
  resultLabel.textContent = '结果:';
  content.appendChild(resultLabel);
  
  const resultContainer = document.createElement('div');
  resultContainer.className = 'tool-result-container';
  resultContainer.dataset.forToolId = toolCall.id;
  
  content.appendChild(resultContainer);
  toolCallDiv.appendChild(content);
  
  elements.chatMessages.appendChild(toolCallDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  
  return toolCallDiv;
}

/**
 * 添加工具结果到聊天界面
 * @param {string} result - 工具结果
 * @param {string} toolUseId - 工具使用ID
 */
export function addToolResultToChat(result, toolUseId) {
  if (!elements.chatMessages) return;
  
  const resultContainer = document.querySelector(`.tool-result-container[data-for-tool-id="${toolUseId}"]`);
  let resultDiv;
  
  if (resultContainer) {
    // 将结果添加到现有工具调用
    resultDiv = document.createElement('div');
    resultDiv.className = 'tool-result';
    resultDiv.dataset.resultId = toolUseId;
    
    processToolResult(resultDiv, result);
    resultContainer.appendChild(resultDiv);
    
    // 确保工具调用保持折叠状态
    const toolCallDiv = resultContainer.closest('.tool-call');
    if (toolCallDiv) {
      const toolContent = toolCallDiv.querySelector('.tool-content');
      if (toolContent) {
        toolContent.classList.add('collapsed');
      }
    }
  } else {
    console.warn(`工具容器 ID ${toolUseId} 未找到，创建独立结果`);
    
    // 创建独立结果
    resultDiv = document.createElement('div');
    resultDiv.className = 'message tool-result';
    resultDiv.dataset.resultId = toolUseId;
    
    processToolResult(resultDiv, result);
    elements.chatMessages.appendChild(resultDiv);
  }
  
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return resultDiv;
}

/**
 * 处理工具结果内容
 * @param {HTMLElement} container - 要添加结果的容器元素
 * @param {string} result - 工具结果
 * @private
 */
function processToolResult(container, result) {
  let resultContent = '';
  let parsedResult = null;
  
  try {
    // 尝试解析JSON结果
    parsedResult = JSON.parse(result);
    
    // 检查是否为文件结果
    if (parsedResult.status === "success" && parsedResult.file_path && parsedResult.file_url) {
      // 文件结果处理
      resultContent = processFileResult(parsedResult);
    } 
    // 检查是否有生成的文件列表
    else if (parsedResult.status === "success" && parsedResult.generated_files && parsedResult.generated_files.length > 0) {
      resultContent = processGeneratedFiles(parsedResult);
    }
    else {
      // 常规JSON结果
      resultContent = `<pre>${JSON.stringify(parsedResult, null, 2)}</pre>`;
    }
  } catch (e) {
    // 非JSON，按文本显示
    console.error("解析工具结果错误:", e);
    resultContent = `<pre>${result}</pre>`;
  }
  
  container.innerHTML = resultContent;
  
  // 添加各类按钮事件监听器
  addFileResultEventListeners(container, parsedResult);
}

/**
 * 处理文件结果
 * @param {Object} fileResult - 文件结果对象
 * @returns {string} HTML内容
 * @private
 */
function processFileResult(fileResult) {
  const fileName = fileResult.file_path.split('/').pop();
  let content = '';
  
  // 文件结果头部
  content += `<div class="file-result-header">
    <strong>文件已保存:</strong> ${fileName}
    <a href="${fileResult.file_url}" target="_blank" class="file-download-link">
      <i class="fas fa-download"></i> 下载
    </a>
  </div>`;
  
  // 根据文件类型添加预览
  if (fileResult.render_type === "image") {
    content += `<div class="file-preview image-preview">
      <img src="${fileResult.file_url}" alt="${fileName}" class="preview-image" />
    </div>`;
  } else if (fileResult.render_type === "markdown") {
    content += `<div class="file-preview markdown-preview-btn">
      <button class="btn btn-sm btn-outline-primary view-markdown" data-url="${fileResult.view_url}">
        <i class="fas fa-file-alt"></i> 查看Markdown
      </button>
    </div>`;
  } else if (fileResult.render_type === "html") {
    content += `<div class="file-preview html-preview-btn">
      <button class="btn btn-sm btn-outline-primary view-html" data-url="${fileResult.view_url}">
        <i class="fas fa-code"></i> 查看HTML
      </button>
    </div>`;
  }
  
  // 添加完整JSON详情（折叠）
  content += `<div class="file-json-details collapsed">
    <button class="btn btn-sm btn-outline-secondary toggle-json">显示详情</button>
    <pre class="json-content" style="display:none;">${JSON.stringify(fileResult, null, 2)}</pre>
  </div>`;
  
  return content;
}

/**
 * 处理多个生成的文件
 * @param {Object} result - 包含生成文件的结果对象
 * @returns {string} HTML内容
 * @private
 */
function processGeneratedFiles(result) {
  let content = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
  
  // 添加生成文件部分
  content += `<div class="generated-files-section">
    <h5>生成的文件:</h5>
  </div>`;
  
  // 处理每个生成的文件
  for (const file of result.generated_files) {
    const fileName = file.file_name || file.file_path.split('/').pop();
    
    content += `<div class="file-result">
      <div class="file-result-header">
        <strong>文件:</strong> ${fileName}
        <a href="${file.file_url}" target="_blank" class="file-download-link">
          <i class="fas fa-download"></i> 下载
        </a>
      </div>`;
    
    // 根据文件类型添加预览
    if (file.render_type === "image") {
      content += `<div class="file-preview image-preview">
        <img src="${file.file_url}" alt="${fileName}" class="preview-image" />
      </div>`;
    } else if (file.render_type === "markdown") {
      content += `<div class="file-preview markdown-preview-btn">
        <button class="btn btn-sm btn-outline-primary view-markdown" data-url="${file.view_url || file.file_url}">
          <i class="fas fa-file-alt"></i> 查看Markdown
        </button>
      </div>`;
    } else if (file.render_type === "html") {
      content += `<div class="file-preview html-preview-btn">
        <button class="btn btn-sm btn-outline-primary view-html" data-url="${file.view_url || file.file_url}">
          <i class="fas fa-code"></i> 查看HTML
        </button>
      </div>`;
    }
    
    content += `</div>`;  // 关闭file-result div
  }
  
  return content;
}

/**
 * 为文件结果添加事件监听器
 * @param {HTMLElement} container - 容器元素
 * @param {Object} parsedResult - 解析后的结果对象
 * @private
 */
function addFileResultEventListeners(container, parsedResult) {
  if (!parsedResult) return;
  
  // 检查是否有文件结果需要添加事件监听器
  if (parsedResult.render_type || (parsedResult.generated_files && parsedResult.generated_files.length > 0)) {
    // Markdown查看按钮
    const viewMarkdownBtns = container.querySelectorAll('.view-markdown');
    viewMarkdownBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        fetchAndDisplayMarkdown(url, container);
      });
    });
    
    // HTML查看按钮
    const viewHtmlBtns = container.querySelectorAll('.view-html');
    viewHtmlBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const url = this.getAttribute('data-url');
        displayHtmlPreview(url, container);
      });
    });
    
    // JSON切换按钮
    const toggleJsonBtns = container.querySelectorAll('.toggle-json');
    toggleJsonBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const jsonContent = this.nextElementSibling;
        const isHidden = jsonContent.style.display === 'none';
        jsonContent.style.display = isHidden ? 'block' : 'none';
        this.textContent = isHidden ? '隐藏详情' : '显示详情';
      });
    });
  }
}

/**
 * 获取并显示Markdown内容
 * @param {string} url - Markdown文件URL
 * @param {HTMLElement} container - 容器元素
 */
export async function fetchAndDisplayMarkdown(url, container) {
  const previewContainer = document.createElement('div');
  previewContainer.className = 'markdown-content-preview';
  previewContainer.innerHTML = '<div class="preview-loading"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
  
  // 找到预览按钮容器并在其后添加
  const btnContainer = container.querySelector('.markdown-preview-btn');
  if (btnContainer) {
    btnContainer.after(previewContainer);
  } else {
    container.appendChild(previewContainer);
  }
  
  try {
    // 获取Markdown内容
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('网络响应异常');
    }
    
    const markdown = await response.text();
    
    // 渲染Markdown
    previewContainer.innerHTML = `
      <div class="markdown-preview-header">
        <button class="btn btn-sm btn-outline-secondary close-preview">
          <i class="fas fa-times"></i> 关闭预览
        </button>
      </div>
      <div class="markdown-preview-content">${marked.parse(markdown)}</div>
    `;
    
    // 添加关闭按钮功能
    const closeBtn = previewContainer.querySelector('.close-preview');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        previewContainer.remove();
      });
    }
    
    // 应用代码高亮
    previewContainer.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightBlock(block);
    });
  } catch (error) {
    previewContainer.innerHTML = `<div class="alert alert-danger">加载Markdown失败: ${error.message}</div>`;
  }
}

/**
 * 显示HTML预览
 * @param {string} url - HTML文件URL
 * @param {HTMLElement} container - 容器元素
 */
export function displayHtmlPreview(url, container) {
  const previewContainer = document.createElement('div');
  previewContainer.className = 'html-content-preview';
  
  // 创建iframe容器和头部
  previewContainer.innerHTML = `
    <div class="html-preview-header">
      <button class="btn btn-sm btn-outline-secondary close-preview">
        <i class="fas fa-times"></i> 关闭预览
      </button>
      <a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary">
        <i class="fas fa-external-link-alt"></i> 在新标签页中打开
      </a>
    </div>
    <div class="iframe-container">
      <iframe src="${url}" sandbox="allow-scripts" class="html-preview-iframe"></iframe>
    </div>
  `;
  
  // 找到预览按钮容器并在其后添加
  const btnContainer = container.querySelector('.html-preview-btn');
  if (btnContainer) {
    btnContainer.after(previewContainer);
  } else {
    container.appendChild(previewContainer);
  }
  
  // 添加关闭按钮功能
  const closeBtn = previewContainer.querySelector('.close-preview');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      previewContainer.remove();
    });
  }
}

/**
 * 显示可用工具列表
 * @param {Array} tools - 工具列表
 */
export function displayTools(tools) {
  if (!elements.toolsGroup) return;
  
  elements.toolsGroup.innerHTML = '';
  
  tools.forEach(tool => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `<strong>${tool.name}</strong>: ${tool.description}`;
    elements.toolsGroup.appendChild(li);
  });
}

/**
 * 转义HTML特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
} 