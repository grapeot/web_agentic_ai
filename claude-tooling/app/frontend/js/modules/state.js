/**
 * 状态管理模块 - 管理应用状态
 */
import * as config from './config.js';

/**
 * 应用状态管理类
 * 管理聊天状态、消息历史、设置和工具状态
 */
class StateManager {
  constructor() {
    // 初始化状态
    this.reset();
  }
  
  /**
   * 重置所有状态
   */
  reset() {
    // 对话状态
    this.conversationId = null;
    this.messages = [];
    
    // 工具状态
    this.currentToolUseId = null;
    this.waitingForToolResult = false;
    this.autoExecutingTools = false;
    this.pollingInterval = null;
    this.lastToolCallId = null;
    
    // 设置
    this.settings = { ...config.DEFAULT_SETTINGS };
  }
  
  /**
   * 更新设置
   * @param {string} key - 设置名称
   * @param {any} value - 设置值
   */
  updateSetting(key, value) {
    if (key in this.settings) {
      this.settings[key] = value;
    }
  }
  
  /**
   * 获取当前设置
   * @returns {Object} 当前设置
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * 添加消息到历史
   * @param {Object} message - 消息对象
   */
  addMessage(message) {
    this.messages.push(message);
  }
  
  /**
   * 获取消息历史
   * @returns {Array} 消息历史
   */
  getMessages() {
    return [...this.messages];
  }
  
  /**
   * 设置对话ID
   * @param {string} id - 对话ID
   */
  setConversationId(id) {
    this.conversationId = id;
  }
  
  /**
   * 获取对话ID
   * @returns {string|null} 对话ID或null
   */
  getConversationId() {
    return this.conversationId;
  }
  
  /**
   * 设置当前工具使用ID
   * @param {string} id - 工具使用ID
   */
  setCurrentToolUseId(id) {
    this.currentToolUseId = id;
  }
  
  /**
   * 获取当前工具使用ID
   * @returns {string|null} 工具使用ID或null
   */
  getCurrentToolUseId() {
    return this.currentToolUseId;
  }
  
  /**
   * 设置工具结果等待状态
   * @param {boolean} waiting - 是否等待工具结果
   */
  setWaitingForToolResult(waiting) {
    this.waitingForToolResult = waiting;
  }
  
  /**
   * 获取工具结果等待状态
   * @returns {boolean} 是否在等待工具结果
   */
  isWaitingForToolResult() {
    return this.waitingForToolResult;
  }
  
  /**
   * 设置自动执行工具状态
   * @param {boolean} auto - 是否自动执行工具
   */
  setAutoExecutingTools(auto) {
    this.autoExecutingTools = auto;
  }
  
  /**
   * 获取自动执行工具状态
   * @returns {boolean} 是否自动执行工具
   */
  isAutoExecutingTools() {
    return this.autoExecutingTools;
  }
  
  /**
   * 设置轮询间隔ID
   * @param {number|null} intervalId - 轮询间隔ID
   */
  setPollingInterval(intervalId) {
    this.pollingInterval = intervalId;
  }
  
  /**
   * 获取轮询间隔ID
   * @returns {number|null} 轮询间隔ID
   */
  getPollingInterval() {
    return this.pollingInterval;
  }
  
  /**
   * 设置最后工具调用ID
   * @param {string} id - 工具调用ID
   */
  setLastToolCallId(id) {
    this.lastToolCallId = id;
  }
  
  /**
   * 获取最后工具调用ID
   * @returns {string|null} 工具调用ID
   */
  getLastToolCallId() {
    return this.lastToolCallId;
  }
}

// 创建并导出状态管理实例
const state = new StateManager();

export { state }; 