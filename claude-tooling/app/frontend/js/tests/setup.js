// 导入fetch polyfill
require('whatwg-fetch');

// 模拟localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// 模拟window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// 模拟Bootstrap类
global.bootstrap = {
  Modal: class {
    constructor() {
      this.show = jest.fn();
      this.hide = jest.fn();
    }
  }
};

// 模拟marked库
global.marked = {
  parse: jest.fn(text => `<p>${text}</p>`)
};

// 模拟highlight.js
global.hljs = {
  highlightBlock: jest.fn()
};

// 创建DOM元素mock辅助方法
global.createElementMock = (id, type = 'div', attributes = {}) => {
  const element = document.createElement(type);
  element.id = id;
  
  // 添加其他属性
  Object.entries(attributes).forEach(([key, value]) => {
    element[key] = value;
  });
  
  // 添加元素到body
  document.body.appendChild(element);
  return element;
};

// 清理测试DOM辅助方法
global.cleanupDOM = () => {
  document.body.innerHTML = '';
}; 