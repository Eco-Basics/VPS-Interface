// Manual mock for node-pty — prevents real PTY/claude process spawning in tests.
// All session tests must import this mock via jest.config.ts moduleNameMapper.

export interface IPty {
  pid: number;
  process: string;
  onData: jest.MockedFunction<(callback: (data: string) => void) => void>;
  onExit: jest.MockedFunction<(callback: (exitCode: { exitCode: number; signal?: number }) => void) => void>;
  write: jest.MockedFunction<(data: string) => void>;
  resize: jest.MockedFunction<(cols: number, rows: number) => void>;
  kill: jest.MockedFunction<(signal?: string) => void>;
  pause: jest.MockedFunction<() => void>;
  resume: jest.MockedFunction<() => void>;
}

function makeMockPty(overrides: Partial<IPty> = {}): IPty {
  return {
    pid: 12345,
    process: 'claude',
    onData: jest.fn(),
    onExit: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    ...overrides,
  };
}

export const spawn = jest.fn((_file: string, _args: string[], _options: object) => makeMockPty());

export { makeMockPty };
