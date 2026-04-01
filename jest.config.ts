import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    // Route node-pty imports to our hand-written mock — avoids native binding issues in tests.
    // Tests use spawn/makeMockPty directly; no jest.mock() call needed in test files.
    '^node-pty$': '<rootDir>/tests/__mocks__/node-pty.ts',
  },
  // Allow ts-jest to transform uuid (ESM-only package) — excluded from default ignore pattern.
  transformIgnorePatterns: ['/node_modules/(?!uuid/)'],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};

export default config;
