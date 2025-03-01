/**
 * 配置模块 - 包含应用常量和设置
 */

/**
 * API端点配置
 * 动态检测API端点
 */
// 更灵活的API URL检测
const API_URL = (() => {
  // 检查是否存在环境变量或全局配置
  if (window.API_BASE_URL) {
    return window.API_BASE_URL;
  }

  // 如果在同一域名下访问前端和API（由FastAPI的mount静态文件提供）
  if (window.location.pathname.startsWith('/frontend/')) {
    // 使用相同的origin，但路径不带/frontend
    return window.location.origin;
  }

  // 开发环境下，或者分离部署时的默认回退方案
  // 尝试使用相对路径，让web服务器处理代理
  return '';
})();

/**
 * 轮询间隔（毫秒）
 * 用于自动执行工具时的更新轮询
 */
const POLLING_INTERVAL = 5000; // 5秒

/**
 * 默认设置
 * 应用的默认设置值
 */
const DEFAULT_SETTINGS = {
  temperature: 0.5,
  maxTokens: 4000,
  thinkingMode: true,
  thinkingBudget: 2000,
  autoExecuteTools: true
};

/**
 * 工具结果展示配置
 */
const TOOL_DISPLAY = {
  INITIAL_COLLAPSED: true,  // 工具调用默认折叠
  EXPAND_ARROW: '&#9654;',  // 展开箭头Unicode (▶)
  COLLAPSE_ARROW: '&#9660;' // 折叠箭头Unicode (▼)
};

/**
 * 消息类型常量
 */
const MESSAGE_TYPES = {
  TEXT: 'text',
  TOOL_USE: 'tool_use',
  TOOL_RESULT: 'tool_result'
};

/**
 * 角色类型常量
 */
const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  THINKING: 'thinking'
};

// ES模块导出
export {
  API_URL,
  POLLING_INTERVAL,
  DEFAULT_SETTINGS,
  TOOL_DISPLAY,
  MESSAGE_TYPES,
  ROLES
}; 