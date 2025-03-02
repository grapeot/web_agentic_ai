/**
 * Tools Module - Handle tool calls and auto-execution
 */
import * as config from './config.js';
const POLLING_INTERVAL = config.POLLING_INTERVAL;
const MESSAGE_TYPES = config.MESSAGE_TYPES;
const ROLES = config.ROLES;
import { state } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';

// Track processed message IDs to prevent duplication
const processedMessageIds = new Set();

/**
 * Process assistant message content
 * @param {Array} content - Message content array
 */
function processAssistantMessage(content) {
  if (!content || !Array.isArray(content)) {
    console.error('Invalid message content:', content);
    return;
  }
  
  let textContent = '';
  let toolCalls = [];
  
  // Get displayed tool IDs to avoid duplicate display
  const displayedToolIds = new Set();
  document.querySelectorAll('.tool-call').forEach(el => {
    if (el.dataset.toolUseId) {
      displayedToolIds.add(el.dataset.toolUseId);
    }
  });
  
  // Process message content
  content.forEach(item => {
    if (item.type === MESSAGE_TYPES.TEXT) {
      // Text message
      textContent += item.text;
    } else if (item.type === MESSAGE_TYPES.TOOL_USE && !displayedToolIds.has(item.id)) {
      // Tool call
      toolCalls.push({
        id: item.id,
        name: item.name,
        input: item.input
      });
      
      // Record last tool call ID
      state.setLastToolCallId(item.id);
      
      // Auto-execute if enabled
      if (state.getSettings().autoExecuteTools) {
        // Set state for auto-execution
        state.setCurrentToolUseId(item.id);
        state.setAutoExecutingTools(true);
        
        // Start polling for updates
        startPollingForUpdates();
      }
    }
  });
  
  // Display text message
  if (textContent) {
    ui.addMessageToChat(ROLES.ASSISTANT, textContent);
  }
  
  // Display tool calls
  toolCalls.forEach(toolCall => {
    ui.addToolCallToChat(toolCall);
    
    // Start auto-execution if enabled
    if (state.getSettings().autoExecuteTools && toolCall.id) {
      console.log('Auto-executing tool call:', toolCall.name);
      ui.setAutoExecutionIndicator(true);
    }
  });
}

/**
 * Start polling for updates
 * Used for auto-executing tools
 */
function startPollingForUpdates() {
  // Stop any existing polling
  const existingInterval = state.getPollingInterval();
  if (existingInterval) {
    clearInterval(existingInterval);
  }
  
  // Check if auto-execution is enabled
  if (!state.getSettings().autoExecuteTools) {
    console.log('Auto-execute tools disabled, not starting polling');
    return;
  }
  
  // Set auto-execution state
  state.setAutoExecutingTools(true);
  ui.setAutoExecutionIndicator(true);
  
  // Create polling interval
  const intervalId = setInterval(async () => {
    try {
      // Check if should continue polling
      if (!state.isAutoExecutingTools() || !state.getConversationId()) {
        clearInterval(intervalId);
        state.setPollingInterval(null);
        ui.setAutoExecutionIndicator(false);
        return;
      }
      
      // Get updates
      const updates = await api.getConversationUpdates(state.getConversationId());
      
      if (!updates) {
        console.log('No updates received or conversation does not exist');
        return;
      }
      
      // Process new messages
      if (updates.messages && updates.messages.length > 0) {
        updateChatWithNewMessages(updates.messages);
      }
      
      // Check if completed
      if (updates.completed) {
        console.log('Conversation completed, stopping polling');
        clearInterval(intervalId);
        state.setPollingInterval(null);
        state.setAutoExecutingTools(false);
        ui.setAutoExecutionIndicator(false);
      }
    } catch (error) {
      console.error('Error polling for updates:', error);
    }
  }, POLLING_INTERVAL);
  
  // Save polling interval ID
  state.setPollingInterval(intervalId);
  
  console.log('Started polling for conversation updates');
}

/**
 * Process new messages in updates
 * @param {Array} newMessages - New messages array
 * @private
 */
function updateChatWithNewMessages(newMessages) {
  if (!Array.isArray(newMessages) || newMessages.length === 0) return;
  
  // Track pending tool results
  let pendingToolResults = new Map();
  
  // Find last handled tool call ID
  const lastHandledToolId = state.getLastToolCallId();
  let foundLastHandled = !lastHandledToolId; // If no last ID, consider it found
  let hasNewToolCalls = false;
  
  // Get the current messages from state
  const currentMessages = state.getMessages();
  const currentMessageIds = new Set(currentMessages.map(msg => msg.id));
  
  // Process messages
  for (const message of newMessages) {
    // Skip already processed messages to avoid duplication
    if (message.id && (processedMessageIds.has(message.id) || currentMessageIds.has(message.id))) {
      continue;
    }
    
    // Mark message as processed
    if (message.id) {
      processedMessageIds.add(message.id);
    }
    
    if (message.role === ROLES.ASSISTANT && message.content) {
      // Assistant message processing
      const toolCalls = [];
      let textContent = '';
      
      // Process message content
      for (const item of message.content) {
        if (item.type === MESSAGE_TYPES.TEXT) {
          textContent += item.text;
        } else if (item.type === MESSAGE_TYPES.TOOL_USE) {
          // Check if it's a new tool call
          if (lastHandledToolId === item.id) {
            foundLastHandled = true;
            continue; // Skip already handled tool call
          }
          
          if (foundLastHandled) {
            toolCalls.push({
              id: item.id,
              name: item.name,
              input: item.input
            });
            
            hasNewToolCalls = true;
            state.setLastToolCallId(item.id);
            
            // Auto-execute new tool call if enabled
            if (state.getSettings().autoExecuteTools) {
              state.setCurrentToolUseId(item.id);
            }
          }
        }
      }
      
      // Display text and tool calls
      if (textContent && foundLastHandled) {
        ui.addMessageToChat(ROLES.ASSISTANT, textContent);
      }
      
      for (const toolCall of toolCalls) {
        ui.addToolCallToChat(toolCall);
      }
      
      // Add message to state if not already present
      if (!currentMessageIds.has(message.id)) {
        state.addMessage(message);
      }
    } else if (message.role === ROLES.USER && message.content) {
      // User message processing - find tool results
      for (const item of message.content) {
        if (item.type === MESSAGE_TYPES.TOOL_RESULT && item.tool_use_id) {
          pendingToolResults.set(item.tool_use_id, item.content);
        }
      }
      
      // Add message to state if not already present
      if (!currentMessageIds.has(message.id)) {
        state.addMessage(message);
      }
    }
  }
  
  // Process tool results
  pendingToolResults.forEach((result, toolUseId) => {
    ui.addToolResultToChat(result, toolUseId);
  });
  
  // Update auto-execution indicator
  if (hasNewToolCalls) {
    ui.setAutoExecutionIndicator(true);
  } else if (pendingToolResults.size > 0 && !hasNewToolCalls) {
    // If there are results but no new tool calls, conversation might be ending
    state.setAutoExecutingTools(false);
    ui.setAutoExecutionIndicator(false);
  }
}

export {
  processAssistantMessage,
  startPollingForUpdates,
  updateChatWithNewMessages
}; 