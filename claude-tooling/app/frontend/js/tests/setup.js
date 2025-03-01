// Import fetch polyfill
import 'whatwg-fetch';

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock Bootstrap class
global.bootstrap = {
  Modal: class {
    constructor() {
      this.show = jest.fn();
      this.hide = jest.fn();
    }
  }
};

// Mock marked library
global.marked = {
  parse: jest.fn(text => `<p>${text}</p>`)
};

// Mock highlight.js
global.hljs = {
  highlightBlock: jest.fn(),
  highlightElement: jest.fn(),
  highlight: jest.fn().mockReturnValue({ value: '' }),
  getLanguage: jest.fn().mockReturnValue(true),
  highlightAuto: jest.fn().mockReturnValue({ value: '' })
};

// Helper method to create DOM element mocks
global.createElementMock = (id, type = 'div', attributes = {}) => {
  const element = document.createElement(type);
  element.id = id;
  
  // Add other attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element[key] = value;
  });
  
  // Add element to body
  document.body.appendChild(element);
  return element;
};

// Helper method to clean up test DOM
global.cleanupDOM = () => {
  document.body.innerHTML = '';
}; 