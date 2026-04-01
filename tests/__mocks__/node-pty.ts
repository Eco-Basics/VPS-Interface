type DataListener = (data: string) => void;
type ExitListener = (event: { exitCode: number }) => void;

let lastMockPtyInstance: ReturnType<typeof makeMockPty> | null = null;

export function makeMockPty() {
  let dataListener: DataListener | null = null;
  let exitListener: ExitListener | null = null;

  const mockPty = {
    pid: 12345,
    kill: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    onData: jest.fn((listener: DataListener) => {
      dataListener = listener;
      return { dispose: jest.fn() };
    }),
    onExit: jest.fn((listener: ExitListener) => {
      exitListener = listener;
      return { dispose: jest.fn() };
    }),
    _emitData(data: string) {
      dataListener?.(data);
    },
    _emitExit(code: number) {
      exitListener?.({ exitCode: code });
    },
  };

  lastMockPtyInstance = mockPty;
  return mockPty;
}

export const spawn = jest.fn(() => makeMockPty());

export function getMockPtyInstance() {
  if (!lastMockPtyInstance) {
    throw new Error('Mock PTY instance has not been created yet');
  }

  return lastMockPtyInstance;
}
