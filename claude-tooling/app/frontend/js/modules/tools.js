/**
 * Tools Module
 * Handle tool calls and auto-execution
 */
import * as config from './config.js';
import { state } from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';
import * as filePreview from './filePreview.js';

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
      const textContent = typeof item.text === 'string' ? item.text : JSON.stringify(item.text);
      
      // Ensure proper spacing between text chunks
      if (finalTextContent && textContent) {
        if (!finalTextContent.endsWith(' ') && !finalTextContent.endsWith('\n') && 
            !textContent.startsWith(' ') && !textContent.startsWith('\n')) {
          finalTextContent += ' '; // Add space between concatenated text chunks
        }
      }
      
      finalTextContent += textContent;
    } else if (item.type === 'tool_use') {
      toolCall = {
        id: item.id,
        name: item.name,
        input: item.input
      };
    }
  });
  
  // Clean up unnecessary consecutive line breaks
  if (finalTextContent) {
    finalTextContent = utils.cleanLineBreaks(finalTextContent);
  }
  
  // Log final text content for debugging
  console.log('Final text content:', finalTextContent);
  
  // Add text message if we have one and haven't processed it yet
  if (finalTextContent && !state.hasProcessedContent(finalTextContent.trim())) {
    ui.addMessageToChat(config.ROLES.ASSISTANT, finalTextContent);
    // Note: ui.addMessageToChat now handles adding to processedContent set
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
 * Process tool results
 * @param {string} result - Tool result string (JSON)
 * @param {string} toolUseId - Tool use ID
 * @returns {Object} Processed tool result
 */
function processToolResult(result, toolUseId) {
  try {
    // Parse tool result if it's a string
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    
    // Check for generated files in the tool result
    if (parsedResult && parsedResult.generated_files && 
        Array.isArray(parsedResult.generated_files) && 
        parsedResult.generated_files.length > 0) {
      console.log('Tool generated files detected:', parsedResult.generated_files);
      
      // Add a flag to indicate this result has files that should be previewed
      parsedResult._hasGeneratedFiles = true;
    }
    
    return parsedResult;
  } catch (error) {
    console.error('Error processing tool result:', error);
    return {
      status: 'error',
      message: `Failed to parse tool result: ${error.message}`,
      original: result
    };
  }
}

/**
 * Update chat with new messages
 * @param {Array} newMessages - Array of new messages
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
  let hasToolResults = false;
  
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
        if (foundLastHandled && !state.hasProcessedContent(textContent.trim())) {
          // Add the message to the chat
          ui.addMessageToChat(config.ROLES.ASSISTANT, textContent);
          // Note: ui.addMessageToChat now handles adding to processedContent set
        }
      }
      
      for (const toolCall of toolCalls) {
        ui.addToolCallToChat(toolCall);
      }
    } else if (message.role === config.ROLES.USER && message.content) {
      // User message processing - find tool results
      for (const item of message.content) {
        if (item.type === config.MESSAGE_TYPES.TOOL_RESULT && item.tool_use_id) {
          // Process the tool result to check for generated files
          const processedResult = processToolResult(item.content, item.tool_use_id);
          pendingToolResults.set(item.tool_use_id, processedResult);
          hasToolResults = true;
          
          // Check if this is the result for the current tool use ID
          if (item.tool_use_id === state.getCurrentToolUseId()) {
            console.log('Found result for current tool use ID, tool execution complete');
            // Mark execution as complete for this tool
            state.setCurrentToolUseId(null);
          }
        }
      }
    }
  }
  
  // Process tool results
  pendingToolResults.forEach((result, toolUseId) => {
    ui.addToolResultToChat(result, toolUseId);
  });
  
  // Update auto-execution indicator and state
  if (hasNewToolCalls) {
    // New tool calls - keep indicator on
    ui.setAutoExecutionIndicator(true);
  } else if (hasToolResults && !hasNewToolCalls) {
    // Tool results received but no new tool calls - likely finished this step
    // Check if we're actually waiting for any more tools
    if (!state.getCurrentToolUseId()) {
      console.log('No active tool executions, turning off auto-execution indicator');
      state.setAutoExecutingTools(false);
      ui.setAutoExecutionIndicator(false);
    }
  }
}

export {
  processAssistantMessage,
  startPollingForUpdates,
  updateChatWithNewMessages,
  processToolResult
}; 