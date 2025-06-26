# 🏰 Docker Security Scanner by GnFortress

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/gnfortress/docker-security-scanner)](https://github.com/gnfortress/docker-security-scanner/releases)
[![GitHub](https://img.shields.io/github/license/gnfortress/docker-security-scanner)](https://github.com/gnfortress/docker-security-scanner/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/gnfortress/docker-security-scanner)](https://github.com/gnfortress/docker-security-scanner/stargazers)
[![Powered by GnFortress](https://img.shields.io/badge/Powered%20by-GnFortress-purple)](https://gnfortress.co.kr)

> **⚡ Enterprise-grade Docker security scanning in 5 minutes**  
> Trusted by Fortune 500 companies for production-ready vulnerability detection

## 🚀 Quick Start


`.github/workflows/security.yml` 파일을 만들고 아래처럼 설정하세요:

```yaml
name: Docker 보안 스캔

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Docker 보안 스캐너 실행
        uses: gnfortress/docker-security-scanner@v1
        with:
          image: nginx:latest
          slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

---


```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 🏰 Docker Security Scan
        uses: gnfortress/docker-security-scanner@v1
        with:
          image: nginx:latest
          slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

## ✨ Key Features


- 🛡️ **엔터프라이즈급 취약점 스캔** – Trivy 기반, CVSS 기준 진단
- ⚡ **빠른 속도** – 평균 5분 내 스캔 완료
- 📱 **Slack 실시간 알림** – DevSecOps 팀과 즉시 공유
- 💬 **GitHub PR 코멘트** – 자동 리뷰 코멘트 등록
- 📄 **PDF/JSON 리포트** – 감사 및 인증 대응 가능
- 🏗️ **CI/CD 연동 최적화** – GitHub Actions와 완벽 호환

---


- 🛡️ **Enterprise-Grade Scanning** - Powered by Trivy engine with CVSS scoring
- ⚡ **Lightning Fast** - Complete security analysis in under 5 minutes
- 📱 **Instant Notifications** - Real-time Slack alerts for your security team
- 💬 **GitHub Integration** - Automated PR comments with detailed reports
- 🏢 **Compliance Ready** - SOC2, ISO27001 compatible reporting
- 🔄 **Zero Configuration** - Works out of the box with smart defaults

## 📋 Usage Examples

### 🎯 Basic Security Scan

```yaml
- name: Basic Security Scan
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: myapp:latest
```

### 🚨 High-Severity Alerts Only

```yaml
- name: Critical Vulnerabilities Check
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: production-app:${{ github.sha }}
    severity-threshold: HIGH
    fail-on-critical: true
```

### 📱 Slack Integration

```yaml
- name: Security Scan with Slack Alerts  
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: webapp:latest
    slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
    severity-threshold: MEDIUM
```

### 💬 GitHub PR Comments

```yaml
- name: PR Security Review
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: feature-branch:${{ github.head_ref }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    output-format: table
```

### 🏗️ Multi-Stage Pipeline

```yaml
name: Complete Security Pipeline

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    outputs:
      scan-status: ${{ steps.scan.outputs.scan-status }}
      critical-count: ${{ steps.scan.outputs.critical-count }}
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Docker Image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: 🏰 Security Scan
        id: scan
        uses: gnfortress/docker-security-scanner@v1
        with:
          image: myapp:${{ github.sha }}
          severity-threshold: MEDIUM
          slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Upload Security Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-report.json

  deploy:
    needs: security-scan
    runs-on: ubuntu-latest
    if: needs.security-scan.outputs.scan-status == 'success'
    
    steps:
      - name: 🚀 Deploy to Production
        run: echo "Deploying secure application..."
```

## ⚙️ Configuration

### 📥 Inputs

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `image` | ✅ Yes | - | Docker image to scan (e.g., `nginx:latest`, `myapp:1.0.0`) |
| `slack-webhook` | No | - | Slack webhook URL for notifications |
| `github-token` | No | `${{ github.token }}` | GitHub token for PR comments |
| `severity-threshold` | No | `MEDIUM` | Minimum severity to report (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) |
| `fail-on-critical` | No | `false` | Fail the action if critical vulnerabilities found |
| `output-format` | No | `table` | Output format (`table`, `json`, `sarif`) |
| `trivy-version` | No | `latest` | Trivy scanner version to use |
| `cache-enabled` | No | `true` | Enable Trivy cache for faster scans |

### 📤 Outputs

| Output | Description |
|--------|-------------|
| `scan-result` | Complete scan results in JSON format |
| `vulnerability-count` | Total number of vulnerabilities found |
| `critical-count` | Number of critical severity vulnerabilities |
| `high-count` | Number of high severity vulnerabilities |
| `medium-count` | Number of medium severity vulnerabilities |
| `low-count` | Number of low severity vulnerabilities |
| `scan-status` | Overall scan status (`success`, `warning`, `failure`) |
| `report-url` | URL to detailed security report |

## 🔧 Advanced Configuration

### 🎯 Custom Severity Policies

```yaml
- name: Custom Security Policy
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: production-app:latest
    severity-threshold: HIGH
    fail-on-critical: true
    output-format: sarif
```

### 📊 Multiple Image Scanning

```yaml
strategy:
  matrix:
    image: 
      - "frontend:latest"
      - "backend:latest" 
      - "database:latest"
      
steps:
  - name: Scan ${{ matrix.image }}
    uses: gnfortress/docker-security-scanner@v1
    with:
      image: ${{ matrix.image }}
      severity-threshold: MEDIUM
```

### ⚡ Performance Optimization

```yaml
- name: Fast Scan with Cache
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: myapp:latest
    cache-enabled: true
    trivy-version: "0.47.0"  # Pin specific version
```

## 📱 Slack Integration Setup

### 1️⃣ Create Slack Webhook
1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create new app → "From scratch"
3. Enable "Incoming Webhooks"
4. Create webhook for your channel
5. Copy webhook URL

### 2️⃣ Add to GitHub Secrets
1. Repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SLACK_WEBHOOK`
4. Value: Your webhook URL

### 3️⃣ Use in Workflow
```yaml
- name: Security Scan with Slack
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: myapp:latest
    slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

## 🏢 Enterprise Features


> GnFortress는 GitHub 액션 뿐 아니라 완전한 **클라우드 보안 플랫폼**도 제공합니다.

- 🔒 **ISMS, 금융권 인증 대응**
- 📊 **PDF 기반 감사 리포트 자동 생성**
- 🤖 **AI 기반 위협 탐지 (머신러닝 모델)**
- ☁️ **Kubernetes 및 멀티 클라우드 지원**
- 👥 **보안팀 협업 기능 및 통합 대시보드**

👉 자세한 내용은 [GnFortress 플랫폼 소개](https://gnfortress.co.kr)에서 확인하세요.

---


### 🔒 Advanced Security Analysis
- **CVSS 3.1 Scoring** - Industry-standard vulnerability assessment
- **Compliance Mapping** - SOC2, PCI DSS, HIPAA compliance checks
- **Custom Rules** - Organization-specific security policies
- **Trend Analysis** - Historical vulnerability tracking

### 📊 Professional Reporting
- **Executive Dashboards** - C-level security summaries
- **Detailed Technical Reports** - Complete vulnerability breakdowns
- **Compliance Certificates** - Audit-ready documentation
- **API Integration** - Connect with SIEM and security tools

### 🚀 Ready for Enterprise Security?

**[Explore GnFortress Platform →](https://gnfortress.co.kr)**

Transform your security posture with enterprise-grade features:
- 🏗️ **Multi-Cloud Security** - AWS, Azure, GCP comprehensive protection
- 🤖 **AI-Powered Threat Detection** - Advanced pattern recognition
- 👥 **Team Collaboration** - Centralized security management
- 📞 **24/7 Expert Support** - Dedicated security engineers

## 🛠️ Troubleshooting

### Common Issues

**❌ "Image not found"**
```yaml
# ✅ Solution: Ensure image exists and is accessible
- name: Verify image exists
  run: docker pull nginx:latest
  
- name: Scan verified image
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: nginx:latest
```

**❌ "Rate limit exceeded"**
```yaml
# ✅ Solution: Enable caching
- name: Scan with cache
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: myapp:latest
    cache-enabled: true
```

**❌ "Slack notification failed"**
```yaml
# ✅ Solution: Test webhook URL
- name: Test Slack webhook
  run: |
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Test message"}' \
    ${{ secrets.SLACK_WEBHOOK }}
```

### Debug Mode

```yaml
- name: Debug Scan
  uses: gnfortress/docker-security-scanner@v1
  with:
    image: problematic-image:latest
  env:
    ACTIONS_RUNNER_DEBUG: true
    ACTIONS_STEP_DEBUG: true
```

## 📖 Example Projects

### 🌟 Production-Ready Examples

**Node.js Web Application**
```yaml
name: Node.js Security Pipeline
on: [push]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myapp:${{ github.sha }} .
      - uses: gnfortress/docker-security-scanner@v1
        with:
          image: myapp:${{ github.sha }}
          fail-on-critical: true
          slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

**Python FastAPI Service**
```yaml
name: FastAPI Security Check
on:
  pull_request:
    branches: [main]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t api:pr-${{ github.event.number }} .
      - uses: gnfortress/docker-security-scanner@v1
        with:
          image: api:pr-${{ github.event.number }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          severity-threshold: HIGH
```

## 🤝 Support & Community


- 📧 이메일: [support@gnfortress.co.kr](mailto:like@guardiannet.co.kr)
- 🐞 이슈 제보: [GitHub Issues](https://github.com/gnfortress/docker-security-scanner/issues)
- 💬 문의 게시판: [GitHub Discussions](https://github.com/gnfortress/docker-security-scanner/discussions)
- 📚 공식 문서: [https://docs.gnfortress.co.kr](https://www.gnfortress.co.kr)

---


### 💬 Get Help
- 📧 **Enterprise Support**: [support@gnfortress.co.kr](mailto:like@guardiannet.co.kr)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/gnfortress/docker-security-scanner/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/gnfortress/docker-security-scanner/discussions)
- 📚 **Documentation**: [GnFortress Docs](https://www.gnfortress.co.kr)

### 🌟 Contributing
We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

### 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 🏰 Built with ❤️ by GnFortress

**Making the cloud secure, one container at a time**

[Website](https://gnfortress.co.kr) • [Platform](https://platform.gnfortress.co.kr) • [Docs](https://www.gnfortress.co.kr) • [Blog](https://guardiannet.tistory.com/)

</div># docker-security-scanner
Enterprise-grade Docker security scanning in 5 minutes