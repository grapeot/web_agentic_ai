/**
 * Claude Tooling 主入口文件
 * 负责应用初始化和模块整合
 */

// 导入所有模块
import { API_URL, POLLING_INTERVAL, DEFAULT_SETTINGS, TOOL_DISPLAY, MESSAGE_TYPES, ROLES } from './modules/config.js';
import * as api from './modules/api.js';
import { state } from './modules/state.js';
import * as ui from './modules/ui.js';
import * as events from './modules/events.js';
import * as tools from './modules/tools.js';
import * as filePreview from './modules/filePreview.js';
import * as utils from './modules/utils.js';

// 应用初始化
function initApp() {
  console.log('Claude Tooling 应用初始化中...');
  
  // 初始化UI元素
  ui.initializeUI();
  
  // 设置事件监听器
  events.setupEventListeners(ui.getElements());
  
  // 获取可用工具列表
  fetchTools();
  
  console.log('Claude Tooling 初始化完成');
}

// 获取可用工具
async function fetchTools() {
  ui.setToolsLoading(true);
  
  try {
    const toolsResponse = await api.fetchAvailableTools();
    if (toolsResponse && toolsResponse.tools) {
      ui.displayTools(toolsResponse.tools);
    }
  } catch (error) {
    console.error('获取工具列表失败:', error);
  } finally {
    ui.setToolsLoading(false);
  }
}

// 在DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 变量
let messages = [];
let conversationId = null;
let currentToolUseId = null;
let waitingForToolResult = false;
let isAutoExecutingTools = false;
let autoExecuteToolSetting = true;
let pollingInterval = null;
let lastToolCallId = null;

// 默认设置
const settings = {
  temperature: 0.5,
  maxTokens: 4000,
  thinkingMode: true,
  thinkingBudget: 2000
};

// 元素缓存
const elements = {};

// 原有功能函数 (保留以支持测试)
function fetchAvailableTools() {
  return api.fetchAvailableTools();
}

async function sendMessage() {
  // 这里临时实现，后续会替换为调用events.handleSendMessage
  const userMessage = elements.userInput.value.trim();
  if (!userMessage) return;
  
  addMessageToChat('user', userMessage);
  elements.userInput.value = '';
  
  ui.setLoading(true);
  
  try {
    const apiResponse = await api.sendMessage(
      buildMessagesForAPI(userMessage),
      state.getSettings(),
      state.getConversationId()
    );
    
    ui.setLoading(false);
    
    // 处理响应...
    // 临时实现，后续替换
  } catch (error) {
    ui.setLoading(false);
    console.error('Error sending message:', error);
  }
}

function buildMessagesForAPI(userMessage) {
  // 临时实现，后续替换
  return [];
}

function addMessageToChat(role, content) {
  // 临时实现，调用ui模块
  ui.addMessageToChat(role, content);
}

// 这里是导出部分，确保原有测试能够正常运行
// 后续重构时将逐步去除这部分
module.exports = {
  fetchAvailableTools,
  sendMessage,
  // 其他测试需要的函数...
}; 