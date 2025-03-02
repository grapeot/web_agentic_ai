/**
 * Tools Module
 * Handle tool calls and auto-execution
 */
import * as config from './config.js';
import { state } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';

/**
 * Process assistant message content
 * @param {Array} content - Message content array
 */
function processAssistantMessage(content) {
  console.log('Processing assistant message content:', JSON.stringify(content, null, 2));
  
  let finalTextContent = '';
  let toolCall = null;
  
  content.forEach(item => {
    console.log('Processing content item:', item);
    
    // Skip thinking type messages
    if (item.type === 'thinking') {
      return;
    }
    
    if (item.type === 'text' && item.text) {
      // Ensure text is a string
      finalTextContent = typeof item.text === 'string' ? item.text : JSON.stringify(item.text);
    } else if (item.type === 'tool_use') {
      toolCall = {
        id: item.id,
        name: item.name,
        input: item.input
      };
    }
  });
  
  // Log final text content for debugging
  console.log('Final text content:', finalTextContent);
  
  // Add text message if we have one and haven't processed it yet
  if (finalTextContent && !state.hasProcessedContent(finalTextContent)) {
    ui.addMessageToChat(config.ROLES.ASSISTANT, finalTextContent);
    state.addProcessedContent(finalTextContent);
  }
  
  // Display tool call if we have one
  if (toolCall) {
    console.log('Displaying tool call:', toolCall);
    ui.addToolCallToChat(toolCall);
    
    // Update state
    state.setLastToolCallId(toolCall.id);
    state.setCurrentToolUseId(toolCall.id);
    
    // If auto-execute is enabled, start polling for updates
    if (state.getSettings().autoExecuteTools) {
      console.log('Auto executing tools:', state.getSettings().autoExecuteTools);
      startPollingForUpdates();
    }
  }
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
  }, config.POLLING_INTERVAL);
  
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
  
  // Debug output
  console.log('Processing new messages:', JSON.stringify(newMessages));
  
  // Track pending tool results
  let pendingToolResults = new Map();
  
  // Find last handled tool call ID
  const lastHandledToolId = state.getLastToolCallId();
  let foundLastHandled = !lastHandledToolId; // If no last ID, consider it found
  let hasNewToolCalls = false;
  
  // Process messages
  for (const message of newMessages) {
    // Skip already processed messages to avoid duplication
    if (message.id && state.hasProcessedMessage(message.id)) {
      continue;
    }
    
    // Mark message as processed
    if (message.id) {
      state.addMessage(message);
    }
    
    if (message.role === config.ROLES.ASSISTANT && message.content) {
      // Assistant message processing
      const toolCalls = [];
      let textContent = '';
      
      // Process message content
      for (const item of message.content) {
        if (item.type === config.MESSAGE_TYPES.TEXT) {
          // Skip if we've already processed this text content
          if (item.text && state.hasProcessedContent(item.text)) {
            continue;
          }
          
          // Text message - ensure proper spacing between chunks
          if (textContent && item.text) {
            // Only add a space if needed to prevent words from running together
            if (!textContent.endsWith(' ') && !textContent.endsWith('\n') && 
                !item.text.startsWith(' ') && !item.text.startsWith('\n')) {
              textContent += ' '; // Add space between concatenated text chunks
            }
          }
          
          // Ensure item.text is a string
          if (typeof item.text === 'string') {
            textContent += item.text;
          } else if (item.text) {
            // If item.text is an object, convert to string
            console.warn('Text item is not a string:', item.text);
            textContent += JSON.stringify(item.text);
          }
        } else if (item.type === config.MESSAGE_TYPES.TOOL_USE) {
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
      
      // Clean up unnecessary consecutive line breaks
      if (textContent) {
        textContent = utils.cleanLineBreaks(textContent);
        
        // Display text and tool calls if not already processed
        if (foundLastHandled && !state.hasProcessedContent(textContent)) {
          // Add the message to the chat
          ui.addMessageToChat(config.ROLES.ASSISTANT, textContent);
          state.addProcessedContent(textContent);
        }
      }
      
      for (const toolCall of toolCalls) {
        ui.addToolCallToChat(toolCall);
      }
    } else if (message.role === config.ROLES.USER && message.content) {
      // User message processing - find tool results
      for (const item of message.content) {
        if (item.type === config.MESSAGE_TYPES.TOOL_RESULT && item.tool_use_id) {
          pendingToolResults.set(item.tool_use_id, item.content);
        }
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