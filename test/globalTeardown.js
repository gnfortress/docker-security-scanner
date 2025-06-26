/**
 * Jest 전역 정리 파일
 * 모든 테스트 실행 후에 한 번만 실행됩니다
 */

module.exports = async () => {
  // 테스트 실행 시간 계산
  const testDuration = Date.now() - (global.__TEST_START_TIME__ || Date.now());
  const durationInSeconds = (testDuration / 1000).toFixed(2);
  
  console.log('');
  console.log('🏁 GnFortress Test Suite Completed');
  console.log(`⏱️  Total execution time: ${durationInSeconds}s`);
  
  // 임시 파일 정리 (필요한 경우)
  // const fs = require('fs');
  // const path = require('path');
  // const tempDir = path.join(__dirname, '../temp');
  // if (fs.existsSync(tempDir)) {
  //   fs.rmSync(tempDir, { recursive: true, force: true });
  //   console.log('🧹 Cleaned up temporary files');
  // }
  
  // 메모리 정리
  if (global.gc) {
    global.gc();
  }
  
  console.log('✨ Global teardown completed');
  console.log('');
};