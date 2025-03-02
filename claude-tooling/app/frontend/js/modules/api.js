/**
 * API Module - Encapsulates all API interactions
 */
import * as config from './config.js';

/**
 * Fetch available tools
 * @returns {Promise<Object>} Response containing the tools list
 */
async function fetchAvailableTools() {
  try {
    const response = await fetch(`${config.API_URL}/api/tools`);
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
 * Send chat message
 * @param {Array} messages - Message history array
 * @param {Object} settings - Chat settings
 * @param {string} [conversationId] - Conversation ID (if continuing conversation)
 * @returns {Promise<Object>} Chat response
 */
async function sendMessage(messages, settings, conversationId = null) {
  // Ensure messages is an array
  if (!Array.isArray(messages)) {
    messages = [];
  }
  
  // Filter out any messages with empty content
  messages = messages.filter(msg => {
    if (!msg.content || !Array.isArray(msg.content)) return false;
    return msg.content.some(block => block.type === 'text' && block.text.trim() !== '');
  });
  
  console.log('Filtered messages:', messages);
  
  const requestBody = {
    messages,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    thinking_mode: settings.thinkingMode,
    thinking_budget_tokens: settings.thinkingBudget,
    auto_execute_tools: settings.autoExecuteTools
  };
  
  // Debug log
  console.log('Sending request with body:', JSON.stringify(requestBody, null, 2));
  
  // Build API endpoint
  let apiEndpoint = `${config.API_URL}/api/chat`;
  
  // If conversation ID exists, add as URL parameter
  if (conversationId) {
    apiEndpoint += `?conversation_id=${encodeURIComponent(conversationId)}`;
    console.log(`Continuing conversation: ${conversationId}`);
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
      const errorData = await response.json().catch(() => null);
      throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Submit tool result
 * @param {string} toolUseId - Tool use ID
 * @param {string} result - Tool execution result
 * @param {string} conversationId - Conversation ID
 * @param {boolean} autoExecuteTools - Whether to auto-execute tools
 * @returns {Promise<Object>} Response data
 */
async function submitToolResult(toolUseId, result, conversationId, autoExecuteTools) {
  const requestBody = {
    tool_use_id: toolUseId,
    content: result
  };
  
  try {
    const response = await fetch(
      `${config.API_URL}/api/tool-results?conversation_id=${conversationId}&auto_execute_tools=${autoExecuteTools}`, 
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
 * Get conversation updates
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object|null>} Updated messages or null if conversation not found
 */
async function getConversationUpdates(conversationId) {
  try {
    const response = await fetch(`${config.API_URL}/api/conversation/${conversationId}/messages`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Conversation not found');
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

export {
  fetchAvailableTools,
  sendMessage,
  submitToolResult,
  getConversationUpdates
}; 