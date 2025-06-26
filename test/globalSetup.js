/**
 * Jest 전역 설정 파일
 * 모든 테스트 실행 전에 한 번만 실행됩니다
 */

module.exports = async () => {
  console.log('🚀 GnFortress Test Suite Starting...');
  console.log('📋 Setting up test environment...');
  
  // 테스트 환경 변수 설정
  process.env.NODE_ENV = 'test';
  process.env.CI = process.env.CI || 'true';
  
  // GitHub Actions 모킹을 위한 환경 변수
  process.env.GITHUB_WORKSPACE = process.env.GITHUB_WORKSPACE || '/tmp/test-workspace';
  process.env.GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'gnfortress/docker-security-scanner';
  process.env.GITHUB_SHA = process.env.GITHUB_SHA || 'test-sha';
  process.env.GITHUB_REF = process.env.GITHUB_REF || 'refs/heads/main';
  
  // 테스트 실행 시간 기록
  global.__TEST_START_TIME__ = Date.now();
  
  console.log('✅ Global setup completed');
};