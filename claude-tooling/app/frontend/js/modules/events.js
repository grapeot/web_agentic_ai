/**
 * Events Module
 * Handle DOM event listeners and interactions
 */
import * as config from './config.js';
import { state } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import * as tools from './tools.js';
import * as utils from './utils.js';

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Chat form submission
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }
  
  // Handle textarea enter key
  const userInput = document.getElementById('user-input');
  if (userInput) {
    userInput.addEventListener('keydown', (event) => {
      // Submit on Enter (without Shift)
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const form = document.getElementById('chat-form');
        if (form) {
          const submitEvent = new Event('submit', { cancelable: true });
          form.dispatchEvent(submitEvent);
        }
      }
    });
  }
  
  // Settings form submission
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', handleSettingsSubmit);
  }
  
  // Settings toggle button
  const settingsToggle = document.getElementById('settings-toggle');
  if (settingsToggle) {
    settingsToggle.addEventListener('click', toggleSettings);
  }
  
  // Tool execution buttons
  document.addEventListener('click', handleToolExecution);
  
  // Tool call collapse/expand
  document.addEventListener('click', handleToolCallToggle);
  
  // Clear chat button
  const clearButton = document.getElementById('clear-chat');
  if (clearButton) {
    clearButton.addEventListener('click', handleClearChat);
  }
  
  // Initialize settings form values
  initializeSettingsForm();
  
  console.log('Event listeners initialized');
}

/**
 * Handle chat form submission
 * @param {Event} event - Form submit event
 */
async function handleChatSubmit(event) {
  event.preventDefault();
  
  const messageInput = document.getElementById('user-input');
  if (!messageInput) return;
  
  const message = messageInput.value.trim();
  if (!message) return;
  
  try {
    // Add user message to state and chat
    const userMessage = {
      role: config.ROLES.USER,
      content: [{
        type: config.MESSAGE_TYPES.TEXT,
        text: message
      }]
    };
    
    // Clear input and disable form before adding message to state
    messageInput.value = '';
    messageInput.disabled = true;
    const submitButton = document.getElementById('send-button');
    if (submitButton) {
      submitButton.disabled = true;
    }
    
    // Show loading indicator
    ui.setLoading(true);
    
    // Add message to state and UI
    state.addMessage(userMessage);
    ui.addMessageToChat(config.ROLES.USER, message);
    
    // Get current messages from state (this ensures we have the latest state)
    const currentMessages = state.getMessages();
    console.log('Current messages before API call:', currentMessages);
    
    // Send message to API
    const response = await api.sendMessage(
      currentMessages,
      state.getSettings(),
      state.getConversationId()
    );
    
    console.log('Received API response:', response);
    
    // Update conversation ID if needed
    if (response.conversation_id) {
      state.setConversationId(response.conversation_id);
      console.log('Conversation ID set:', response.conversation_id);
    }
    
    // Process assistant message
    if (response.message) {
      console.log('Processing message:', response.message);
      if (response.message.role === config.ROLES.ASSISTANT) {
        console.log('Processing assistant message:', response.message);
        if (response.message.content) {
          ui.addMessageToChat(config.ROLES.ASSISTANT, response.message.content);
          if (Array.isArray(response.message.content)) {
            tools.processAssistantMessage(response.message.content);
          }
        }
      }
    }
    
    // Process thinking content if present
    if (response.thinking) {
      console.log('Processing thinking content:', response.thinking);
      ui.addThinkingToChat(response.thinking);
    }
    
    // Process tool calls if present
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('Processing tool calls:', response.tool_calls);
      for (const toolCall of response.tool_calls) {
        ui.addToolCallToChat(toolCall);
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    ui.showError('Failed to send message. Please try again.');
  } finally {
    // Re-enable form
    messageInput.disabled = false;
    const submitButton = document.getElementById('send-button');
    if (submitButton) {
      submitButton.disabled = false;
    }
    ui.setLoading(false);
  }
}

/**
 * Handle settings form submission
 * @param {Event} event - Form submit event
 */
function handleSettingsSubmit(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  // Update settings
  const settings = {
    temperature: parseFloat(formData.get('temperature')) || config.DEFAULT_SETTINGS.temperature,
    maxTokens: parseInt(formData.get('maxTokens')) || config.DEFAULT_SETTINGS.maxTokens,
    autoExecuteTools: formData.get('autoExecuteTools') === 'true',
    thinkingMode: formData.get('thinkingMode') || config.DEFAULT_SETTINGS.thinkingMode
  };
  
  // Validate settings
  if (settings.temperature < 0 || settings.temperature > 1) {
    ui.showError('Temperature must be between 0 and 1');
    return;
  }
  
  if (settings.maxTokens < 1) {
    ui.showError('Max tokens must be greater than 0');
    return;
  }
  
  // Save settings
  state.updateSetting('temperature', settings.temperature);
  state.updateSetting('maxTokens', settings.maxTokens);
  state.updateSetting('autoExecuteTools', settings.autoExecuteTools);
  state.updateSetting('thinkingMode', settings.thinkingMode);
  
  // Hide settings panel
  toggleSettings();
  
  console.log('Settings updated:', settings);
}

/**
 * Initialize settings form with current values
 */
function initializeSettingsForm() {
  const settings = state.getSettings();
  
  // Set form values
  const temperatureInput = document.querySelector('input[name="temperature"]');
  if (temperatureInput) {
    temperatureInput.value = settings.temperature;
  }
  
  const maxTokensInput = document.querySelector('input[name="maxTokens"]');
  if (maxTokensInput) {
    maxTokensInput.value = settings.maxTokens;
  }
  
  const autoExecuteInput = document.querySelector('input[name="autoExecuteTools"]');
  if (autoExecuteInput) {
    autoExecuteInput.checked = settings.autoExecuteTools;
  }
  
  const thinkingModeSelect = document.querySelector('select[name="thinkingMode"]');
  if (thinkingModeSelect) {
    thinkingModeSelect.value = settings.thinkingMode;
  }
}

/**
 * Toggle settings panel visibility
 */
function toggleSettings() {
  const settingsPanel = document.getElementById('settings-panel');
  if (settingsPanel) {
    settingsPanel.classList.toggle('hidden');
  }
}

/**
 * Handle tool execution button clicks
 * @param {Event} event - Click event
 */
async function handleToolExecution(event) {
  const button = event.target.closest('.execute-tool-btn');
  if (!button) return;
  
  const toolUseId = button.dataset.toolUseId;
  if (!toolUseId) return;
  
  try {
    // Disable button
    button.disabled = true;
    
    // Set current tool use ID
    state.setCurrentToolUseId(toolUseId);
    
    // Show loading state
    ui.setToolExecutionIndicator(toolUseId, true);
    
    // Submit tool result
    const response = await api.submitToolResult(
      toolUseId,
      null, // No result for initial execution
      state.getConversationId(),
      state.getSettings().autoExecuteTools
    );
    
    // Start polling if auto-execute is enabled
    if (state.getSettings().autoExecuteTools) {
      tools.startPollingForUpdates();
    }
    
    // Process response
    if (response.messages && response.messages.length > 0) {
      const lastMessage = response.messages[response.messages.length - 1];
      if (lastMessage.role === config.ROLES.ASSISTANT && lastMessage.content) {
        tools.processAssistantMessage(lastMessage.content);
      }
    }
  } catch (error) {
    console.error('Error executing tool:', error);
    ui.showError('Failed to execute tool. Please try again.');
  } finally {
    // Re-enable button
    button.disabled = false;
    ui.setToolExecutionIndicator(toolUseId, false);
  }
}

/**
 * Handle tool call collapse/expand
 * @param {Event} event - Click event
 */
function handleToolCallToggle(event) {
  const toggle = event.target.closest('.tool-call-toggle');
  if (!toggle) return;
  
  const toolCall = toggle.closest(`.${config.CSS_CLASSES.MESSAGE.TOOL_CALL}`);
  if (!toolCall) return;
  
  // Toggle collapsed state
  const isCollapsed = toolCall.classList.toggle(config.CSS_CLASSES.MESSAGE.COLLAPSED);
  
  // Update toggle button text
  toggle.textContent = isCollapsed ? config.TOOL_DISPLAY.EXPAND : config.TOOL_DISPLAY.COLLAPSE;
}

/**
 * Handle clear chat button click
 */
function handleClearChat() {
  // Clear chat messages
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }
  
  // Reset state
  state.reset();
  
  console.log('Chat cleared');
}

export {
  initializeEventListeners,
  handleChatSubmit,
  handleSettingsSubmit,
  handleToolExecution,
  handleToolCallToggle,
  handleClearChat
}; 