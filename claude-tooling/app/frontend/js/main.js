/**
 * Claude Tooling Main Entry File
 * Responsible for application initialization and module integration
 */

// Import modules (ES modules format)
import * as config from './modules/config.js';
import * as api from './modules/api.js';
import { state } from './modules/state.js';
import * as ui from './modules/ui.js';
import * as events from './modules/events.js';
import * as tools from './modules/tools.js';
import * as filePreview from './modules/filePreview.js';
import * as utils from './modules/utils.js';

// Test environment flag
const isTestEnvironment = typeof jest !== 'undefined';

/**
 * Initialize available tools
 * Fetches and renders the tools list
 */
async function initializeTools() {
  try {
    // Show loading state
    ui.setToolsLoading(true);
    
    // Fetch available tools
    const response = await api.fetchAvailableTools();
    console.log('Tools API Response:', response); // Debug log
    
    // Check if we have tools data
    if (response && response.tools && Array.isArray(response.tools)) {
      console.log('Available tools:', response.tools);
      
      // Render tools in UI
      ui.renderTools(response.tools);
      
      // Store tools in state
      state.updateSetting('availableTools', response.tools);
    } else {
      console.warn('No tools available or invalid response format:', response);
    }
  } catch (error) {
    console.error('Failed to fetch tools list:', error);
    ui.showError('Failed to load available tools. Some features may be limited.');
  } finally {
    // Hide loading state
    ui.setToolsLoading(false);
  }
}

// Initialize the application when DOM is fully loaded
if (!isTestEnvironment) {
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Claude Tooling initializing...');
    
    try {
      // Initialize UI components
      ui.initializeUI();
      
      // Initialize event listeners
      events.initializeEventListeners();
      
      // Initialize state with default settings
      state.reset();
      
      // Initialize tools
      await initializeTools();
      
      // Debug logs for welcome message
      console.log('Adding welcome message with role:', config.ROLES.ASSISTANT);
      const welcomeMessage = 'Hello! I am Claude, your AI assistant. How can I help you today?';
      console.log('Welcome message content:', welcomeMessage);
      
      // Add welcome message
      ui.addMessageToChat(
        config.ROLES.ASSISTANT,
        welcomeMessage
      );
      
      console.log('Claude Tooling initialization complete');
    } catch (error) {
      console.error('Error during initialization:', error);
      ui.showError('Failed to initialize application. Please refresh the page.');
    }
  });
}

// For compatibility with CommonJS in test environment
if (isTestEnvironment) {
  window.testExports = {
    api,
    ui,
    events,
    tools,
    filePreview,
    utils,
    state,
    initializeTools
  };
}

// ES module export
export {
  api,
  ui,
  events,
  tools,
  filePreview,
  utils,
  state,
  initializeTools
}; 