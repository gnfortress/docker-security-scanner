/**
 * 테스트 환경 변수 설정
 * setupFiles에서 각 테스트 파일 실행 전에 로드됩니다
 */

// 기본 환경 변수 설정
process.env.NODE_ENV = 'test';

// GitHub Actions 환경 변수 모킹
process.env.GITHUB_ACTIONS = 'true';
process.env.GITHUB_WORKFLOW = 'test-workflow';
process.env.GITHUB_RUN_ID = '123456789';
process.env.GITHUB_RUN_NUMBER = '1';
process.env.GITHUB_JOB = 'test';
process.env.GITHUB_ACTION = 'test-action';
process.env.GITHUB_ACTOR = 'test-user';
process.env.GITHUB_REPOSITORY = 'gnfortress/docker-security-scanner';
process.env.GITHUB_EVENT_NAME = 'push';
process.env.GITHUB_EVENT_PATH = '/tmp/github-event.json';
process.env.GITHUB_WORKSPACE = '/tmp/test-workspace';
process.env.GITHUB_SHA = 'abcd1234567890abcd1234567890abcd12345678';
process.env.GITHUB_REF = 'refs/heads/main';
process.env.GITHUB_HEAD_REF = '';
process.env.GITHUB_BASE_REF = '';
process.env.GITHUB_SERVER_URL = 'https://github.com';
process.env.GITHUB_API_URL = 'https://api.github.com';
process.env.GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

// 테스트용 토큰 및 웹훅
process.env.GITHUB_TOKEN = 'test-github-token';
process.env.SLACK_WEBHOOK = 'https://hooks.slack.com/test-webhook';

// Docker 관련 환경 변수
process.env.DOCKER_HOST = 'unix:///var/run/docker.sock';

// Trivy 관련 환경 변수
process.env.TRIVY_CACHE_DIR = '/tmp/trivy-cache';
process.env.TRIVY_TEMP_DIR = '/tmp/trivy-temp';

// 로깅 레벨 설정
process.env.LOG_LEVEL = 'error'; // 테스트 중 로그 최소화

// 타임존 설정
process.env.TZ = 'UTC';

// 기타 테스트 설정
process.env.CI = 'true';
process.env.FORCE_COLOR = '0'; // 컬러 출력 비활성화

console.log('🔧 Test environment variables loaded');