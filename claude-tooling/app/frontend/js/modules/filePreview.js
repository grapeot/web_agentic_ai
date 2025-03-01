/**
 * 文件预览模块 - 处理各种文件预览功能
 */

/**
 * 获取并显示Markdown内容
 * @param {string} url - Markdown文件URL
 * @param {HTMLElement} container - 容器元素
 */
async function fetchAndDisplayMarkdown(url, container) {
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
      throw new Error(`加载失败: ${response.status} ${response.statusText}`);
    }
    
    const markdownText = await response.text();
    
    // 创建marked实例并设置
    const markedInstance = marked.parse(markdownText, {
      breaks: true,
      smartLists: true,
      highlight: function(code, language) {
        if (hljs.getLanguage(language)) {
          return hljs.highlight(code, { language }).value;
        }
        return hljs.highlightAuto(code).value;
      }
    });
    
    // 替换预览内容
    previewContainer.innerHTML = markedInstance;
    
    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'btn btn-sm btn-outline-secondary close-preview-btn';
    closeButton.innerHTML = '关闭预览';
    closeButton.addEventListener('click', function() {
      previewContainer.remove();
    });
    
    previewContainer.prepend(closeButton);
    
    // 为代码块添加行号
    previewContainer.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
    
    // 处理链接，打开新窗口
    previewContainer.querySelectorAll('a').forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  } catch (error) {
    previewContainer.innerHTML = `<div class="alert alert-danger">预览加载失败: ${error.message}</div>`;
    console.error('Markdown预览错误:', error);
  }
}

/**
 * 显示HTML预览
 * @param {string} url - HTML文件URL
 * @param {HTMLElement} container - 容器元素
 */
function displayHtmlPreview(url, container) {
  // 创建预览容器
  const previewContainer = document.createElement('div');
  previewContainer.className = 'html-content-preview';
  
  // 创建iframe
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.className = 'html-preview-iframe';
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.onload = function() {
    // iframe加载完成后移除加载指示器
    const loadingElement = previewContainer.querySelector('.preview-loading');
    if (loadingElement) loadingElement.remove();
  };
  
  // 添加加载指示器
  previewContainer.innerHTML = '<div class="preview-loading"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
  previewContainer.appendChild(iframe);
  
  // 添加关闭按钮
  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-sm btn-outline-secondary close-preview-btn';
  closeButton.innerHTML = '关闭预览';
  closeButton.addEventListener('click', function() {
    previewContainer.remove();
  });
  
  previewContainer.prepend(closeButton);
  
  // 找到预览按钮容器并在其后添加
  const btnContainer = container.querySelector('.html-preview-btn');
  if (btnContainer) {
    btnContainer.after(previewContainer);
  } else {
    container.appendChild(previewContainer);
  }
}

/**
 * 处理文件结果
 * @param {Object} fileResult - 文件结果对象
 */
function processFileResult(fileResult) {
  if (!fileResult || !fileResult.files || !Array.isArray(fileResult.files)) {
    console.error('Invalid file result format:', fileResult);
    return null;
  }
  
  const filesInfo = fileResult.files.map(file => {
    // 提取文件名
    const filename = file.path.split('/').pop();
    
    // 提取文件扩展名
    const extension = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    
    // 确定文件类型和图标
    let fileType = 'unknown';
    let fileIcon = 'fa-file';
    
    switch (extension) {
      case 'md':
        fileType = 'markdown';
        fileIcon = 'fa-file-alt';
        break;
      case 'html':
        fileType = 'html';
        fileIcon = 'fa-file-code';
        break;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        fileType = 'code';
        fileIcon = 'fa-file-code';
        break;
      case 'css':
      case 'scss':
      case 'less':
        fileType = 'style';
        fileIcon = 'fa-file-code';
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        fileType = 'image';
        fileIcon = 'fa-file-image';
        break;
      case 'pdf':
        fileType = 'pdf';
        fileIcon = 'fa-file-pdf';
        break;
      default:
        if (filename.startsWith('.')) {
          fileType = 'config';
          fileIcon = 'fa-cog';
        }
    }
    
    return {
      originalFile: file,
      filename,
      extension,
      fileType,
      fileIcon
    };
  });
  
  return {
    message: fileResult.message || '',
    filesInfo
  };
}

/**
 * 处理生成的文件
 * @param {Object} result - 工具结果
 * @returns {string} HTML内容
 */
function processGeneratedFiles(result) {
  const parsedResult = processFileResult(result);
  if (!parsedResult) {
    return '<div class="alert alert-warning">无效的文件结果格式</div>';
  }
  
  // 创建主容器
  const container = document.createElement('div');
  container.className = 'generated-files';
  
  // 添加说明文本
  if (parsedResult.message && parsedResult.message.trim() !== '') {
    const messageElement = document.createElement('div');
    messageElement.className = 'generated-files-message';
    messageElement.textContent = parsedResult.message;
    container.appendChild(messageElement);
  }
  
  // 创建文件列表
  const fileList = document.createElement('div');
  fileList.className = 'file-list';
  
  // 添加文件项
  parsedResult.filesInfo.forEach(fileInfo => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.setAttribute('data-file-path', fileInfo.originalFile.path);
    
    // 文件图标
    const iconElement = document.createElement('i');
    iconElement.className = `fas ${fileInfo.fileIcon} file-icon`;
    fileItem.appendChild(iconElement);
    
    // 文件名
    const nameElement = document.createElement('span');
    nameElement.className = 'file-name';
    nameElement.textContent = fileInfo.filename;
    fileItem.appendChild(nameElement);
    
    // 添加预览按钮，如果文件类型支持预览
    if (['markdown', 'html', 'image', 'pdf'].includes(fileInfo.fileType)) {
      const previewBtn = document.createElement('button');
      previewBtn.className = `btn btn-sm btn-outline-primary ${fileInfo.fileType}-preview-btn`;
      previewBtn.innerHTML = '<i class="fas fa-eye"></i> 预览';
      previewBtn.setAttribute('data-file-url', fileInfo.originalFile.url);
      fileItem.appendChild(previewBtn);
    }
    
    // 添加下载按钮
    const downloadBtn = document.createElement('a');
    downloadBtn.className = 'btn btn-sm btn-outline-success file-download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> 下载';
    downloadBtn.setAttribute('href', fileInfo.originalFile.url);
    downloadBtn.setAttribute('download', fileInfo.filename);
    fileItem.appendChild(downloadBtn);
    
    fileList.appendChild(fileItem);
  });
  
  container.appendChild(fileList);
  addFileResultEventListeners(container, parsedResult);
  
  return container.outerHTML;
}

/**
 * 为文件结果添加事件监听器
 * @param {HTMLElement} container - 容器元素
 * @param {Object} parsedResult - 处理后的结果
 */
function addFileResultEventListeners(container, parsedResult) {
  // 处理markdown预览
  container.querySelectorAll('.markdown-preview-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileUrl = this.getAttribute('data-file-url');
      if (fileUrl) {
        const fileItemContainer = this.closest('.file-item');
        fetchAndDisplayMarkdown(fileUrl, fileItemContainer);
      }
    });
  });
  
  // 处理HTML预览
  container.querySelectorAll('.html-preview-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileUrl = this.getAttribute('data-file-url');
      if (fileUrl) {
        const fileItemContainer = this.closest('.file-item');
        displayHtmlPreview(fileUrl, fileItemContainer);
      }
    });
  });
  
  // 处理图像预览
  container.querySelectorAll('.image-preview-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileUrl = this.getAttribute('data-file-url');
      if (fileUrl) {
        const fileItemContainer = this.closest('.file-item');
        
        // 移除现有预览
        const existingPreview = fileItemContainer.querySelector('.image-preview-container');
        if (existingPreview) {
          existingPreview.remove();
          return;
        }
        
        // 创建预览容器
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        
        // 创建图像元素
        const imageElement = document.createElement('img');
        imageElement.src = fileUrl;
        imageElement.className = 'image-preview';
        previewContainer.appendChild(imageElement);
        
        // 添加关闭按钮
        const closeButton = document.createElement('button');
        closeButton.className = 'btn btn-sm btn-outline-secondary close-preview-btn';
        closeButton.innerHTML = '关闭预览';
        closeButton.addEventListener('click', function() {
          previewContainer.remove();
        });
        previewContainer.prepend(closeButton);
        
        // 添加到文件项
        fileItemContainer.appendChild(previewContainer);
      }
    });
  });
}

export {
  fetchAndDisplayMarkdown,
  displayHtmlPreview,
  processFileResult,
  processGeneratedFiles,
  addFileResultEventListeners
}; 