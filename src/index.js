const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function run() {
  try {
    // 🏰 GnFortress 브랜딩
    core.info('🏰 GnFortress Docker Security Scanner');
    core.info('⚡ Enterprise-grade security scanning in 5 minutes');
    core.info('');

    // 입력 파라미터 가져오기
    const image = core.getInput('image', { required: true });
    const slackWebhook = core.getInput('slack-webhook');
    const githubToken = core.getInput('github-token');
    const severityThreshold = core.getInput('severity-threshold') || 'MEDIUM';
    const failOnCritical = core.getInput('fail-on-critical') === 'true';
    const outputFormat = core.getInput('output-format') || 'table';
    const trivyVersion = core.getInput('trivy-version') || 'latest';
    const cacheEnabled = core.getInput('cache-enabled') !== 'false';
    
    core.info(`🔍 Scanning Docker image: ${image}`);
    core.info(`📊 Severity threshold: ${severityThreshold}`);
    core.info(`⚙️  Output format: ${outputFormat}`);
    core.info(`🔧 Trivy version: ${trivyVersion}`);
    core.info(`💾 Cache enabled: ${cacheEnabled}`);
    core.info('');

    // Trivy 설치
    core.info('🚀 Installing Trivy scanner...');
    await installTrivy(trivyVersion);
    
    // Docker 이미지 pull (필요한 경우)
    core.info(`📥 Pulling Docker image: ${image}`);
    await pullDockerImage(image);
    
    // 보안 스캔 실행
    core.info('🔍 Running security scan...');
    const scanResults = await runTrivyScan(image, severityThreshold, outputFormat, cacheEnabled);
    
    // 스캔 결과 처리
    core.info('📊 Processing scan results...');
    const processedResults = await processScanResults(scanResults, severityThreshold);
    
    // 결과 출력 설정
    core.setOutput('scan-result', JSON.stringify(processedResults));
    core.setOutput('vulnerability-count', processedResults.vulnerabilityCount.toString());
    core.setOutput('critical-count', processedResults.criticalCount.toString());
    core.setOutput('high-count', processedResults.highCount.toString());
    core.setOutput('medium-count', processedResults.mediumCount.toString());
    core.setOutput('low-count', processedResults.lowCount.toString());
    core.setOutput('scan-status', processedResults.scanStatus);
    
    // 리포트 파일이 생성되었다면 URL 설정
    if (processedResults.reportPath) {
      const reportUrl = `${github.context.serverUrl}/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`;
      core.setOutput('report-url', reportUrl);
    }
    
    // Slack 알림 전송
    if (slackWebhook) {
      core.info('📱 Sending Slack notification...');
      await sendSlackNotification(slackWebhook, processedResults, image);
    }
    
    // GitHub PR 코멘트 추가
    if (githubToken && github.context.eventName === 'pull_request') {
      core.info('💬 Adding PR comment...');
      await addPRComment(githubToken, processedResults, image);
    }

    // 결과 출력
    core.info('');
    core.info('✅ Security scan completed successfully!');
    core.info(`📊 Found ${processedResults.vulnerabilityCount} vulnerabilities:`);
    core.info(`   🔴 Critical: ${processedResults.criticalCount}`);
    core.info(`   🟠 High: ${processedResults.highCount}`);
    core.info(`   🟡 Medium: ${processedResults.mediumCount}`);
    core.info(`   🟢 Low: ${processedResults.lowCount}`);
    core.info('');
    core.info('🏰 Powered by GnFortress - Enterprise Cloud Security');
    
    // Critical 취약점이 있고 fail-on-critical이 true인 경우 실패 처리
    if (failOnCritical && processedResults.criticalCount > 0) {
      core.setFailed(`❌ Critical vulnerabilities found: ${processedResults.criticalCount}`);
    }
    
  } catch (error) {
    core.setFailed(`❌ Action failed with error: ${error.message}`);
  }
}

// Trivy 설치 함수
async function installTrivy(version = 'latest') {
  try {
    // Trivy가 이미 설치되어 있는지 확인
    try {
      await exec.exec('trivy', ['version'], { silent: true });
      core.info('✅ Trivy is already installed');
      return;
    } catch {
      // Trivy가 설치되어 있지 않음, 설치 진행
    }

    const os = process.platform;
    const arch = process.arch === 'x64' ? 'amd64' : process.arch;
    
    let downloadUrl;
    let fileName;
    
    if (version === 'latest') {
      // GitHub releases API에서 최신 버전 가져오기
      const latestVersion = await getLatestTrivyVersion();
      version = latestVersion;
    }
    
    if (os === 'linux') {
      fileName = `trivy_${version}_Linux-${arch}.tar.gz`;
      downloadUrl = `https://github.com/aquasecurity/trivy/releases/download/v${version}/${fileName}`;
    } else if (os === 'darwin') {
      fileName = `trivy_${version}_macOS-${arch}.tar.gz`;
      downloadUrl = `https://github.com/aquasecurity/trivy/releases/download/v${version}/${fileName}`;
    } else {
      throw new Error(`Unsupported platform: ${os}`);
    }

    core.info(`📥 Downloading Trivy ${version} for ${os}-${arch}...`);
    
    // Trivy 다운로드
    await exec.exec('curl', ['-L', '-o', fileName, downloadUrl]);
    
    // 압축 해제
    await exec.exec('tar', ['-xzf', fileName]);
    
    // 실행 권한 부여 및 PATH에 추가
    await exec.exec('chmod', ['+x', 'trivy']);
    await exec.exec('sudo', ['mv', 'trivy', '/usr/local/bin/']);
    
    // 정리
    await exec.exec('rm', ['-f', fileName]);
    
    core.info('✅ Trivy installation completed');
    
    // 설치 확인
    await exec.exec('trivy', ['version']);
    
  } catch (error) {
    throw new Error(`Failed to install Trivy: ${error.message}`);
  }
}

// 최신 Trivy 버전 가져오기
async function getLatestTrivyVersion() {
  try {
    const response = await axios.get('https://api.github.com/repos/aquasecurity/trivy/releases/latest', {
      headers: {
        'User-Agent': 'GnFortress-Docker-Scanner'
      }
    });
    
    const version = response.data.tag_name.replace(/^v/, '');
    return version;
  } catch (error) {
    core.warning(`⚠️ Failed to get latest Trivy version: ${error.message}`);
    return '0.49.1'; // 안전한 기본값
  }
}

// Docker 이미지 pull
async function pullDockerImage(image) {
  try {
    await exec.exec('docker', ['pull', image]);
    core.info(`✅ Successfully pulled image: ${image}`);
  } catch (error) {
    core.warning(`⚠️ Failed to pull image ${image}: ${error.message}`);
    core.info('ℹ️ Continuing with scan - image might already exist locally');
  }
}

// Trivy 스캔 실행
async function runTrivyScan(image, threshold, format, cacheEnabled) {
  try {
    const outputFile = 'trivy-results.json';
    const args = [
      'image',
      '--format', 'json',
      '--output', outputFile,
      '--severity', threshold
    ];
    
    if (!cacheEnabled) {
      args.push('--no-cache');
    }
    
    // 추가 스캔 옵션
    args.push('--quiet');
    args.push('--exit-code', '0'); // 취약점이 발견되어도 exit code 0으로 설정
    
    args.push(image);
    
    await exec.exec('trivy', args);
    
    // 결과 파일 읽기
    const resultsJson = fs.readFileSync(outputFile, 'utf8');
    const results = JSON.parse(resultsJson);
    
    // 추가 포맷으로 결과 생성 (table, sarif 등)
    if (format !== 'json') {
      const formatOutputFile = `trivy-results.${format}`;
      const formatArgs = [
        'image',
        '--format', format,
        '--output', formatOutputFile,
        '--severity', threshold,
        '--quiet',
        image
      ];
      
      await exec.exec('trivy', formatArgs);
    }
    
    return results;
    
  } catch (error) {
    throw new Error(`Trivy scan failed: ${error.message}`);
  }
}

// 스캔 결과 처리
async function processScanResults(scanResults, threshold) {
  try {
    let vulnerabilityCount = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let scanStatus = 'success';
    
    // Trivy 결과 구조 분석
    if (scanResults && scanResults.Results) {
      for (const result of scanResults.Results) {
        if (result.Vulnerabilities) {
          for (const vuln of result.Vulnerabilities) {
            vulnerabilityCount++;
            
            switch (vuln.Severity) {
              case 'CRITICAL':
                criticalCount++;
                break;
              case 'HIGH':
                highCount++;
                break;
              case 'MEDIUM':
                mediumCount++;
                break;
              case 'LOW':
                lowCount++;
                break;
            }
          }
        }
      }
    }
    
    // 스캔 상태 결정
    if (criticalCount > 0) {
      scanStatus = 'failure';
    } else if (highCount > 0) {
      scanStatus = 'warning';
    }
    
    // 상세 정보 추가
    const processedResults = {
      vulnerabilityCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      scanStatus,
      scanTimestamp: new Date().toISOString(),
      detailedResults: scanResults,
      reportPath: 'trivy-results.json'
    };
    
    // 결과 요약 로그
    core.info(`📊 Scan Summary:`);
    core.info(`   Total vulnerabilities: ${vulnerabilityCount}`);
    core.info(`   Critical: ${criticalCount}`);
    core.info(`   High: ${highCount}`);
    core.info(`   Medium: ${mediumCount}`);
    core.info(`   Low: ${lowCount}`);
    
    return processedResults;
    
  } catch (error) {
    throw new Error(`Failed to process scan results: ${error.message}`);
  }
}

// Slack 알림 전송
async function sendSlackNotification(webhookUrl, results, imageName) {
  try {
    const statusEmoji = {
      'success': '✅',
      'warning': '⚠️',
      'failure': '❌'
    };
    
    const colorMap = {
      'success': 'good',
      'warning': 'warning', 
      'failure': 'danger'
    };
    
    const emoji = statusEmoji[results.scanStatus] || '📊';
    const color = colorMap[results.scanStatus] || 'good';
    
    const payload = {
      username: 'GnFortress Security Scanner',
      icon_emoji: ':shield:',
      attachments: [{
        color: color,
        title: `${emoji} Docker Security Scan Results`,
        fields: [
          {
            title: 'Image',
            value: imageName,
            short: true
          },
          {
            title: 'Status',
            value: results.scanStatus.toUpperCase(),
            short: true
          },
          {
            title: 'Total Vulnerabilities',
            value: results.vulnerabilityCount.toString(),
            short: true
          },
          {
            title: 'Critical',
            value: `🔴 ${results.criticalCount}`,
            short: true
          },
          {
            title: 'High',
            value: `🟠 ${results.highCount}`,
            short: true
          },
          {
            title: 'Medium',
            value: `🟡 ${results.mediumCount}`,
            short: true
          }
        ],
        footer: 'GnFortress Docker Security Scanner',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    core.info('✅ Slack notification sent successfully');
    
  } catch (error) {
    core.warning(`⚠️ Failed to send Slack notification: ${error.message}`);
  }
}

// GitHub PR 코멘트 추가
async function addPRComment(token, results, imageName) {
  try {
    const octokit = github.getOctokit(token);
    const context = github.context;
    
    if (context.eventName !== 'pull_request') {
      core.info('ℹ️ Not a pull request event, skipping PR comment');
      return;
    }
    
    const statusEmoji = {
      'success': '✅',
      'warning': '⚠️',
      'failure': '❌'
    };
    
    const emoji = statusEmoji[results.scanStatus] || '📊';
    
    const comment = `## ${emoji} Docker Security Scan Results
    
**Image:** \`${imageName}\`  
**Status:** ${results.scanStatus.toUpperCase()}  
**Scan Time:** ${results.scanTimestamp}

### 📊 Vulnerability Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | ${results.criticalCount} |
| 🟠 High | ${results.highCount} |
| 🟡 Medium | ${results.mediumCount} |
| 🟢 Low | ${results.lowCount} |
| **Total** | **${results.vulnerabilityCount}** |

### 🏰 Powered by GnFortress
Enterprise-grade security scanning in 5 minutes

${results.criticalCount > 0 ? '⚠️ **Critical vulnerabilities detected!** Please review and address these issues before merging.' : ''}
${results.vulnerabilityCount === 0 ? '🎉 No vulnerabilities found! Your image is secure.' : ''}
    `;
    
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: comment
    });
    
    core.info('✅ PR comment added successfully');
    
  } catch (error) {
    core.warning(`⚠️ Failed to add PR comment: ${error.message}`);
  }
}

// Action 실행
run();