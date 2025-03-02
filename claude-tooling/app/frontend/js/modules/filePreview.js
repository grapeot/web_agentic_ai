/**
 * File Preview Module
 * Handles file preview functionality
 */
import * as config from './config.js';
import * as utils from './utils.js';

/**
 * Fetch and display Markdown content
 * @param {string} url - Markdown file URL
 * @param {HTMLElement} container - Container element
 */
async function fetchAndDisplayMarkdown(url, container) {
  const previewContainer = document.createElement('div');
  previewContainer.className = config.CSS_CLASSES.PREVIEW.MARKDOWN;
  previewContainer.innerHTML = `
    <div class="${config.CSS_CLASSES.PREVIEW.LOADING}">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;
  
  // Find preview button container and insert after it
  const btnContainer = container.querySelector('.markdown-preview-btn');
  if (btnContainer) {
    btnContainer.after(previewContainer);
  } else {
    container.appendChild(previewContainer);
  }
  
  try {
    // Fetch Markdown content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.status} ${response.statusText}`);
    }
    
    const markdownText = await response.text();
    
    // Create marked instance and configure
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
    
    // Replace preview content
    previewContainer.innerHTML = `
      <div class="markdown-preview-header">
        <button class="btn btn-sm btn-outline-secondary ${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}">
          <i class="fas fa-times"></i> Close Preview
        </button>
      </div>
      <div class="markdown-preview-content">${markedInstance}</div>
    `;
    
    // Add close button functionality
    const closeBtn = previewContainer.querySelector(`.${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        previewContainer.remove();
      });
    }
    
    // Apply syntax highlighting to code blocks
    previewContainer.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
    
    // Handle links to open in new tab
    previewContainer.querySelectorAll('a').forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
  } catch (error) {
    previewContainer.innerHTML = `<div class="alert alert-danger">Preview load failed: ${error.message}</div>`;
    console.error('Markdown preview error:', error);
  }
}

/**
 * Display HTML preview
 * @param {string} url - HTML file URL
 * @param {HTMLElement} container - Container element
 */
function displayHtmlPreview(url, container) {
  const previewContainer = document.createElement('div');
  previewContainer.className = config.CSS_CLASSES.PREVIEW.HTML;
  
  // Create iframe container with header
  previewContainer.innerHTML = `
    <div class="html-preview-header">
      <button class="btn btn-sm btn-outline-secondary ${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}">
        <i class="fas fa-times"></i> Close Preview
      </button>
      <a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary">
        <i class="fas fa-external-link-alt"></i> Open in New Tab
      </a>
    </div>
    <div class="iframe-container">
      <iframe src="${url}" sandbox="allow-scripts" class="html-preview-iframe"></iframe>
    </div>
  `;
  
  // Find preview button container and insert after it
  const btnContainer = container.querySelector('.html-preview-btn');
  if (btnContainer) {
    btnContainer.after(previewContainer);
  } else {
    container.appendChild(previewContainer);
  }
  
  // Add close button functionality
  const closeBtn = previewContainer.querySelector(`.${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}`);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      previewContainer.remove();
    });
  }
}

/**
 * Process file result
 * @param {Object} fileResult - File result object
 * @returns {Object|null} Processed file info or null if invalid
 */
function processFileResult(fileResult) {
  if (!fileResult || !fileResult.files || !Array.isArray(fileResult.files)) {
    console.error('Invalid file result format:', fileResult);
    return null;
  }
  
  const filesInfo = fileResult.files.map(file => {
    const filename = utils.getFileName(file.path);
    const fileType = utils.getFileType(filename);
    const fileIcon = utils.getFileIcon(filename);
    
    return {
      originalFile: file,
      filename,
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
 * Process generated files
 * @param {Object} result - Tool result
 * @returns {string} HTML content
 */
function processGeneratedFiles(result) {
  const parsedResult = processFileResult(result);
  if (!parsedResult) {
    return '<div class="alert alert-warning">Invalid file result format</div>';
  }
  
  // Create main container
  const container = document.createElement('div');
  container.className = 'generated-files';
  
  // Add message text
  if (parsedResult.message && parsedResult.message.trim() !== '') {
    const messageElement = document.createElement('div');
    messageElement.className = 'generated-files-message';
    messageElement.textContent = parsedResult.message;
    container.appendChild(messageElement);
  }
  
  // Create file list
  const fileList = document.createElement('div');
  fileList.className = 'file-list';
  
  // Add file items
  parsedResult.filesInfo.forEach(fileInfo => {
    const fileItem = document.createElement('div');
    fileItem.className = config.CSS_CLASSES.FILE.RESULT;
    fileItem.setAttribute('data-file-path', fileInfo.originalFile.path);
    
    // File icon
    const iconElement = document.createElement('i');
    iconElement.className = `fas ${fileInfo.fileIcon} file-icon`;
    fileItem.appendChild(iconElement);
    
    // File name
    const nameElement = document.createElement('span');
    nameElement.className = 'file-name';
    nameElement.textContent = fileInfo.filename;
    fileItem.appendChild(nameElement);
    
    // Add preview button if supported
    if (['markdown', 'html', 'image'].includes(fileInfo.fileType)) {
      const previewBtn = document.createElement('button');
      previewBtn.className = `btn btn-sm btn-outline-primary ${fileInfo.fileType}-preview-btn`;
      previewBtn.innerHTML = '<i class="fas fa-eye"></i> Preview';
      previewBtn.setAttribute('data-file-url', fileInfo.originalFile.url);
      fileItem.appendChild(previewBtn);
    }
    
    // Add download button
    const downloadBtn = document.createElement('a');
    downloadBtn.className = `btn btn-sm btn-outline-success ${config.CSS_CLASSES.FILE.DOWNLOAD_LINK}`;
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
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
 * Add event listeners for file result
 * @param {HTMLElement} container - Container element
 * @param {Object} parsedResult - Processed result
 */
function addFileResultEventListeners(container, parsedResult) {
  // Handle markdown preview
  container.querySelectorAll('.markdown-preview-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileUrl = this.getAttribute('data-file-url');
      if (fileUrl) {
        const fileItemContainer = this.closest(`.${config.CSS_CLASSES.FILE.RESULT}`);
        fetchAndDisplayMarkdown(fileUrl, fileItemContainer);
      }
    });
  });
  
  // Handle HTML preview
  container.querySelectorAll('.html-preview-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileUrl = this.getAttribute('data-file-url');
      if (fileUrl) {
        const fileItemContainer = this.closest(`.${config.CSS_CLASSES.FILE.RESULT}`);
        displayHtmlPreview(fileUrl, fileItemContainer);
      }
    });
  });
  
  // Handle image preview
  container.querySelectorAll('.image-preview-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileUrl = this.getAttribute('data-file-url');
      if (fileUrl) {
        const fileItemContainer = this.closest(`.${config.CSS_CLASSES.FILE.RESULT}`);
        
        // Remove existing preview
        const existingPreview = fileItemContainer.querySelector(`.${config.CSS_CLASSES.PREVIEW.IMAGE}`);
        if (existingPreview) {
          existingPreview.remove();
          return;
        }
        
        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = config.CSS_CLASSES.PREVIEW.IMAGE;
        
        // Create image element
        const imageElement = document.createElement('img');
        imageElement.src = fileUrl;
        imageElement.className = 'preview-image';
        previewContainer.appendChild(imageElement);
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = `btn btn-sm btn-outline-secondary ${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}`;
        closeButton.innerHTML = '<i class="fas fa-times"></i> Close Preview';
        closeButton.addEventListener('click', function() {
          previewContainer.remove();
        });
        previewContainer.prepend(closeButton);
        
        // Add to file item
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