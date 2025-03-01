/**
 * 工具处理模块 - 处理工具调用和自动执行
 */
import * as config from './config.js';
const POLLING_INTERVAL = config.POLLING_INTERVAL;
const MESSAGE_TYPES = config.MESSAGE_TYPES;
const ROLES = config.ROLES;
import { state } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';

/**
 * 处理助手消息内容
 * @param {Array} content - 消息内容数组
 */
function processAssistantMessage(content) {
  if (!content || !Array.isArray(content)) {
    console.error('Invalid message content:', content);
    return;
  }
  
  let textContent = '';
  let toolCalls = [];
  
  // 获取已显示的工具ID，避免重复显示
  const displayedToolIds = new Set();
  document.querySelectorAll('.tool-call').forEach(el => {
    if (el.dataset.toolUseId) {
      displayedToolIds.add(el.dataset.toolUseId);
    }
  });
  
  // 处理消息内容
  content.forEach(item => {
    if (item.type === MESSAGE_TYPES.TEXT) {
      // 文本消息
      textContent += item.text;
    } else if (item.type === MESSAGE_TYPES.TOOL_USE && !displayedToolIds.has(item.id)) {
      // 工具调用
      toolCalls.push({
        id: item.id,
        name: item.name,
        input: item.input
      });
      
      // 记录最后一个工具调用ID
      state.setLastToolCallId(item.id);
    }
  });
  
  // 显示文本消息
  if (textContent) {
    ui.addMessageToChat(ROLES.ASSISTANT, textContent);
  }
  
  // 显示工具调用
  toolCalls.forEach(toolCall => {
    ui.addToolCallToChat(toolCall);
  });
}

/**
 * 开始轮询更新
 * 在启用自动执行工具时使用
 */
function startPollingForUpdates() {
  // 停止任何现有轮询
  const existingInterval = state.getPollingInterval();
  if (existingInterval) {
    clearInterval(existingInterval);
  }
  
  // 检查是否启用自动执行
  if (!state.getSettings().autoExecuteTools) {
    console.log('自动执行工具已禁用，不启动轮询');
    return;
  }
  
  // 设置自动执行状态
  state.setAutoExecutingTools(true);
  ui.setAutoExecutionIndicator(true);
  
  // 创建轮询间隔
  const intervalId = setInterval(async () => {
    try {
      // 检查是否应继续轮询
      if (!state.isAutoExecutingTools() || !state.getConversationId()) {
        clearInterval(intervalId);
        state.setPollingInterval(null);
        ui.setAutoExecutionIndicator(false);
        return;
      }
      
      // 获取更新
      const updates = await api.getConversationUpdates(state.getConversationId());
      
      if (!updates) {
        console.log('未收到更新或会话不存在');
        return;
      }
      
      // 处理新消息
      if (updates.messages && updates.messages.length > 0) {
        updateChatWithNewMessages(updates.messages);
      }
      
      // 检查是否完成
      if (updates.completed) {
        console.log('会话已完成，停止轮询');
        clearInterval(intervalId);
        state.setPollingInterval(null);
        state.setAutoExecutingTools(false);
        ui.setAutoExecutionIndicator(false);
      }
    } catch (error) {
      console.error('轮询更新错误:', error);
    }
  }, POLLING_INTERVAL);
  
  // 保存轮询间隔ID
  state.setPollingInterval(intervalId);
  
  console.log('开始轮询会话更新');
}

/**
 * 处理更新中的新消息
 * @param {Array} newMessages - 新消息数组
 * @private
 */
function updateChatWithNewMessages(newMessages) {
  if (!Array.isArray(newMessages) || newMessages.length === 0) return;
  
  // 跟踪未处理的工具结果
  let pendingToolResults = new Map();
  
  // 查找上次处理的工具调用ID
  const lastHandledToolId = state.getLastToolCallId();
  let foundLastHandled = !lastHandledToolId; // 如果没有上次处理的ID，视为已找到
  let hasNewToolCalls = false;
  
  // 处理消息
  for (const message of newMessages) {
    if (message.role === ROLES.ASSISTANT && message.content) {
      // 助手消息处理
      const toolCalls = [];
      let textContent = '';
      
      // 处理消息内容
      for (const item of message.content) {
        if (item.type === MESSAGE_TYPES.TEXT) {
          textContent += item.text;
        } else if (item.type === MESSAGE_TYPES.TOOL_USE) {
          // 检查是否是新的工具调用
          if (lastHandledToolId === item.id) {
            foundLastHandled = true;
            continue; // 跳过已处理的工具调用
          }
          
          if (foundLastHandled) {
            toolCalls.push({
              id: item.id,
              name: item.name,
              input: item.input
            });
            
            hasNewToolCalls = true;
            state.setLastToolCallId(item.id);
          }
        }
      }
      
      // 显示文本和工具调用
      if (textContent && foundLastHandled) {
        ui.addMessageToChat(ROLES.ASSISTANT, textContent);
      }
      
      for (const toolCall of toolCalls) {
        ui.addToolCallToChat(toolCall);
      }
      
      // 添加消息到状态
      state.addMessage(message);
    } else if (message.role === ROLES.USER && message.content) {
      // 用户消息处理 - 查找工具结果
      for (const item of message.content) {
        if (item.type === MESSAGE_TYPES.TOOL_RESULT && item.tool_use_id) {
          pendingToolResults.set(item.tool_use_id, item.content);
        }
      }
    }
  }
  
  // 处理工具结果
  pendingToolResults.forEach((result, toolUseId) => {
    ui.addToolResultToChat(result, toolUseId);
  });
  
  // 更新自动执行指示器
  if (hasNewToolCalls) {
    ui.setAutoExecutionIndicator(true);
  } else if (pendingToolResults.size > 0 && !hasNewToolCalls) {
    // 如果有结果但没有新工具调用，可能是对话结束
    state.setAutoExecutingTools(false);
    ui.setAutoExecutionIndicator(false);
  }
}

export {
  processAssistantMessage,
  startPollingForUpdates,
  updateChatWithNewMessages
}; 