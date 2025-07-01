const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const fs = require('fs');
const axios = require('axios');

async function run() {
  try {
    core.info('🏰 GnFortress Docker Security Scanner');
    core.info('⚡ Enterprise-grade security scanning in 5 minutes\n');

    const image = core.getInput('image', { required: true });
    const slackWebhook = core.getInput('slack-webhook');
    const githubToken = core.getInput('github-token');
    const severityThreshold = core.getInput('severity-threshold') || 'MEDIUM';
    const failOnCritical = core.getInput('fail-on-critical') === 'true';
    const outputFormat = core.getInput('output-format') || 'table';
    const trivyVersion = core.getInput('trivy-version') || '0.45.0'; // ✅ 기본값 고정
    const cacheEnabled = core.getInput('cache-enabled') !== 'false';

    core.info(`🔍 Scanning Docker image: ${image}`);
    core.info(`📊 Severity threshold: ${severityThreshold}`);
    core.info(`⚙️ Output format: ${outputFormat}`);
    core.info(`🔧 Trivy version: ${trivyVersion}`);
    core.info(`💾 Cache enabled: ${cacheEnabled}\n`);

    await installTrivy(trivyVersion);
    await pullDockerImage(image);
    const scanResults = await runTrivyScan(image, severityThreshold, outputFormat, cacheEnabled);
    const processedResults = await processScanResults(scanResults);

    core.setOutput('scan-result', JSON.stringify(processedResults));
    core.setOutput('vulnerability-count', processedResults.vulnerabilityCount.toString());
    core.setOutput('critical-count', processedResults.criticalCount.toString());
    core.setOutput('high-count', processedResults.highCount.toString());
    core.setOutput('medium-count', processedResults.mediumCount.toString());
    core.setOutput('low-count', processedResults.lowCount.toString());
    core.setOutput('scan-status', processedResults.scanStatus);
    if (processedResults.reportPath) {
      const reportUrl = `${github.context.serverUrl}/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`;
      core.setOutput('report-url', reportUrl);
    }

    if (slackWebhook) {
      await sendSlackNotification(slackWebhook, processedResults, image);
    }

    if (githubToken && github.context.eventName === 'pull_request') {
      await addPRComment(githubToken, processedResults, image);
    }

    core.info('\n✅ Security scan completed successfully!');
    core.info(`📊 Found ${processedResults.vulnerabilityCount} vulnerabilities:`);
    core.info(`   🔴 Critical: ${processedResults.criticalCount}`);
    core.info(`   🟠 High: ${processedResults.highCount}`);
    core.info(`   🟡 Medium: ${processedResults.mediumCount}`);
    core.info(`   🟢 Low: ${processedResults.lowCount}\n`);
    core.info('🏰 Powered by GnFortress - Enterprise Cloud Security');

    if (failOnCritical && processedResults.criticalCount > 0) {
      core.setFailed(`❌ Critical vulnerabilities found: ${processedResults.criticalCount}`);
    }
  } catch (error) {
    core.setFailed(`❌ Action failed with error: ${error.message}`);
  }
}

async function installTrivy(version = 'latest') {
  try {
    try {
      await exec.exec('trivy', ['version'], { silent: true });
      core.info('✅ Trivy is already installed');
      return;
    } catch {
      core.info('⬇️ Trivy not found, installing...');
    }

    const os = 'Linux';
    const arch = '64bit'; // ✅ 수정: amd64 → 64bit
    if (version === 'latest') {
      version = await getLatestTrivyVersion();
    }

    const fileName = `trivy_${version}_${os}-${arch}.tar.gz`;
    const downloadUrl = `https://github.com/aquasecurity/trivy/releases/download/v${version}/${fileName}`;
    core.info(`📥 Downloading Trivy from: ${downloadUrl}`);

    await exec.exec('curl', ['-L', '-o', fileName, downloadUrl]);

    if (!fs.existsSync(fileName)) {
      throw new Error(`❌ Download failed or file not found: ${fileName}`);
    }

    const stats = fs.statSync(fileName);
    core.info(`📦 Downloaded file size: ${stats.size} bytes`);
    if (stats.size < 10000) {
      throw new Error(`❌ Downloaded file too small, possibly invalid archive (got ${stats.size} bytes)`);
    }

    core.info(`🧩 Extracting ${fileName}`);
    try {
      await exec.exec('tar', ['-xzf', fileName]);
    } catch (tarError) {
      throw new Error(`❌ Failed to extract Trivy archive: ${tarError.message}`);
    }

    await exec.exec('chmod', ['+x', 'trivy']);
    await exec.exec('sudo', ['mv', 'trivy', '/usr/local/bin/']);
    await exec.exec('rm', ['-f', fileName]);

    core.info('✅ Trivy installed successfully');
  } catch (error) {
    throw new Error(`Failed to install Trivy: ${error.message}`);
  }
}

async function getLatestTrivyVersion() {
  try {
    const response = await axios.get('https://api.github.com/repos/aquasecurity/trivy/releases/latest', {
      headers: { 'User-Agent': 'GnFortress-Docker-Scanner' }
    });
    const version = response.data.tag_name.replace(/^v/, '');
    const testUrl = `https://github.com/aquasecurity/trivy/releases/download/v${version}/trivy_${version}_Linux-64bit.tar.gz`;

    try {
      await axios.head(testUrl);
      return version;
    } catch {
      return '0.45.0';
    }
  } catch {
    return '0.45.0';
  }
}

async function pullDockerImage(image) {
  try {
    await exec.exec('docker', ['pull', image]);
    core.info(`✅ Pulled image: ${image}`);
  } catch (error) {
    core.warning(`⚠️ Failed to pull image: ${error.message}`);
  }
}

async function runTrivyScan(image, threshold, format, cacheEnabled) {
  const outputFile = 'trivy-results.json';
  const args = [
    'image', '--format', 'json', '--output', outputFile,
    '--severity', threshold, '--quiet', '--exit-code', '0'
  ];
  if (!cacheEnabled) args.push('--no-cache');
  args.push(image);
  await exec.exec('trivy', args);

  const resultsJson = fs.readFileSync(outputFile, 'utf8');
  const results = JSON.parse(resultsJson);

  if (format !== 'json') {
    const tableArgs = [
      'image', '--format', format, '--output', `trivy-results.${format}`,
      '--severity', threshold, '--quiet', image
    ];
    await exec.exec('trivy', tableArgs);
  }
  return results;
}

async function processScanResults(scanResults) {
  let vulnerabilityCount = 0, criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0;
  let scanStatus = 'success';

  if (scanResults && scanResults.Results) {
    for (const result of scanResults.Results) {
      if (result.Vulnerabilities) {
        for (const vuln of result.Vulnerabilities) {
          vulnerabilityCount++;
          switch (vuln.Severity) {
            case 'CRITICAL': criticalCount++; break;
            case 'HIGH': highCount++; break;
            case 'MEDIUM': mediumCount++; break;
            case 'LOW': lowCount++; break;
          }
        }
      }
    }
  }

  if (criticalCount > 0) scanStatus = 'failure';
  else if (highCount > 0) scanStatus = 'warning';

  return {
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
}

async function sendSlackNotification(webhookUrl, results, imageName) {
  try {
    const statusEmoji = { success: '✅', warning: '⚠️', failure: '❌' };
    const colorMap = { success: 'good', warning: 'warning', failure: 'danger' };
    const payload = {
      username: 'GnFortress Scanner',
      icon_emoji: ':shield:',
      attachments: [{
        color: colorMap[results.scanStatus],
        title: `${statusEmoji[results.scanStatus]} Docker Scan Results`,
        fields: [
          { title: 'Image', value: imageName, short: true },
          { title: 'Status', value: results.scanStatus.toUpperCase(), short: true },
          { title: 'Critical', value: `${results.criticalCount}`, short: true },
          { title: 'High', value: `${results.highCount}`, short: true },
          { title: 'Medium', value: `${results.mediumCount}`, short: true },
          { title: 'Low', value: `${results.lowCount}`, short: true }
        ],
        footer: 'GnFortress Docker Scanner',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    await axios.post(webhookUrl, payload, { headers: { 'Content-Type': 'application/json' } });
    core.info('✅ Slack notification sent');
  } catch (error) {
    core.warning(`⚠️ Slack error: ${error.message}`);
  }
}

async function addPRComment(token, results, imageName) {
  try {
    const octokit = github.getOctokit(token);
    const context = github.context;
    if (context.eventName !== 'pull_request') return;

    const emoji = { success: '✅', warning: '⚠️', failure: '❌' }[results.scanStatus];
    const comment = `
## ${emoji} Docker Security Scan Summary

**Image:** \`${imageName}\`  
**Status:** ${results.scanStatus.toUpperCase()}  
**Scan Time:** ${results.scanTimestamp}

### 📊 Vulnerability Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | ${results.criticalCount} |
| 🟠 High     | ${results.highCount} |
| 🟡 Medium   | ${results.mediumCount} |
| 🟢 Low      | ${results.lowCount} |
| **Total**  | **${results.vulnerabilityCount}** |

🏰 _Powered by GnFortress_
`;

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: comment
    });
    core.info('✅ PR comment added');
  } catch (error) {
    core.warning(`⚠️ PR comment error: ${error.message}`);
  }
}

run();
