/**
 * Configuration Module
 * Contains application constants and settings
 */

/**
 * API endpoint configuration
 * Dynamically detect API endpoint
 */
const API_URL = (() => {
  // Check for environment variables or global config
  if (window.API_BASE_URL) {
    return window.API_BASE_URL;
  }

  // If frontend and API are accessed under same domain (served by FastAPI's mount static files)
  if (window.location.pathname.startsWith('/frontend/')) {
    // Use same origin but without /frontend path
    return window.location.origin;
  }

  // Development environment or fallback for separate deployment
  // Use relative path, let web server handle proxy
  return '';
})();

/**
 * Polling interval (milliseconds)
 * Used for update polling during auto tool execution
 */
const POLLING_INTERVAL = 5000; // 5 seconds

/**
 * Default settings
 */
const DEFAULT_SETTINGS = {
  temperature: 0.5,
  maxTokens: 4000,
  thinkingMode: true,
  thinkingBudget: 2000,
  autoExecuteTools: true
};

/**
 * Tool display configuration
 */
const TOOL_DISPLAY = {
  INITIAL_COLLAPSED: true,  // Tool calls default to collapsed
  EXPAND_ARROW: '&#9654;',  // Expand arrow Unicode (▶)
  COLLAPSE_ARROW: '&#9660;' // Collapse arrow Unicode (▼)
};

/**
 * Message type constants
 */
const MESSAGE_TYPES = {
  TEXT: 'text',
  TOOL_USE: 'tool_use',
  TOOL_RESULT: 'tool_result'
};

/**
 * Role type constants
 */
const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  THINKING: 'thinking'
};

/**
 * File preview configuration
 */
const FILE_PREVIEW = {
  SUPPORTED_TYPES: {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
    MARKDOWN: ['md', 'markdown'],
    HTML: ['html', 'htm'],
    CODE: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'cs', 'go', 'rs'],
    STYLE: ['css', 'scss', 'less']
  },
  ICONS: {
    FILE: 'fa-file',
    IMAGE: 'fa-file-image',
    CODE: 'fa-file-code',
    PDF: 'fa-file-pdf',
    CONFIG: 'fa-cog'
  }
};

/**
 * CSS classes
 */
const CSS_CLASSES = {
  CHAT: {
    CONTAINER: 'chat-container',
    MESSAGES: 'chat-messages',
    MESSAGE: 'chat-message',
    USER: 'user-message',
    ASSISTANT: 'assistant-message',
    TOOL: 'tool-message',
    THINKING: 'thinking-message',
    CONTENT: 'message-content',
    TIMESTAMP: 'message-timestamp'
  },
  TOOL: {
    CONTAINER: 'tool-container',
    HEADER: 'tool-header',
    BODY: 'tool-body',
    RESULT: 'tool-result',
    INPUT: 'tool-input',
    OUTPUT: 'tool-output',
    COLLAPSED: 'collapsed',
    EXPAND_ICON: 'expand-icon',
    AUTO_EXECUTE: 'auto-execute-indicator',
    ACTIVE: 'active',
    GENERATED_FILES: 'tool-generated-files',
    FILES_LIST: 'tool-files-list',
    FILE_ITEM: 'tool-file-item'
  },
  PREVIEW: {
    MARKDOWN: 'markdown-preview',
    HTML: 'html-preview',
    IMAGE: 'image-preview',
    LOADING: 'preview-loading',
    CLOSE_BTN: 'preview-close-btn',
    CONTAINER: 'preview-container',
    IMAGE_VIEWER: 'image-viewer-modal'
  },
  FILE: {
    RESULT: 'file-result',
    NAME: 'file-name',
    ICON: 'file-icon',
    DOWNLOAD_LINK: 'file-download-link',
    INFO: 'file-info',
    ACTIONS: 'file-actions',
    SIZE: 'file-size'
  },
  LOADER: {
    CONTAINER: 'loader-container',
    SPINNER: 'spinner',
    TEXT: 'loader-text'
  }
};

// ES module export
export {
  API_URL,
  POLLING_INTERVAL,
  DEFAULT_SETTINGS,
  TOOL_DISPLAY,
  MESSAGE_TYPES,
  ROLES,
  FILE_PREVIEW,
  CSS_CLASSES
}; 