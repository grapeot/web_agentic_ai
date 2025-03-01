/**
 * 文件预览模块 - 处理各种文件预览功能
 */

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
 * 处理文件结果
 * @param {Object} fileResult - 文件结果对象
 * @returns {string} HTML内容
 */
export function processFileResult(fileResult) {
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
 */
export function processGeneratedFiles(result) {
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
 */
export function addFileResultEventListeners(container, parsedResult) {
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