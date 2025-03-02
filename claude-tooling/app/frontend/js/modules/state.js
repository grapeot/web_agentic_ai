/**
 * State Management Module
 * Manages application state using a singleton pattern
 */
import * as config from './config.js';

/**
 * Application State Manager Class
 * Manages chat state, message history, settings and tool state
 */
class StateManager {
  constructor() {
    // Initialize state
    this.reset();
  }
  
  /**
   * Reset all state to initial values
   */
  reset() {
    // Conversation state
    this.conversationId = null;
    this.messages = [];
    
    // Tool state
    this.currentToolUseId = null;
    this.waitingForToolResult = false;
    this.autoExecutingTools = false;
    this.pollingInterval = null;
    this.lastToolCallId = null;
    
    // Settings
    this.settings = { ...config.DEFAULT_SETTINGS };
    
    // Message tracking for duplicate prevention
    this.processedMessageIds = new Set();
    this.processedTextContent = new Set();
  }
  
  /**
   * Update a setting value
   * @param {string} key - Setting name
   * @param {any} value - Setting value
   */
  updateSetting(key, value) {
    if (key in this.settings) {
      this.settings[key] = value;
      console.log(`Setting updated: ${key} = ${value}`);
    }
  }
  
  /**
   * Get current settings
   * @returns {Object} Current settings object
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * Add message to history
   * @param {Object} message - Message object
   */
  addMessage(message) {
    if (message.id) {
      this.processedMessageIds.add(message.id);
    }
    this.messages.push(message);
  }
  
  /**
   * Get message history
   * @returns {Array} Message history array
   */
  getMessages() {
    return [...this.messages];
  }
  
  /**
   * Set conversation ID
   * @param {string} id - Conversation ID
   */
  setConversationId(id) {
    this.conversationId = id;
    console.log(`Conversation ID set: ${id}`);
  }
  
  /**
   * Get conversation ID
   * @returns {string|null} Conversation ID or null
   */
  getConversationId() {
    return this.conversationId;
  }
  
  /**
   * Set current tool use ID
   * @param {string} id - Tool use ID
   */
  setCurrentToolUseId(id) {
    this.currentToolUseId = id;
    console.log(`Current tool use ID set: ${id}`);
  }
  
  /**
   * Get current tool use ID
   * @returns {string|null} Tool use ID or null
   */
  getCurrentToolUseId() {
    return this.currentToolUseId;
  }
  
  /**
   * Set tool result waiting state
   * @param {boolean} waiting - Whether waiting for tool result
   */
  setWaitingForToolResult(waiting) {
    this.waitingForToolResult = waiting;
    console.log(`Waiting for tool result: ${waiting}`);
  }
  
  /**
   * Check if waiting for tool result
   * @returns {boolean} Whether waiting for tool result
   */
  isWaitingForToolResult() {
    return this.waitingForToolResult;
  }
  
  /**
   * Set auto executing tools state
   * @param {boolean} auto - Whether auto executing tools
   */
  setAutoExecutingTools(auto) {
    this.autoExecutingTools = auto;
    console.log(`Auto executing tools: ${auto}`);
  }
  
  /**
   * Check if auto executing tools
   * @returns {boolean} Whether auto executing tools
   */
  isAutoExecutingTools() {
    return this.autoExecutingTools;
  }
  
  /**
   * Set polling interval ID
   * @param {number|null} intervalId - Polling interval ID
   */
  setPollingInterval(intervalId) {
    this.pollingInterval = intervalId;
    console.log(`Polling interval ID set: ${intervalId}`);
  }
  
  /**
   * Get polling interval ID
   * @returns {number|null} Polling interval ID
   */
  getPollingInterval() {
    return this.pollingInterval;
  }
  
  /**
   * Set last tool call ID
   * @param {string} id - Tool call ID
   */
  setLastToolCallId(id) {
    this.lastToolCallId = id;
    console.log(`Last tool call ID set: ${id}`);
  }
  
  /**
   * Get last tool call ID
   * @returns {string|null} Tool call ID
   */
  getLastToolCallId() {
    return this.lastToolCallId;
  }
  
  /**
   * Check if message ID has been processed
   * @param {string} messageId - Message ID to check
   * @returns {boolean} Whether message has been processed
   */
  hasProcessedMessage(messageId) {
    return this.processedMessageIds.has(messageId);
  }
  
  /**
   * Check if text content has been processed
   * @param {string} content - Text content to check
   * @returns {boolean} Whether content has been processed
   */
  hasProcessedContent(content) {
    return this.processedTextContent.has(content);
  }
  
  /**
   * Add processed text content
   * @param {string} content - Text content to mark as processed
   */
  addProcessedContent(content) {
    this.processedTextContent.add(content);
  }
}

// Create and export singleton instance
const state = new StateManager();

export { state }; 