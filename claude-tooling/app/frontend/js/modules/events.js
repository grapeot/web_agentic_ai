/**
 * 事件处理模块 - 管理事件监听和处理
 */
import { state } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as tools from './tools.js';

/**
 * 设置所有事件监听
 * @param {Object} elements - DOM元素引用
 */
function setupEventListeners(elements) {
  // 设置滑块事件
  setupSliderEvents(elements);
  
  // 设置按钮事件
  setupButtonEvents(elements);
  
  // 设置其他交互事件
  setupOtherEvents(elements);
}

/**
 * 设置滑块和值显示的实时更新
 * @param {Object} elements - DOM元素引用
 * @private
 */
function setupSliderEvents(elements) {
  // 温度滑块
  if (elements.temperatureSlider && elements.tempValue) {
    elements.temperatureSlider.addEventListener('input', function() {
      const value = this.value;
      elements.tempValue.textContent = value;
      state.updateSetting('temperature', parseFloat(value));
    });
  }
  
  // 最大令牌数滑块
  if (elements.maxTokensSlider && elements.tokensValue) {
    elements.maxTokensSlider.addEventListener('input', function() {
      const value = this.value;
      elements.tokensValue.textContent = value;
      state.updateSetting('maxTokens', parseInt(value, 10));
    });
  }
  
  // 思考预算滑块
  if (elements.thinkingBudgetSlider && elements.budgetValue) {
    elements.thinkingBudgetSlider.addEventListener('input', function() {
      const value = this.value;
      elements.budgetValue.textContent = value;
      state.updateSetting('thinkingBudget', parseInt(value, 10));
    });
  }
}

/**
 * Setup button event listeners
 * @param {Object} elements - DOM element references
 * @private
 */
function setupButtonEvents(elements) {
  // Send button
  if (elements.sendButton) {
    elements.sendButton.addEventListener('click', handleSendMessage);
  }
  
  // Submit tool result button
  if (elements.submitToolResultButton) {
    elements.submitToolResultButton.addEventListener('click', handleSubmitToolResult);
  }
  
  // Clear chat button
  if (elements.clearChatButton) {
    elements.clearChatButton.addEventListener('click', handleClearChat);
  }
  
  // Auto-execute tools toggle
  if (elements.autoExecuteToolsCheckbox) {
    elements.autoExecuteToolsCheckbox.addEventListener('change', function() {
      const autoExecuteEnabled = this.checked;
      state.updateSetting('autoExecuteTools', autoExecuteEnabled);
      console.log('Auto-execute tools:', autoExecuteEnabled ? 'enabled' : 'disabled');
      
      // If enabling auto-execute and there's a pending tool call, start auto-execution immediately
      if (autoExecuteEnabled && state.getCurrentToolUseId()) {
        state.setAutoExecutingTools(true);
        ui.setAutoExecutionIndicator(true);
        tools.startPollingForUpdates();
        
        // Hide any open tool result modal
        ui.hideToolResultModal();
      }
    });
  }
  
  // Cancel auto-execution button
  if (elements.cancelAutoExecutionButton) {
    elements.cancelAutoExecutionButton.addEventListener('click', handleCancelAutoExecution);
  }
  
  // Thinking mode checkbox
  if (elements.thinkingModeCheckbox) {
    elements.thinkingModeCheckbox.addEventListener('change', function() {
      state.updateSetting('thinkingMode', this.checked);
    });
  }
}

/**
 * 设置其他交互事件
 * @param {Object} elements - DOM元素引用
 * @private
 */
function setupOtherEvents(elements) {
  // 用户输入回车发送
  if (elements.userInput) {
    elements.userInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
  
  // 聊天消息点击处理（用于交互式元素）
  if (elements.chatMessages) {
    elements.chatMessages.addEventListener('click', handleChatMessageClicks);
  }
}

/**
 * 处理发送消息按钮点击
 */
async function handleSendMessage() {
  const elements = ui.getElements();
  
  // 检查是否正在等待工具结果
  if (state.isWaitingForToolResult()) {
    alert('请先提交当前工具结果');
    return;
  }
  
  const userInput = elements.userInput;
  if (!userInput || !userInput.value.trim()) return;
  
  const userMessage = userInput.value.trim();
  userInput.value = '';
  
  // 添加用户消息到聊天
  ui.addMessageToChat('user', userMessage);
  
  // 设置加载状态
  ui.setLoading(true);
  
  try {
    // 准备消息
    const messages = state.getMessages();
    messages.push({
      role: 'user',
      content: [{
        type: 'text',
        text: userMessage
      }]
    });
    
    // 添加到状态
    state.addMessage(messages[messages.length - 1]);
    
    // 发送API请求
    const response = await api.sendMessage(
      messages,
      state.getSettings(),
      state.getConversationId()
    );
    
    // 设置对话ID
    if (response.conversation_id) {
      state.setConversationId(response.conversation_id);
    }
    
    // 处理助手响应
    if (response.message) {
      // 添加到状态
      state.addMessage(response.message);
      
      // 处理消息内容
      tools.processAssistantMessage(response.message.content);
      
      // 检查思考模式
      if (response.thinking && state.getSettings().thinkingMode) {
        ui.addThinkingToChat(response.thinking);
      }
    }
    
    // 检查是否有工具调用
    if (response.tool_calls && response.tool_calls.length > 0) {
      // 是否应该自动执行
      const autoExecute = state.getSettings().autoExecuteTools;
      
      if (autoExecute) {
        // 开始轮询更新
        tools.startPollingForUpdates();
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    ui.addMessageToChat('system', `Error: ${error.message}`);
  } finally {
    ui.setLoading(false);
  }
}

/**
 * 处理清除聊天按钮点击
 */
function handleClearChat() {
  // 清除UI
  ui.clearChat();
  
  // 清除状态
  state.reset();
  
  // 停止任何进行中的轮询
  const pollingInterval = state.getPollingInterval();
  if (pollingInterval) {
    clearInterval(pollingInterval);
    state.setPollingInterval(null);
  }
  
  // 隐藏自动执行指示器
  ui.setAutoExecutionIndicator(false);
}

/**
 * 处理工具结果提交
 */
async function handleSubmitToolResult() {
  const elements = ui.getElements();
  const toolUseId = state.getCurrentToolUseId();
  
  if (!toolUseId || !elements.toolResult) {
    return;
  }
  
  let result = elements.toolResult.value.trim();
  if (!result) {
    alert('请提供工具结果');
    return;
  }
  
  // 尝试解析JSON
  try {
    JSON.parse(result);
  } catch (e) {
    // 如果不是有效的JSON，警告用户
    if (!confirm('结果不是有效的JSON。确定要继续吗？')) {
      return;
    }
  }
  
  // 设置加载状态
  ui.setLoading(true);
  
  try {
    // 提交工具结果
    const response = await api.submitToolResult(
      toolUseId,
      result,
      state.getConversationId(),
      state.getSettings().autoExecuteTools
    );
    
    // 添加工具结果到聊天
    ui.addToolResultToChat(result, toolUseId);
    
    // 重置当前工具ID
    state.setCurrentToolUseId(null);
    state.setWaitingForToolResult(false);
    
    // 隐藏结果输入框
    ui.hideToolResultModal();
    
    // 处理API响应
    if (response.message) {
      // 添加到状态
      state.addMessage(response.message);
      
      // 处理消息内容
      tools.processAssistantMessage(response.message.content);
    }
  } catch (error) {
    console.error('Error submitting tool result:', error);
    ui.addMessageToChat('system', `Error: ${error.message}`);
  } finally {
    ui.setLoading(false);
  }
}

/**
 * Handle cancel auto-execution button click
 */
function handleCancelAutoExecution() {
  console.log('Cancelling auto-execution of tools');
  
  // Stop polling interval
  const pollingInterval = state.getPollingInterval();
  if (pollingInterval) {
    clearInterval(pollingInterval);
    state.setPollingInterval(null);
  }
  
  // Update state
  state.setAutoExecutingTools(false);
  
  // Hide indicator
  ui.setAutoExecutionIndicator(false);
  
  console.log('Auto-execution cancelled');
}

/**
 * 处理聊天消息区域内的点击
 * @param {Event} e - 点击事件对象
 */
function handleChatMessageClicks(e) {
  const target = e.target;
  
  // 处理工具调用折叠/展开
  if (target.closest('.tool-call-header')) {
    const header = target.closest('.tool-call-header');
    const content = header.nextElementSibling;
    
    if (content && content.classList.contains('tool-call-content')) {
      const isCollapsed = content.style.display === 'none';
      content.style.display = isCollapsed ? 'block' : 'none';
      
      const toggleIcon = header.querySelector('.tool-call-toggle');
      if (toggleIcon) {
        toggleIcon.textContent = isCollapsed ? '▼' : '►';
      }
    }
  }
  
  // 处理执行工具按钮
  if (target.closest('.execute-tool-button')) {
    const button = target.closest('.execute-tool-button');
    const toolUseId = button.dataset.toolUseId;
    
    if (toolUseId) {
      // 显示工具结果输入框
      ui.showToolResultModal();
      
      // 设置当前工具ID
      state.setCurrentToolUseId(toolUseId);
      state.setWaitingForToolResult(true);
    }
  }
}

export {
  setupEventListeners,
  handleSendMessage,
  handleClearChat,
  handleSubmitToolResult,
  handleCancelAutoExecution,
  handleChatMessageClicks
}; 