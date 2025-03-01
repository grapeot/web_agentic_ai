/**
 * 配置模块 - 包含应用常量和设置
 */

/**
 * API端点配置
 * 将API端点动态获取
 */
export const API_URL = window.location.origin;

/**
 * 轮询间隔（毫秒）
 * 用于自动执行工具时的更新轮询
 */
export const POLLING_INTERVAL = 5000; // 5秒

/**
 * 默认设置
 * 应用的默认设置值
 */
export const DEFAULT_SETTINGS = {
  temperature: 0.5,
  maxTokens: 4000,
  thinkingMode: true,
  thinkingBudget: 2000,
  autoExecuteTools: true
};

/**
 * 工具结果展示配置
 */
export const TOOL_DISPLAY = {
  INITIAL_COLLAPSED: true,  // 工具调用默认折叠
  EXPAND_ARROW: '&#9660;',  // 展开箭头Unicode
  COLLAPSE_ARROW: '&#9654;' // 折叠箭头Unicode
};

/**
 * 消息类型常量
 */
export const MESSAGE_TYPES = {
  TEXT: 'text',
  TOOL_USE: 'tool_use',
  TOOL_RESULT: 'tool_result'
};

/**
 * 角色类型常量
 */
export const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  THINKING: 'thinking'
}; 