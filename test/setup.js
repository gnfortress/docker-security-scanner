/**
 * Jest 테스트 설정 파일
 * 각 테스트 파일이 실행되기 전에 로드됩니다
 */

// ===========================================
// 환경 변수 설정
// ===========================================
process.env.NODE_ENV = 'test';
process.env.CI = 'true';
process.env.GITHUB_ACTIONS = 'true';

// ===========================================
// Jest 전역 설정
// ===========================================

// 기본 타임아웃 설정 (30초)
jest.setTimeout(30000);

// Mock 자동 정리 설정
jest.clearAllMocks();
jest.resetAllMocks();

// ===========================================
// Console 로깅 설정
// ===========================================

const originalConsole = global.console;

// 테스트 중 로그 레벨 조정
const shouldSuppressLogs = process.env.SUPPRESS_LOGS === 'true';

if (shouldSuppressLogs) {
  // 로그 출력 억제 (CI 환경에서 유용)
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
} else {
  // 개발 환경에서는 실제 console 사용
  global.console = {
    ...originalConsole,
    log: originalConsole.log,
    info: originalConsole.info,
    debug: originalConsole.debug,
    warn: originalConsole.warn,
    error: originalConsole.error,
  };
}

// ===========================================
// 전역 Mock 함수들
// ===========================================

// GitHub Actions Core Mock
const mockCore = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn((name) => {
    const defaultInputs = {
      'image': 'nginx:latest',
      'slack-webhook': '',
      'github-token': 'test-token',
      'severity-threshold': 'MEDIUM',
      'fail-on-critical': 'false',
      'output-format': 'table',
      'trivy-version': 'latest',
      'cache-enabled': 'true'
    };
    return defaultInputs[name] || '';
  }),
  getBooleanInput: jest.fn(),
  getMultilineInput: jest.fn(),
  setSecret: jest.fn(),
  addPath: jest.fn(),
  exportVariable: jest.fn(),
  group: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
  saveState: jest.fn(),
  getState: jest.fn()
};

// GitHub Context Mock
const mockGitHubContext = {
  context: {
    repo: {
      owner: 'gnfortress',
      repo: 'docker-security-scanner'
    },
    eventName: 'push',
    sha: 'abc123',
    ref: 'refs/heads/main',
    workflow: 'CI',
    action: 'test',
    actor: 'test-user',
    runId: 123456789,
    runNumber: 1,
    payload: {
      pull_request: {
        number: 1,
        head: { sha: 'abc123' },
        base: { sha: 'def456' }
      }
    },
    serverUrl: 'https://github.com',
    apiUrl: 'https://api.github.com',
    graphqlUrl: 'https://api.github.com/graphql'
  },
  getOctokit: jest.fn(() => ({
    rest: {
      issues: {
        createComment: jest.fn().mockResolvedValue({ data: { id: 1 } })
      },
      pulls: {
        get: jest.fn().mockResolvedValue({ data: { number: 1 } })
      }
    }
  }))
};

// Exec Mock
const mockExec = {
  exec: jest.fn().mockResolvedValue(0),
  getExecOutput: jest.fn().mockResolvedValue({
    exitCode: 0,
    stdout: 'mock output',
    stderr: ''
  })
};

// Axios Mock
const mockAxios = {
  get: jest.fn().mockResolvedValue({
    data: { tag_name: 'v0.49.1' },
    status: 200
  }),
  post: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true }
  })
};

// File System Mock
const mockFs = {
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    Results: [
      {
        Vulnerabilities: [
          { Severity: 'HIGH', VulnerabilityID: 'CVE-2023-1234' },
          { Severity: 'MEDIUM', VulnerabilityID: 'CVE-2023-5678' }
        ]
      }
    ]
  })),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  promises: {
    readFile: jest.fn().mockResolvedValue('mock file content'),
    writeFile: jest.fn().mockResolvedValue(),
    access: jest.fn().mockResolvedValue(),
    mkdir: jest.fn().mockResolvedValue(),
    rm: jest.fn().mockResolvedValue()
  }
};

// ===========================================
// 전역 변수 및 유틸리티
// ===========================================

// 테스트 유틸리티 함수들
global.testUtils = {
  // Mock 데이터 생성 헬퍼
  createMockScanResults: (overrides = {}) => ({
    Results: [
      {
        Vulnerabilities: [
          { Severity: 'CRITICAL', VulnerabilityID: 'CVE-2023-0001' },
          { Severity: 'HIGH', VulnerabilityID: 'CVE-2023-0002' },
          { Severity: 'MEDIUM', VulnerabilityID: 'CVE-2023-0003' },
          { Severity: 'LOW', VulnerabilityID: 'CVE-2023-0004' }
        ]
      }
    ],
    ...overrides
  }),

  // 처리된 결과 Mock 생성
  createMockProcessedResults: (overrides = {}) => ({
    vulnerabilityCount: 4,
    criticalCount: 1,
    highCount: 1,
    mediumCount: 1,
    lowCount: 1,
    scanStatus: 'warning',
    scanTimestamp: '2025-06-25T10:30:00.000Z',
    detailedResults: global.testUtils.createMockScanResults(),
    reportPath: 'trivy-results.json',
    ...overrides
  }),

  // 비동기 함수 테스트 헬퍼
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // 에러 테스트 헬퍼
  expectAsyncError: async (asyncFn, expectedError) => {
    let error;
    try {
      await asyncFn();
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    if (expectedError) {
      expect(error.message).toContain(expectedError);
    }
  }
};

// 테스트 환경 정보
global.testEnv = {
  isCI: process.env.CI === 'true',
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch
};

// ===========================================
// Mock 설정 함수들
// ===========================================

// Mock 초기화 함수
global.setupMocks = () => {
  // 모든 mock 초기화
  jest.clearAllMocks();
  
  // 기본 mock 값 재설정
  mockCore.getInput.mockImplementation((name) => {
    const defaultInputs = {
      'image': 'nginx:latest',
      'slack-webhook': '',
      'github-token': 'test-token',
      'severity-threshold': 'MEDIUM',
      'fail-on-critical': 'false',
      'output-format': 'table',
      'trivy-version': 'latest',
      'cache-enabled': 'true'
    };
    return defaultInputs[name] || '';
  });
  
  mockExec.exec.mockResolvedValue(0);
  mockAxios.get.mockResolvedValue({
    data: { tag_name: 'v0.49.1' },
    status: 200
  });
  mockFs.readFileSync.mockReturnValue(JSON.stringify(global.testUtils.createMockScanResults()));
};

// 에러 상황 시뮬레이션 함수
global.setupErrorMocks = () => {
  mockExec.exec.mockRejectedValue(new Error('Command failed'));
  mockAxios.get.mockRejectedValue(new Error('Network error'));
  mockFs.readFileSync.mockImplementation(() => {
    throw new Error('File not found');
  });
};

// ===========================================
// Jest Hook 설정
// ===========================================

// 각 테스트 전에 실행
beforeEach(() => {
  // Mock 초기화
  global.setupMocks();
  
  // 환경 변수 재설정
  process.env.NODE_ENV = 'test';
  
  // 시간 관련 mock (필요한 경우)
  // jest.useFakeTimers();
});

// 각 테스트 후에 실행
afterEach(() => {
  // Mock 정리
  jest.clearAllMocks();
  
  // 타이머 정리 (fake timer 사용 시)
  // jest.useRealTimers();
  
  // 환경 변수 정리 (필요한 경우)
  // delete process.env.CUSTOM_TEST_VAR;
});

// 각 테스트 파일 전에 실행
beforeAll(() => {
  // 전역 설정
  global.originalEnv = { ...process.env };
});

// 각 테스트 파일 후에 실행
afterAll(() => {
  // 환경 변수 복원
  process.env = global.originalEnv;
  
  // 기타 정리 작업
  if (global.gc) {
    global.gc(); // 가비지 컬렉션 강제 실행
  }
});

// ===========================================
// 에러 핸들링 설정
// ===========================================

// Unhandled promise rejection 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 테스트에서는 실패로 처리하지 않고 로그만 남김
});

// Uncaught exception 처리
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 테스트에서는 실패로 처리하지 않고 로그만 남김
});

// ===========================================
// 모듈 Mock 등록
// ===========================================

// Jest에서 사용할 수 있도록 mock 객체들을 등록
global.mockCore = mockCore;
global.mockGitHubContext = mockGitHubContext;
global.mockExec = mockExec;
global.mockAxios = mockAxios;
global.mockFs = mockFs;

// ===========================================
// 완료 로그
// ===========================================

console.log('🔧 Test setup completed successfully');
console.log(`📊 Test environment: ${global.testEnv.isCI ? 'CI' : 'Local'}`);
console.log(`🏗️  Node.js version: ${global.testEnv.nodeVersion}`);
console.log(`💻 Platform: ${global.testEnv.platform}-${global.testEnv.arch}`);
console.log('✅ All mocks and utilities are ready');
console.log('');

// ===========================================
// Export (테스트에서 import 가능하도록)
// ===========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testUtils: global.testUtils,
    testEnv: global.testEnv,
    setupMocks: global.setupMocks,
    setupErrorMocks: global.setupErrorMocks,
    mockCore: global.mockCore,
    mockGitHubContext: global.mockGitHubContext,
    mockExec: global.mockExec,
    mockAxios: global.mockAxios,
    mockFs: global.mockFs
  };
}