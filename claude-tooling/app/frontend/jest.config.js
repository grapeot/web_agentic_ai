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
  collectCoverageFrom: ['js/**/*.js', '!js/tests/**']
}; 