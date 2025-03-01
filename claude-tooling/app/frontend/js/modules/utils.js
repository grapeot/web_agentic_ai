/**
 * 工具函数模块 - 包含各种辅助函数
 */

/**
 * 转义HTML特殊字符
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
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
 * 解析JSON，处理错误
 * @param {string} jsonString - JSON字符串
 * @param {*} defaultValue - 解析失败时返回的默认值
 * @returns {*} 解析后的JSON对象或默认值
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON解析错误:', e);
    return defaultValue;
  }
}

/**
 * 安全地将值转换为JSON字符串
 * @param {*} value - 要转换的值
 * @param {number} indent - 缩进空格数
 * @returns {string} JSON字符串
 */
export function safeJsonStringify(value, indent = 2) {
  try {
    return JSON.stringify(value, null, indent);
  } catch (e) {
    console.error('JSON字符串化错误:', e);
    return '';
  }
}

/**
 * 深拷贝对象
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 对象的深拷贝
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('深拷贝错误:', e);
    return obj;
  }
}

/**
 * 从文件路径获取文件名
 * @param {string} path - 文件路径
 * @returns {string} 文件名
 */
export function getFileName(path) {
  if (!path) return '';
  return path.split('/').pop();
}

/**
 * 从URL获取查询参数
 * @param {string} name - 参数名
 * @param {string} [url=window.location.href] - URL
 * @returns {string|null} 参数值
 */
export function getUrlParameter(name, url = window.location.href) {
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
 * @returns {Function} 防抖处理后的函数
 */
export function debounce(func, wait = 300) {
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
 * @returns {Function} 节流处理后的函数
 */
export function throttle(func, limit = 300) {
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
 * 格式化时间戳为可读字符串
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * 生成随机ID
 * @param {number} [length=8] - ID长度
 * @returns {string} 随机ID
 */
export function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
} 