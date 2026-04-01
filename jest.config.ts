import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^node-pty$': '<rootDir>/tests/__mocks__/node-pty.ts',
  },
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};

export default config;
