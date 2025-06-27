const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function run() {
  try {
    core.info('🏰 GnFortress Docker Security Scanner');

    const image = core.getInput('image', { required: true });
    const slackWebhook = core.getInput('slack-webhook');
    const githubToken = core.getInput('github-token');
    const severityThreshold = core.getInput('severity-threshold') || 'MEDIUM';
    const failOnCritical = core.getInput('fail-on-critical') === 'true';
    const outputFormat = core.getInput('output-format') || 'table';
    const trivyVersion = core.getInput('trivy-version') || 'latest';
    const cacheEnabled = core.getInput('cache-enabled') !== 'false';

    core.info(`🔍 Scanning Docker image: ${image}`);

    await installTrivy(trivyVersion);
    await pullDockerImage(image);

    const scanResults = await runTrivyScan(image, severityThreshold, outputFormat, cacheEnabled);
    const processedResults = await processScanResults(scanResults, severityThreshold);

    core.setOutput('scan-result', JSON.stringify(processedResults));
    core.setOutput('vulnerability-count', processedResults.vulnerabilityCount.toString());
    core.setOutput('scan-grade', processedResults.securityGrade);

    if (slackWebhook) await sendSlackNotification(slackWebhook, processedResults, image);
    if (githubToken && github.context.eventName === 'pull_request') await addPRComment(githubToken, processedResults, image);

    core.info(`✅ Completed. Grade: ${processedResults.securityGrade}, Total Vulns: ${processedResults.vulnerabilityCount}`);

    if (failOnCritical && processedResults.criticalCount > 0) {
      core.setFailed(`❌ Critical vulnerabilities found: ${processedResults.criticalCount}`);
    }
  } catch (error) {
    core.setFailed(`❌ Action failed with error: ${error.message}`);
  }
}

function calculateSecurityGrade(totalScore) {
  if (totalScore === 0) return 'A+';
  if (totalScore <= 10) return 'A';
  if (totalScore <= 25) return 'B';
  if (totalScore <= 50) return 'C';
  if (totalScore <= 100) return 'D';
  return 'F';
}

async function processScanResults(scanResults, threshold) {
  let vulnerabilityCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let totalCvssScore = 0;
  let topVulnerabilities = [];

  if (scanResults?.Results) {
    for (const result of scanResults.Results) {
      if (result.Vulnerabilities) {
        for (const vuln of result.Vulnerabilities) {
          vulnerabilityCount++;
          const severity = vuln.Severity;
          const cvss = vuln?.CVSS?.nvd?.V3Score || 0;
          totalCvssScore += cvss;

          switch (severity) {
            case 'CRITICAL': criticalCount++; break;
            case 'HIGH': highCount++; break;
            case 'MEDIUM': mediumCount++; break;
            case 'LOW': lowCount++; break;
          }

          topVulnerabilities.push({
            id: vuln.VulnerabilityID,
            pkg: vuln.PkgName,
            severity: severity,
            score: cvss,
            title: vuln.Title || '',
            url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.VulnerabilityID}`
          });
        }
      }
    }
  }

  topVulnerabilities.sort((a, b) => b.score - a.score);
  const top5 = topVulnerabilities.slice(0, 5);
  const securityGrade = calculateSecurityGrade(totalCvssScore);

  return {
    vulnerabilityCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    securityGrade,
    totalCvssScore,
    scanTimestamp: new Date().toISOString(),
    topVulnerabilities: top5,
    reportPath: 'trivy-results.json'
  };
}

function generateMarkdownReport(results, imageName) {
  const lines = [];
  lines.push(`## 🛡️ GnFortress 보안 스캔 리포트`);
  lines.push(`**도커 이미지**: \`${imageName}\``);
  lines.push(`**보안 등급**: \`${results.securityGrade}\` (총 CVSS: ${results.totalCvssScore})`);
  lines.push(`**취약점 개수**: 총 ${results.vulnerabilityCount}개`);
  lines.push(`- 🔴 Critical: ${results.criticalCount}`);
  lines.push(`- 🟠 High: ${results.highCount}`);
  lines.push(`- 🟡 Medium: ${results.mediumCount}`);
  lines.push(`- 🟢 Low: ${results.lowCount}`);
  lines.push('');

  if (results.topVulnerabilities.length > 0) {
    lines.push('### 🔍 주요 취약점 요약');
    results.topVulnerabilities.forEach((vuln, idx) => {
      lines.push(`${idx + 1}. [${vuln.id}](${vuln.url}) - **${vuln.severity}**, ${vuln.pkg}, CVSS ${vuln.score}`);
      if (vuln.title) lines.push(`    > ${vuln.title}`);
    });
  }

  lines.push('\n🏰 Powered by GnFortress - Enterprise Cloud Security');
  return lines.join('\n');
}

async function sendSlackNotification(webhookUrl, results, imageName) {
  try {
    const statusEmoji = {
      A: ':white_check_mark:',
      B: ':large_blue_circle:',
      C: ':warning:',
      D: ':x:',
      F: ':bangbang:'
    };

    const emoji = statusEmoji[results.securityGrade.charAt(0)] || ':shield:';

    const topList = results.topVulnerabilities.map((v, i) => `• *${v.id}* (${v.severity}, ${v.pkg}, CVSS ${v.score})`).slice(0, 5).join('\n');

    const payload = {
      username: 'GnFortress Scanner',
      icon_emoji: ':shield:',
      attachments: [
        {
          color: '#36a64f',
          title: `${emoji} Docker 보안 스캔 결과 - ${results.securityGrade} 등급`,
          fields: [
            { title: '이미지', value: imageName, short: true },
            { title: '총 취약점', value: `${results.vulnerabilityCount}`, short: true },
            { title: 'Critical', value: `${results.criticalCount}`, short: true },
            { title: 'High', value: `${results.highCount}`, short: true },
            { title: 'CVSS 총점', value: `${results.totalCvssScore}`, short: true }
          ],
          text: topList ? `*Top 취약점:*
${topList}` : '취약점 상세 정보 없음',
          footer: 'GnFortress 보안 스캐너',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    core.info('✅ Slack notification sent successfully');
  } catch (error) {
    core.warning(`⚠️ Failed to send Slack notification: ${error.message}`);
  }
}

async function addPRComment(token, results, imageName) {
  try {
    const octokit = github.getOctokit(token);
    const context = github.context;
    if (context.eventName !== 'pull_request') return;

    const body = generateMarkdownReport(results, imageName);
    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body
    });
    core.info('✅ PR comment added successfully');
  } catch (error) {
    core.warning(`⚠️ Failed to add PR comment: ${error.message}`);
  }
}

run();