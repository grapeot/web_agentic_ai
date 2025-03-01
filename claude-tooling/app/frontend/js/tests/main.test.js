/**
 * Main functionality test file
 * Tests primary chat and tool calling features
 */

// Import functions from main.js
import * as mainModule from '../main.js';
// Import functions from api.js for mocking
import * as api from '../modules/api.js';

// Mock API module
jest.mock('../modules/api.js', () => ({
  fetchAvailableTools: jest.fn(),
  sendMessage: jest.fn(),
  submitToolResult: jest.fn(),
  getConversationUpdates: jest.fn()
}));

describe('Chat Application Main Features', () => {
  // Set up DOM environment before each test
  beforeEach(() => {
    // Clean up previous DOM
    document.body.innerHTML = '';
    
    // Create necessary DOM elements
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
    
    // Create other necessary elements
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
    
    // Reset all API module mocks
    jest.clearAllMocks();
    
    // Clear any existing timers
    jest.useFakeTimers();
  });
  
  // Clean up test environment
  afterEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
    
    // Clean up DOM
    global.cleanupDOM();
    
    // Restore real timers
    jest.useRealTimers();
  });
  
  /**
   * Test: Chat interface initialization
   * Check if all elements are correctly loaded and initialized
   */
  test('Application should initialize correctly', () => {
    // Set up API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // Initialize application
    mainModule.initApp();
    
    // Verify initialization API call
    expect(api.fetchAvailableTools).toHaveBeenCalled();
  });
  
  /**
   * Test: Send message functionality
   * Verify user message sending and API call
   */
  test('Should send user messages correctly', async () => {
    // Set up API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // Mock successful API response
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
    
    // Initialize application
    mainModule.initApp();
    
    // Fill in user input
    const userInput = document.getElementById('user-input');
    userInput.value = 'Hello, Claude!';
    
    // Call send message function
    await mainModule.sendMessage();
    
    // Verify API call
    expect(api.sendMessage).toHaveBeenCalled();
    
    // Verify response handling - check if message is displayed in chat interface
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.innerHTML).toContain('Hello, Claude!');
  });
  
  /**
   * Test: Tool call functionality
   * Verify tool call and result submission
   */
  test('Should handle tool calls correctly', async () => {
    // Set up API mock
    api.fetchAvailableTools.mockResolvedValueOnce({
      tools: [{
        name: 'testTool',
        description: 'A test tool'
      }]
    });
    
    // Mock message send response (with tool call)
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
    
    // Mock tool result submission response
    api.submitToolResult.mockResolvedValueOnce({
      message: {
        content: [{
          type: 'text',
          text: 'Tool result received'
        }]
      }
    });
    
    // Initialize application
    mainModule.initApp();
    
    // Fill in user input
    const userInput = document.getElementById('user-input');
    userInput.value = 'Use a tool';
    
    // Call send message function
    await mainModule.sendMessage();
    
    // Verify tool call was added to chat
    const chatMessages = document.getElementById('chat-messages');
    expect(chatMessages.innerHTML).toContain('testTool');
    
    // Fill in tool result
    document.getElementById('toolResult').value = '{"result": "success"}';
    
    // Submit tool result
    await mainModule.submitToolResult();
    
    // Verify tool result submission
    expect(api.submitToolResult).toHaveBeenCalled();
  });
  
  /**
   * Test: Clear chat functionality
   */
  test('Should clear chat correctly', () => {
    // Set up API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // Initialize application
    mainModule.initApp();
    
    // Add some messages to chat interface
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '<div class="message">Test message</div>';
    
    // Call clear function
    mainModule.clearChat();
    
    // Verify chat has been cleared
    expect(chatMessages.innerHTML).toBe('');
  });
  
  /**
   * Test: Update settings value
   */
  test('Should update settings correctly', () => {
    // Set up API mock
    api.fetchAvailableTools.mockResolvedValueOnce({ tools: [] });
    
    // Initialize application
    mainModule.initApp();
    
    // Call update settings function
    mainModule.updateSetting('temperature', 0.7);
    
    // Verify UI update
    const tempValue = document.getElementById('temp-value');
    expect(tempValue.textContent).toBe('0.7');
  });
}); 