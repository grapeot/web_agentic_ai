/**
 * 工具处理模块 - 处理工具调用和自动执行
 */
import { POLLING_INTERVAL, MESSAGE_TYPES, ROLES } from './config.js';
import { state } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';

/**
 * 处理助手消息内容
 * @param {Array} content - 消息内容数组
 */
export function processAssistantMessage(content) {
  let textContent = '';
  let toolCalls = [];
  
  // 获取已显示的工具ID，避免重复显示
  const displayedToolIds = new Set();
  document.querySelectorAll('.tool-call').forEach(el => {
    if (el.dataset.toolId) {
      displayedToolIds.add(el.dataset.toolId);
    }
  });
  
  // 处理消息内容
  for (const item of content) {
    if (item.type === MESSAGE_TYPES.TEXT) {
      textContent += item.text;
    } else if (item.type === MESSAGE_TYPES.TOOL_USE && !displayedToolIds.has(item.id)) {
      toolCalls.push({
        id: item.id,
        name: item.name,
        input: item.input
      });
      displayedToolIds.add(item.id);
      state.setLastToolCallId(item.id);
    }
  }
  
  // 显示文本内容
  if (textContent) {
    ui.addMessageToChat(ROLES.ASSISTANT, textContent);
  }
  
  // 显示工具调用
  for (const toolCall of toolCalls) {
    ui.addToolCallToChat(toolCall);
  }
  
  // 添加到消息历史
  state.addMessage({
    role: ROLES.ASSISTANT,
    content: content
  });
}

/**
 * 开始轮询更新
 * 用于自动执行工具时监控对话状态变更
 */
export function startPollingForUpdates() {
  // 如果已有轮询间隔，先清除
  const existingInterval = state.getPollingInterval();
  if (existingInterval) {
    clearInterval(existingInterval);
  }
  
  // 验证必要条件
  const conversationId = state.getConversationId();
  if (!conversationId || !state.isAutoExecutingTools()) {
    ui.setAutoExecutionIndicator(false);
    return;
  }
  
  // 显示自动执行指示器
  ui.setAutoExecutionIndicator(true);
  
  // 设置新的轮询间隔
  const intervalId = setInterval(async () => {
    // 如果自动执行被禁用，停止轮询
    if (!state.isAutoExecutingTools()) {
      clearInterval(intervalId);
      ui.setAutoExecutionIndicator(false);
      return;
    }
    
    try {
      // 获取对话更新
      const response = await api.getConversationUpdates(conversationId);
      
      if (!response) {
        return null;
      }
      
      // 处理新消息
      if (response && response.messages && response.messages.length > 0) {
        updateChatWithNewMessages(response.messages);
        
        // 即使对话标记为完成，我们仍保持自动执行状态，允许继续交互
        if (response.status === "completed") {
          clearInterval(intervalId);
          state.setPollingInterval(null);
          ui.setAutoExecutionIndicator(false);
        }
      }
    } catch (error) {
      console.error("轮询更新错误:", error);
    }
  }, POLLING_INTERVAL);
  
  // 保存轮询间隔ID
  state.setPollingInterval(intervalId);
}

/**
 * 使用新消息更新聊天界面
 * @param {Array} newMessages - 新消息数组
 */
function updateChatWithNewMessages(newMessages) {
  // 获取当前消息数量
  let lastMessageIndex = state.getMessages().length - 1;
  
  // 获取已显示的工具ID和结果ID，避免重复显示
  const displayedToolIds = new Set();
  document.querySelectorAll('.tool-call').forEach(el => {
    if (el.dataset.toolId) {
      displayedToolIds.add(el.dataset.toolId);
    }
  });
  
  const displayedResultIds = new Set();
  document.querySelectorAll('.tool-result').forEach(el => {
    if (el.dataset.resultId) {
      displayedResultIds.add(el.dataset.resultId);
    }
  });
  
  // 标记是否有新工具调用或结果
  let hasNewToolCalls = false;
  let hasToolResults = false;
  
  // 处理新消息
  for (let i = lastMessageIndex + 1; i < newMessages.length; i++) {
    const msg = newMessages[i];
    
    if (msg.role === ROLES.ASSISTANT) {
      if (msg.content) {
        let textContent = '';
        let hasNewToolCall = false;
        let newToolCalls = [];
        
        // 处理助手消息内容
        for (const item of msg.content) {
          if (item.type === MESSAGE_TYPES.TEXT) {
            textContent += item.text;
          } else if (item.type === MESSAGE_TYPES.TOOL_USE && !displayedToolIds.has(item.id)) {
            displayedToolIds.add(item.id);
            state.setLastToolCallId(item.id);
            newToolCalls.push({
              id: item.id,
              name: item.name,
              input: item.input
            });
            hasNewToolCall = true;
            hasNewToolCalls = true;
          }
        }
        
        // 显示文本内容
        if (textContent) {
          ui.addMessageToChat(ROLES.ASSISTANT, textContent);
        }
        
        // 显示工具调用
        for (const toolCall of newToolCalls) {
          ui.addToolCallToChat(toolCall);
        }
        
        // 添加到消息历史
        if (textContent || hasNewToolCall) {
          state.addMessage(msg);
        }
      }
    } else if (msg.role === ROLES.USER && msg.content && msg.content.length > 0) {
      // 处理用户消息中的工具结果
      let hasToolResult = false;
      for (const item of msg.content) {
        if (item.type === MESSAGE_TYPES.TOOL_RESULT && !displayedResultIds.has(item.tool_use_id)) {
          displayedResultIds.add(item.tool_use_id);
          ui.addToolResultToChat(item.content, item.tool_use_id);
          hasToolResult = true;
          hasToolResults = true;
        }
      }
      
      // 添加到消息历史
      if (hasToolResult) {
        state.addMessage(msg);
      }
    }
  }
  
  // 如果检测到新工具调用，确保轮询继续
  if (hasNewToolCalls) {
    state.setAutoExecutingTools(true);
    ui.setAutoExecutionIndicator(true);
  }
  
  // 如果检测到工具结果，确保轮询继续，等待助手响应
  if (hasToolResults) {
    state.setAutoExecutingTools(true);
    ui.setAutoExecutionIndicator(true);
  }
} 