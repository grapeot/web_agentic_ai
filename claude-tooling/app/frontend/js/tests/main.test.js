/**
 * 主要功能测试文件
 * 测试主要的聊天和工具调用功能
 */

// 从main.js导入函数
import * as mainModule from '../main.js';
// 从api.js导入函数，用于mock
import * as api from '../modules/api.js';

// Mock API模块
jest.mock('../modules/api.js', () => ({
  fetchAvailableTools: jest.fn(),
  sendMessage: jest.fn(),
  submitToolResult: jest.fn(),
  getConversationUpdates: jest.fn()
}));

describe('Chat Application Main Features', () => {
  // 在每个测试前设置DOM环境
  beforeEach(() => {
    // 清理之前的DOM
    document.body.innerHTML = '';
    
    // 创建必要的DOM元素
    global.createElementMock('chat-messages');
    global.createElementMock('user-input', 'textarea');
    global.createElementMock('send-button', 'button');
    global.createElementMock('temperature', 'input', { value: '0.5', type: 'range' });
    global.createElementMock('temp-value', 'span', { textContent: '0.5' });
    global.createElementMock('max-tokens', 'input', { value: '4000', type: 'range' });
    global.createElementMock('tokens-value', 'span', { textContent: '4000' });
    global.createElementMock('thinking-mode', 'input', { checked: true, type: 'checkbox' });
    global.createElementMock('thinking-budget', 'input', { value: '2000', type: 'range' });
    global.createElementMock('budget-value', 'span', { textContent: '2000' });
    global.createElementMock('auto-execute-tools', 'input', { checked: true, type: 'checkbox' });
    global.createElementMock('clear-chat', 'button');
    global.createElementMock('response-spinner', 'div', { style: { display: 'none' } });
    global.createElementMock('tools-spinner', 'div', { style: { display: 'none' } });
    global.createElementMock('tools-group', 'ul');
    
    // 创建其他必要的元素
    const toolResultModal = document.createElement('div');
    toolResultModal.id = 'toolResultModal';
    document.body.appendChild(toolResultModal);
    
    const toolResult = document.createElement('textarea');
    toolResult.id = 'toolResult';
    document.body.appendChild(toolResult);
    
    const submitToolResultButton = document.createElement('button');
    submitToolResultButton.id = 'submitToolResult';
    document.body.appendChild(submitToolResultButton);
    
    const autoExecutionIndicator = document.createElement('div');
    autoExecutionIndicator.id = 'auto-execution-indicator';
    autoExecutionIndicator.style.display = 'none';
    document.body.appendChild(autoExecutionIndicator);
    
    const cancelAutoExecutionButton = document.createElement('button');
    cancelAutoExecutionButton.id = 'cancel-auto-execution';
    document.body.appendChild(cancelAutoExecutionButton);
    
    // 重置所有API模块mock
    jest.clearAllMocks();
    
    // 清除任何已有的定时器
    jest.useFakeTimers();
  });
  
  // 清理测试环境
  afterEach(() => {
    // 重置所有mock
    jest.resetAllMocks();
    
    // 清理DOM
    global.cleanupDOM();
    
    // 恢复真实定时器
    jest.useRealTimers();
  });
  
  /**
   * 测试：聊天界面初始化
   * 检查所有元素是否正确加载和初始化
   */
  test('应用应正确初始化', () => {
    // 设置API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // 初始化应用
    mainModule.initApp();
    
    // 验证初始化API调用
    expect(api.fetchAvailableTools).toHaveBeenCalled();
  });
  
  /**
   * 测试：发送消息功能
   * 验证用户消息发送和API调用
   */
  test('应能正确发送用户消息', async () => {
    // 设置API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // 模拟成功的API响应
    const mockResponse = {
      conversation_id: 'test-convo-id',
      message: {
        content: [{
          type: 'text',
          text: 'This is a test response'
        }]
      }
    };
    
    api.sendMessage.mockResolvedValueOnce(mockResponse);
    
    // 初始化应用
    mainModule.initApp();
    
    // 填写用户输入
    const userInput = document.getElementById('user-input');
    userInput.value = 'Hello, Claude!';
    
    // 调用发送消息函数
    await mainModule.sendMessage();
    
    // 验证API调用
    expect(api.sendMessage).toHaveBeenCalled();
    
    // 验证响应处理 - 检查聊天界面上是否显示了消息
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.innerHTML).toContain('Hello, Claude!');
  });
  
  /**
   * 测试：工具调用功能
   * 验证工具调用和结果提交
   */
  test('应能正确处理工具调用', async () => {
    // 设置API mock
    api.fetchAvailableTools.mockResolvedValueOnce({
      tools: [{
        name: 'testTool',
        description: 'A test tool'
      }]
    });
    
    // 模拟消息发送响应（含工具调用）
    api.sendMessage.mockResolvedValueOnce({
      conversation_id: 'test-convo-id',
      message: {
        content: [{
          type: 'text',
          text: 'I need to use a tool'
        }, {
          type: 'tool_use',
          id: 'tool-123',
          name: 'testTool',
          input: { param: 'test' }
        }]
      },
      tool_calls: [{
        id: 'tool-123',
        name: 'testTool',
        input: { param: 'test' }
      }]
    });
    
    // 模拟工具结果提交响应
    api.submitToolResult.mockResolvedValueOnce({
      message: {
        content: [{
          type: 'text',
          text: 'Tool result received'
        }]
      }
    });
    
    // 初始化应用
    mainModule.initApp();
    
    // 填写用户输入
    const userInput = document.getElementById('user-input');
    userInput.value = 'Use a tool';
    
    // 调用发送消息函数
    await mainModule.sendMessage();
    
    // 验证工具调用被添加到聊天
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.innerHTML).toContain('testTool');
    
    // 填写工具结果
    document.getElementById('toolResult').value = '{"result": "success"}';
    
    // 提交工具结果
    await mainModule.submitToolResult();
    
    // 验证工具结果提交
    expect(api.submitToolResult).toHaveBeenCalled();
  });
  
  /**
   * 测试：清除聊天功能
   */
  test('应能正确清除聊天', () => {
    // 设置API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // 初始化应用
    mainModule.initApp();
    
    // 添加一些消息到聊天界面
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '<div class="message">Test message</div>';
    
    // 调用清除函数
    mainModule.clearChat();
    
    // 验证聊天已清除
    expect(chatMessages.innerHTML).toBe('');
  });
  
  /**
   * 测试：更新设置值
   */
  test('应能正确更新设置值', () => {
    // 设置API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // 初始化应用
    mainModule.initApp();
    
    // 调用更新设置函数
    mainModule.updateSetting('temperature', 0.7);
    
    // 验证UI更新
    const tempValue = document.getElementById('temp-value');
    expect(tempValue.textContent).toBe('0.7');
  });
}); 