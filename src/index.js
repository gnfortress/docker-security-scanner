// index.js – 전체 수정본 (installTrivy 오류 수정 포함)
const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const fs = require('fs');
const axios = require('axios');

async function installTrivy(version = 'latest') {
  try {
    await exec.exec('trivy', ['version'], { silent: true });
    core.info('✅ Trivy is already installed');
    return;
  } catch {
    core.info('📥 Downloading Trivy...');
  }

  const os = process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;

  if (version === 'latest') version = await getLatestTrivyVersion();
  const fileName = `trivy_${version}_Linux-${arch}.tar.gz`;
  const downloadUrl = `https://github.com/aquasecurity/trivy/releases/download/v${version}/${fileName}`;

  await exec.exec('curl', ['-L', '-o', fileName, downloadUrl]);
  await exec.exec('tar', ['-xzf', fileName]);
  await exec.exec('chmod', ['+x', 'trivy']);
  await exec.exec('sudo', ['mv', 'trivy', '/usr/local/bin/']);
  await exec.exec('rm', ['-f', fileName]);
  core.info('✅ Trivy installation completed');
}

async function getLatestTrivyVersion() {
  try {
    const res = await axios.get('https://api.github.com/repos/aquasecurity/trivy/releases/latest', {
      headers: { 'User-Agent': 'GnFortress-Docker-Scanner' },
    });
    return res.data.tag_name.replace(/^v/, '');
  } catch (e) {
    core.warning(`⚠️ Failed to fetch Trivy version: ${e.message}`);
    return '0.49.1';
  }
}

async function pullDockerImage(image) {
  try {
    await exec.exec('docker', ['pull', image]);
    core.info(`✅ Pulled image: ${image}`);
  } catch (e) {
    core.warning(`⚠️ Docker pull failed: ${e.message}`);
  }
}

async function runTrivyScan(image, severity = 'MEDIUM') {
  const jsonFile = 'trivy-results.json';
  const tableFile = 'trivy-results.table';

  await exec.exec('trivy', [
    'image', '--format', 'json', '--output', jsonFile,
    '--severity', severity, '--quiet', '--exit-code', '0', image
  ]);
  await exec.exec('trivy', [
    'image', '--format', 'table', '--output', tableFile,
    '--severity', severity, '--quiet', image
  ]);

  const json = fs.readFileSync(jsonFile, 'utf8');
  return JSON.parse(json);
}

function countVulns(results) {
  let counts = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of results.Results || []) {
    for (const v of r.Vulnerabilities || []) {
      counts.total++;
      counts[v.Severity.toLowerCase()]++;
    }
  }
  return counts;
}

function generateMarkdownReport(counts, status, image) {
  const emoji = status === 'success' ? '✅' : (status === 'failure' ? '❌' : '⚠️');
  return `## ${emoji} Docker Security Scan Results

**Image:** \`${image}\`

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${counts.critical} |
| 🟠 High     | ${counts.high} |
| 🟡 Medium   | ${counts.medium} |
| 🟢 Low      | ${counts.low} |
| **Total**  | **${counts.total}** |

---
📊 **Status:** ${status.toUpperCase()}
🏰 Powered by GnFortress
`;
}

async function run() {
  try {
    const image = core.getInput('image', { required: true });
    core.info('🔍 Scanning Docker image: ' + image);

    await installTrivy();
    await pullDockerImage(image);
    const results = await runTrivyScan(image);
    const counts = countVulns(results);

    core.setOutput('vulnerabilities', counts);

    const status = counts.critical > 0 ? 'failure' : 'success';
    const markdown = generateMarkdownReport(counts, status, image);
    core.setOutput('report-markdown', markdown);

    if (status === 'failure') core.setFailed('❌ Critical vulnerabilities found');
    else core.info('✅ Scan completed with no critical issues.');

  } catch (err) {
    core.setFailed(`❌ Action failed: ${err.message}`);
  }
}

run();
