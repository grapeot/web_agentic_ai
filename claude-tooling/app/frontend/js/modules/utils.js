/**
 * Utility Functions Module
 * Contains helper functions used across the application
 */
import * as config from './config.js';

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/**
 * Safely parse JSON string
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed result or default value
 */
function safeJsonParse(jsonString, defaultValue = null) {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * Safely stringify value to JSON
 * @param {*} value - Value to stringify
 * @param {number} indent - Indentation spaces
 * @returns {string} JSON string
 */
function safeJsonStringify(value, indent = 2) {
  try {
    return JSON.stringify(value, null, indent);
  } catch (error) {
    console.error('JSON stringify error:', error);
    return '{}';
  }
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  // Handle Object
  const cloned = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  
  return cloned;
}

/**
 * Get filename from path
 * @param {string} path - File path
 * @returns {string} Filename
 */
function getFileName(path) {
  if (!path) return '';
  
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
function getFileExtension(filename) {
  if (!filename) return '';
  
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Get file type based on extension
 * @param {string} filename - Filename
 * @returns {string} File type (image, markdown, html, code, style, unknown)
 */
function getFileType(filename) {
  const extension = getFileExtension(filename);
  
  if (config.FILE_PREVIEW.SUPPORTED_TYPES.IMAGE.includes(extension)) {
    return 'image';
  }
  if (config.FILE_PREVIEW.SUPPORTED_TYPES.MARKDOWN.includes(extension)) {
    return 'markdown';
  }
  if (config.FILE_PREVIEW.SUPPORTED_TYPES.HTML.includes(extension)) {
    return 'html';
  }
  if (config.FILE_PREVIEW.SUPPORTED_TYPES.CODE.includes(extension)) {
    return 'code';
  }
  if (config.FILE_PREVIEW.SUPPORTED_TYPES.STYLE.includes(extension)) {
    return 'style';
  }
  
  return 'unknown';
}

/**
 * Get file icon class based on file type
 * @param {string} filename - Filename
 * @returns {string} Font Awesome icon class
 */
function getFileIcon(filename) {
  const extension = getFileExtension(filename);
  const fileType = getFileType(filename);
  
  switch (fileType) {
    case 'image':
      return config.FILE_PREVIEW.ICONS.IMAGE;
    case 'code':
    case 'style':
      return config.FILE_PREVIEW.ICONS.CODE;
    case 'pdf':
      return config.FILE_PREVIEW.ICONS.PDF;
    default:
      if (filename.startsWith('.')) {
        return config.FILE_PREVIEW.ICONS.CONFIG;
      }
      return config.FILE_PREVIEW.ICONS.FILE;
  }
}

/**
 * Clean up line breaks in text
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanLineBreaks(text) {
  if (!text) return '';
  
  // Replace 3 or more consecutive line breaks with 2
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Format timestamp
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Generate random ID
 * @param {number} length - ID length
 * @returns {string} Random ID
 */
function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

export {
  escapeHtml,
  safeJsonParse,
  safeJsonStringify,
  deepClone,
  getFileName,
  getFileExtension,
  getFileType,
  getFileIcon,
  cleanLineBreaks,
  debounce,
  throttle,
  formatTimestamp,
  generateRandomId
}; 