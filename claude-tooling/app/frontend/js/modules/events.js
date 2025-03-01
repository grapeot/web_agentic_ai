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
export function setupEventListeners(elements) {
  // 设置滑块事件
  setupSliderEvents(elements);
  
  // 设置按钮事件
  setupButtonEvents(elements);
  
  // 设置其他交互事件
  setupOtherEvents(elements);
}

/**
 * 设置滑块相关事件
 * @param {Object} elements - DOM元素引用
 * @private
 */
function setupSliderEvents(elements) {
  // 温度滑块
  elements.temperatureSlider.addEventListener('input', function() {
    elements.tempValue.textContent = this.value;
    state.updateSetting('temperature', parseFloat(this.value));
  });
  
  // 最大令牌滑块
  elements.maxTokensSlider.addEventListener('input', function() {
    elements.tokensValue.textContent = this.value;
    state.updateSetting('maxTokens', parseInt(this.value));
  });
  
  // 思考预算滑块
  elements.thinkingBudgetSlider.addEventListener('input', function() {
    elements.budgetValue.textContent = this.value;
    state.updateSetting('thinkingBudget', parseInt(this.value));
  });
}

/**
 * 设置按钮相关事件
 * @param {Object} elements - DOM元素引用
 * @private
 */
function setupButtonEvents(elements) {
  // 发送按钮
  elements.sendButton.addEventListener('click', handleSendMessage);
  
  // 清空聊天按钮
  elements.clearChatButton.addEventListener('click', handleClearChat);
  
  // 提交工具结果按钮
  elements.submitToolResultButton.addEventListener('click', handleSubmitToolResult);
  
  // 取消自动执行按钮
  elements.cancelAutoExecutionButton.addEventListener('click', handleCancelAutoExecution);
}

/**
 * 设置其他交互事件
 * @param {Object} elements - DOM元素引用
 * @private
 */
function setupOtherEvents(elements) {
  // 用户输入框按键事件
  elements.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  // 思考模式开关
  elements.thinkingModeSwitch.addEventListener('change', function() {
    state.updateSetting('thinkingMode', this.checked);
  });
  
  // 自动执行工具开关
  elements.autoExecuteToolsSwitch.addEventListener('change', function() {
    state.updateSetting('autoExecuteTools', this.checked);
  });
  
  // 聊天界面事件委托（用于折叠/展开工具调用）
  elements.chatMessages.addEventListener('click', handleChatMessageClicks);
}

/**
 * 处理发送消息
 */
export async function handleSendMessage() {
  const userInput = ui.getElements().userInput;
  const message = userInput.value.trim();
  if (!message) return;
  
  // 添加用户消息到界面
  ui.addMessageToChat(ROLES.USER, message);
  userInput.value = '';
  
  // 构建用于API的消息
  const userMessage = {
    role: 'user',
    content: [{
      type: 'text',
      text: message
    }]
  };
  state.addMessage(userMessage);
  
  // 显示加载指示器
  ui.setLoading(true);
  
  try {
    // 发送消息到API
    const apiResponse = await api.sendMessage(
      state.getMessages(),
      state.getSettings(),
      state.getConversationId()
    );
    
    ui.setLoading(false);
    
    // 处理响应
    if (apiResponse.conversation_id) {
      state.setConversationId(apiResponse.conversation_id);
    }
    
    // 显示思考过程（如果有）
    if (apiResponse.thinking) {
      ui.addThinkingToChat(apiResponse.thinking);
    }
    
    // 处理助手回复
    if (apiResponse.message && apiResponse.message.content) {
      tools.processAssistantMessage(apiResponse.message.content);
    } else {
      console.error('响应缺少消息字段:', apiResponse);
      ui.addMessageToChat('assistant', '错误：无法从Claude获取有效回复。请重试。');
    }
    
    // 处理工具调用
    if (apiResponse.tool_calls && apiResponse.tool_calls.length > 0) {
      const toolCall = apiResponse.tool_calls[0];
      ui.addToolCallToChat(toolCall);
      
      state.setCurrentToolUseId(toolCall.id);
      
      if (state.getSettings().autoExecuteTools) {
        console.log("在初始响应中找到工具调用，且启用了自动执行，开始轮询更新");
        state.setAutoExecutingTools(true);
        state.setWaitingForToolResult(false);
        tools.startPollingForUpdates();
      } else {
        state.setWaitingForToolResult(true);
        ui.showToolResultModal();
      }
    } else if (state.getSettings().autoExecuteTools) {
      console.log("没有立即的工具调用，但启用了自动执行 - 开始轮询");
      state.setAutoExecutingTools(true);
      tools.startPollingForUpdates();
    }
  } catch (error) {
    ui.setLoading(false);
    console.error('发送消息错误:', error);
  }
}

/**
 * 处理清除聊天
 */
export function handleClearChat() {
  ui.clearChat();
  state.reset();
  
  // 如果有轮询，清除它
  const pollingInterval = state.getPollingInterval();
  if (pollingInterval) {
    clearInterval(pollingInterval);
    state.setPollingInterval(null);
  }
  
  ui.setAutoExecutionIndicator(false);
  console.log("聊天已清除，所有状态已重置");
}

/**
 * 处理提交工具结果
 */
export async function handleSubmitToolResult() {
  const toolResult = ui.getElements().toolResultTextarea.value;
  const toolUseId = state.getCurrentToolUseId();
  
  if (toolResult && toolUseId) {
    ui.addToolResultToChat(toolResult, toolUseId);
    ui.hideToolResultModal();
    
    // 提交工具结果
    ui.setLoading(true);
    
    try {
      const response = await api.submitToolResult(
        toolUseId,
        toolResult,
        state.getConversationId(),
        state.getSettings().autoExecuteTools
      );
      
      ui.setLoading(false);
      
      tools.processAssistantMessage(response.message.content);
      
      // 检查新的工具调用
      if (response.tool_calls && response.tool_calls.length > 0) {
        state.setWaitingForToolResult(true);
        const toolCall = response.tool_calls[0];
        ui.addToolCallToChat(toolCall);
        
        state.setCurrentToolUseId(toolCall.id);
        
        if (state.getSettings().autoExecuteTools) {
          console.log("工具结果后发现工具调用，继续轮询");
          state.setAutoExecutingTools(true);
          state.setWaitingForToolResult(false);
          tools.startPollingForUpdates();
        } else {
          state.setWaitingForToolResult(true);
          ui.showToolResultModal();
        }
      } else {
        state.setWaitingForToolResult(false);
        if (state.getSettings().autoExecuteTools) {
          console.log("工具结果后没有立即的工具调用，确保轮询继续");
          state.setAutoExecutingTools(true);
          tools.startPollingForUpdates();
        }
      }
    } catch (error) {
      ui.setLoading(false);
      console.error('提交工具结果错误:', error);
    }
  }
}

/**
 * 处理取消自动执行
 */
export function handleCancelAutoExecution() {
  if (state.isAutoExecutingTools()) {
    state.setAutoExecutingTools(false);
    
    const pollingInterval = state.getPollingInterval();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      state.setPollingInterval(null);
    }
    
    ui.setAutoExecutionIndicator(false);
    ui.addMessageToChat('system', '自动工具执行已取消');
  }
}

/**
 * 处理聊天消息区域点击事件（工具折叠/展开等）
 * @param {Event} e - 点击事件
 */
export function handleChatMessageClicks(e) {
  // 查找最近的工具调用头部元素
  const toolHeader = e.target.closest('.tool-call-header');
  if (toolHeader) {
    const toolCall = toolHeader.closest('.tool-call');
    if (toolCall) {
      const toolContent = toolCall.querySelector('.tool-content');
      if (toolContent) {
        // 切换展开/折叠状态
        toolContent.classList.toggle('collapsed');
        
        // 更新箭头图标
        const arrow = toolHeader.querySelector('.toggle-arrow');
        if (arrow) {
          if (toolContent.classList.contains('collapsed')) {
            arrow.innerHTML = TOOL_DISPLAY.COLLAPSE_ARROW; // 右箭头（展开）
          } else {
            arrow.innerHTML = TOOL_DISPLAY.EXPAND_ARROW; // 下箭头（折叠）
          }
        }
      }
    }
  }
  
  // 处理文件结果中的JSON详情切换
  const jsonToggle = e.target.closest('.toggle-json-details');
  if (jsonToggle) {
    const jsonDetails = jsonToggle.closest('.file-result').querySelector('.file-json-details');
    if (jsonDetails) {
      jsonDetails.classList.toggle('collapsed');
    }
  }
} 