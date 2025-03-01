export default {
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules'],
  // Setup jsdom test environment
  testEnvironmentOptions: {
    url: 'http://localhost/'
  },
  // Test startup file, used for setting up global mocks
  setupFiles: ['./js/tests/setup.js'],
  // Match test files
  testMatch: ['**/tests/**/*.test.js'],
  // Coverage collection
  collectCoverage: true,
  collectCoverageFrom: ['js/**/*.js', '!js/tests/**'],
  // Support for ES modules
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  // Use fake-timers
  timers: 'fake',
  // Add ES module support
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
}; 