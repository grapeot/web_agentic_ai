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
    
    // Create plain text rendering with line breaks preserved
    const htmlContent = utils.escapeHtml(markdownText)
      .replace(/\n/g, '<br>');
    
    // Replace preview content
    previewContainer.innerHTML = `
      <div class="markdown-preview-header">
        <button class="btn btn-sm btn-outline-secondary ${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}">
          <i class="fas fa-times"></i> Close Preview
        </button>
      </div>
      <div class="markdown-preview-content">${htmlContent}</div>
    `;
    
    // Add close button functionality
    const closeBtn = previewContainer.querySelector(`.${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        previewContainer.remove();
      });
    }
    
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
 * Display image preview
 * @param {string} url - Image URL
 * @param {string} filename - Image filename
 * @param {HTMLElement} container - Optional container element (for inline display)
 * @returns {HTMLElement} The created image preview element
 */
function displayImagePreview(url, filename, container = null) {
  const previewContainer = document.createElement('div');
  previewContainer.className = config.CSS_CLASSES.PREVIEW.IMAGE;
  
  previewContainer.innerHTML = `
    <div class="image-preview-header">
      <span class="image-filename">${filename || 'Image Preview'}</span>
      <button class="btn btn-sm btn-outline-secondary ${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}">
        <i class="fas fa-times"></i> Close
      </button>
    </div>
    <div class="image-container">
      <img src="${url}" alt="${filename || 'Generated image'}" class="preview-image">
    </div>
    <div class="image-actions">
      <a href="${url}" target="_blank" class="btn btn-sm btn-outline-primary">
        <i class="fas fa-external-link-alt"></i> Open Full Size
      </a>
      <a href="${url}" download="${filename}" class="btn btn-sm btn-outline-success">
        <i class="fas fa-download"></i> Download
      </a>
    </div>
  `;
  
  // Add close button functionality
  const closeBtn = previewContainer.querySelector(`.${config.CSS_CLASSES.PREVIEW.CLOSE_BTN}`);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      previewContainer.remove();
    });
  }
  
  // Add click-to-zoom functionality
  const imageElement = previewContainer.querySelector('.preview-image');
  if (imageElement) {
    imageElement.addEventListener('click', function() {
      openImageViewer(url, filename);
    });
  }
  
  // If container provided, add to container
  if (container) {
    container.appendChild(previewContainer);
  }
  
  return previewContainer;
}

/**
 * Open image viewer modal
 * @param {string} url - Image URL
 * @param {string} filename - Image filename
 */
function openImageViewer(url, filename) {
  // Check if viewer already exists
  let viewer = document.querySelector('.image-viewer-modal');
  if (viewer) {
    viewer.remove();
  }
  
  // Create modal
  viewer = document.createElement('div');
  viewer.className = 'image-viewer-modal';
  
  viewer.innerHTML = `
    <div class="image-viewer-content">
      <div class="image-viewer-header">
        <span class="image-viewer-title">${filename || 'Image Preview'}</span>
        <button class="image-viewer-close">&times;</button>
      </div>
      <div class="image-viewer-body">
        <img src="${url}" alt="${filename || 'Image preview'}" class="image-viewer-img">
      </div>
    </div>
  `;
  
  // Add close functionality
  const closeBtn = viewer.querySelector('.image-viewer-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      viewer.remove();
    });
  }
  
  // Close when clicking outside
  viewer.addEventListener('click', function(event) {
    if (event.target === viewer) {
      viewer.remove();
    }
  });
  
  // Add to body
  document.body.appendChild(viewer);
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
        
        displayImagePreview(fileUrl, '', fileItemContainer);
      }
    });
  });
}

/**
 * Process and display files from tool result
 * @param {Object} toolResult - Tool result object containing generated_files
 * @param {HTMLElement} container - Container to append files to
 * @returns {HTMLElement|null} Container with files or null if no files
 */
function displayToolGeneratedFiles(toolResult, container) {
  if (!toolResult || !toolResult.generated_files || !toolResult.generated_files.length) {
    return null;
  }
  
  const filesContainer = document.createElement('div');
  filesContainer.className = 'tool-generated-files';
  
  // Add header
  const header = document.createElement('div');
  header.className = 'tool-files-header';
  header.innerHTML = `<h5><i class="fas fa-file-alt"></i> Generated Files</h5>`;
  filesContainer.appendChild(header);
  
  // Process each file
  const fileList = document.createElement('div');
  fileList.className = 'tool-files-list';
  
  toolResult.generated_files.forEach(file => {
    // Auto display images
    if (file.render_type === 'image') {
      const imagePreview = displayImagePreview(file.file_url, file.file_name);
      fileList.appendChild(imagePreview);
    } else {
      // For other file types, create a file item
      const fileItem = document.createElement('div');
      fileItem.className = 'tool-file-item';
      
      // Determine file icon
      const fileType = utils.getFileType(file.file_name);
      const fileIcon = utils.getFileIcon(file.file_name);
      
      fileItem.innerHTML = `
        <div class="file-info">
          <i class="fas ${fileIcon} file-icon"></i>
          <span class="file-name">${file.file_name}</span>
          <span class="file-size">(${formatFileSize(file.file_size)})</span>
        </div>
        <div class="file-actions">
          <button class="btn btn-sm btn-outline-primary file-preview-btn">
            <i class="fas fa-eye"></i> Preview
          </button>
          <a href="${file.file_url}" download="${file.file_name}" class="btn btn-sm btn-outline-success">
            <i class="fas fa-download"></i> Download
          </a>
        </div>
      `;
      
      // Add preview button event listener
      const previewBtn = fileItem.querySelector('.file-preview-btn');
      if (previewBtn) {
        previewBtn.addEventListener('click', () => {
          if (fileType === 'markdown') {
            fetchAndDisplayMarkdown(file.file_url, fileItem);
          } else if (fileType === 'html') {
            displayHtmlPreview(file.file_url, fileItem);
          } else if (fileType === 'image') {
            displayImagePreview(file.file_url, file.file_name, fileItem);
          } else {
            // Default to opening in new tab
            window.open(file.file_url, '_blank');
          }
        });
      }
      
      fileList.appendChild(fileItem);
    }
  });
  
  filesContainer.appendChild(fileList);
  
  // Add to container if provided
  if (container) {
    container.appendChild(filesContainer);
  }
  
  return filesContainer;
}

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0 || !bytes) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export {
  fetchAndDisplayMarkdown,
  displayHtmlPreview,
  displayImagePreview,
  processFileResult,
  processGeneratedFiles,
  addFileResultEventListeners,
  displayToolGeneratedFiles
}; 