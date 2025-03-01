/**
 * 工具函数模块 - 包含各种辅助函数
 */

/**
 * 转义HTML特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
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
 * 安全地解析JSON字符串
 * @param {string} jsonString - 要解析的JSON字符串
 * @param {*} defaultValue - 如果解析失败返回的默认值
 * @returns {*} 解析结果或默认值
 */
function safeJsonParse(jsonString, defaultValue = null) {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON解析错误:', error);
    return defaultValue;
  }
}

/**
 * 安全地将值转换为JSON字符串
 * @param {*} value - 要转换的值
 * @param {number} indent - 缩进空格数
 * @returns {string} JSON字符串
 */
function safeJsonStringify(value, indent = 2) {
  try {
    return JSON.stringify(value, null, indent);
  } catch (error) {
    console.error('JSON字符串化错误:', error);
    return '{}';
  }
}

/**
 * 深度克隆对象
 * @param {*} obj - 要克隆的对象
 * @returns {*} 克隆后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // 处理Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  // 处理对象
  const cloned = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  
  return cloned;
}

/**
 * 从路径中获取文件名
 * @param {string} path - 文件路径
 * @returns {string} 文件名
 */
function getFileName(path) {
  if (!path) return '';
  
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * 从URL中获取参数
 * @param {string} name - 参数名
 * @param {string} url - URL，默认为当前页面URL
 * @returns {string|null} 参数值，如果不存在则返回null
 */
function getUrlParameter(name, url = window.location.href) {
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  
  if (!results) return null;
  if (!results[2]) return '';
  
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
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
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
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
 * 格式化时间戳
 * @param {number} timestamp - 时间戳（毫秒）
 * @returns {string} 格式化后的时间字符串
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
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
  getUrlParameter,
  debounce,
  throttle,
  formatTimestamp,
  generateRandomId
}; 