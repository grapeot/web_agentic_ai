/**
 * 主要功能测试文件
 * 测试主要的聊天和工具调用功能
 */

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
    
    // 模拟fetch API
    global.fetch = jest.fn();
    
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
    // 加载main.js (需将其修改为模块化后的主入口点)
    // 注意：这里会根据重构后的代码进行相应调整
    require('../main');
    
    // 验证初始化API调用
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost/api/tools',
      expect.anything()
    );
  });
  
  /**
   * 测试：发送消息功能
   * 验证用户消息发送和API调用
   */
  test('应能正确发送用户消息', async () => {
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
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });
    
    // 加载应用
    const main = require('../main');
    
    // 填写用户输入
    const userInput = document.getElementById('user-input');
    userInput.value = 'Hello, Claude!';
    
    // 点击发送按钮
    const sendButton = document.getElementById('send-button');
    // 触发点击事件
    const clickEvent = new MouseEvent('click');
    sendButton.dispatchEvent(clickEvent);
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 验证API调用
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('Hello, Claude!')
      })
    );
    
    // 验证响应处理 - 检查聊天界面上是否显示了消息
    // 注意：这部分需要根据重构后的代码进行调整
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.innerHTML).toContain('Hello, Claude!');
  });
  
  /**
   * 测试：工具调用功能
   * 验证工具调用和结果提交
   */
  test('应能正确处理工具调用', async () => {
    // 第一次fetch调用：获取工具列表
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        tools: [{
          name: 'testTool',
          description: 'A test tool'
        }]
      })
    });
    
    // 第二次fetch调用：发送消息后收到工具调用
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
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
      })
    });
    
    // 第三次fetch调用：提交工具结果
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        message: {
          content: [{
            type: 'text',
            text: 'Tool result received'
          }]
        }
      })
    });
    
    // 加载应用
    const main = require('../main');
    
    // 发送消息触发工具调用
    const userInput = document.getElementById('user-input');
    userInput.value = 'Use a tool';
    
    // 点击发送按钮
    const sendButton = document.getElementById('send-button');
    const clickEvent = new MouseEvent('click');
    sendButton.dispatchEvent(clickEvent);
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 验证工具调用被添加到聊天
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.innerHTML).toContain('Tool Call: testTool');
    
    // 填写工具结果
    document.getElementById('toolResult').value = '{"result": "success"}';
    
    // 提交工具结果
    const submitButton = document.getElementById('submitToolResult');
    submitButton.dispatchEvent(new MouseEvent('click'));
    
    // 等待异步操作完成
    await Promise.resolve();
    
    // 验证工具结果提交
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/api\/tool-results\?conversation_id=test-convo-id/),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('tool-123')
      })
    );
  });
  
  /**
   * 测试：清除聊天功能
   */
  test('应能正确清除聊天', () => {
    // 加载应用
    const main = require('../main');
    
    // 添加一些消息到聊天界面
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '<div class="message">Test message</div>';
    
    // 点击清除按钮
    const clearButton = document.getElementById('clear-chat');
    clearButton.dispatchEvent(new MouseEvent('click'));
    
    // 验证聊天已清除
    expect(chatMessages.innerHTML).toBe('');
  });
  
  /**
   * 测试：设置调整功能
   */
  test('应能正确更新设置值', () => {
    // 加载应用
    const main = require('../main');
    
    // 调整温度滑块
    const tempSlider = document.getElementById('temperature');
    tempSlider.value = '0.8';
    tempSlider.dispatchEvent(new Event('input'));
    
    // 验证显示值更新
    expect(document.getElementById('temp-value').textContent).toBe('0.8');
    
    // 调整最大令牌滑块
    const tokensSlider = document.getElementById('max-tokens');
    tokensSlider.value = '5000';
    tokensSlider.dispatchEvent(new Event('input'));
    
    // 验证显示值更新
    expect(document.getElementById('tokens-value').textContent).toBe('5000');
  });
}); 