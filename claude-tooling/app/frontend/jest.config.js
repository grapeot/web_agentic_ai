module.exports = {
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules'],
  // 设置jsdom测试环境
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  // 测试启动文件，用于设置全局模拟
  setupFiles: ['./js/tests/setup.js'],
  // 匹配测试文件
  testMatch: ['**/tests/**/*.test.js'],
  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: ['js/**/*.js', '!js/tests/**'],
  // 支持ES模块
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  // 使用fake-timers
  timers: 'fake',
  // 添加ES模块支持
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
}; 