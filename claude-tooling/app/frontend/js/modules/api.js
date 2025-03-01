/**
 * API模块 - 封装所有API交互
 */
import { API_URL } from './config.js';

/**
 * 获取可用工具列表
 * @returns {Promise<Object>} 包含工具列表的响应
 */
export async function fetchAvailableTools() {
  try {
    const response = await fetch(`${API_URL}/api/tools`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
}

/**
 * 发送聊天消息
 * @param {Array} messages - 消息历史数组
 * @param {Object} settings - 聊天设置
 * @param {string} [conversationId] - 对话ID（如果继续对话）
 * @returns {Promise<Object>} 聊天响应
 */
export async function sendMessage(messages, settings, conversationId = null) {
  const requestBody = {
    messages,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    thinking_mode: settings.thinkingMode,
    thinking_budget_tokens: settings.thinkingBudget,
    auto_execute_tools: settings.autoExecuteTools
  };
  
  // 构建API端点
  let apiEndpoint = `${API_URL}/api/chat`;
  
  // 如果存在对话ID，添加为URL参数
  if (conversationId) {
    apiEndpoint += `?conversation_id=${encodeURIComponent(conversationId)}`;
  }
  
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * 提交工具结果
 * @param {string} toolUseId - 工具使用ID
 * @param {string} result - 工具执行结果
 * @param {string} conversationId - 对话ID
 * @param {boolean} autoExecuteTools - 是否自动执行工具
 * @returns {Promise<Object>} 响应数据
 */
export async function submitToolResult(toolUseId, result, conversationId, autoExecuteTools) {
  const requestBody = {
    tool_use_id: toolUseId,
    content: result
  };
  
  try {
    const response = await fetch(
      `${API_URL}/api/tool-results?conversation_id=${conversationId}&auto_execute_tools=${autoExecuteTools}`, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting tool result:', error);
    throw error;
  }
}

/**
 * 获取对话更新
 * @param {string} conversationId - 对话ID
 * @returns {Promise<Object>} 更新的消息
 */
export async function getConversationUpdates(conversationId) {
  try {
    const response = await fetch(`${API_URL}/api/conversation/${conversationId}/messages`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error polling for updates:', error);
    throw error;
  }
} 