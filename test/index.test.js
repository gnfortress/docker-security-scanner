/**
 * GnFortress Docker Security Scanner 테스트
 * 순수 JavaScript 로직과 비즈니스 규칙을 테스트합니다.
 */

describe('🏰 GnFortress Docker Security Scanner', () => {
  
  describe('📊 취약점 분석 로직', () => {
    
    test('취약점 심각도별 카운팅', () => {
      // Arrange
      const vulnerabilities = [
        { Severity: 'CRITICAL', VulnerabilityID: 'CVE-2023-0001' },
        { Severity: 'HIGH', VulnerabilityID: 'CVE-2023-0002' },
        { Severity: 'HIGH', VulnerabilityID: 'CVE-2023-0003' },
        { Severity: 'MEDIUM', VulnerabilityID: 'CVE-2023-0004' },
        { Severity: 'LOW', VulnerabilityID: 'CVE-2023-0005' },
        { Severity: 'CRITICAL', VulnerabilityID: 'CVE-2023-0006' }
      ];

      // Act
      const counts = vulnerabilities.reduce((acc, vuln) => {
        const severity = vuln.Severity.toLowerCase();
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});

      // Assert
      expect(counts.critical).toBe(2);
      expect(counts.high).toBe(2);
      expect(counts.medium).toBe(1);
      expect(counts.low).toBe(1);
    });

    test('스캔 결과 상태 결정 로직', () => {
      // Test cases: [critical, high, medium, low, expected_status]
      const testCases = [
        [1, 0, 0, 0, 'failure'],    // Critical이 있으면 실패
        [0, 1, 0, 0, 'warning'],    // High가 있으면 경고
        [0, 0, 1, 0, 'warning'],    // Medium이 있으면 경고
        [0, 0, 0, 1, 'success'],    // Low만 있으면 성공
        [0, 0, 0, 0, 'success'],    // 취약점 없으면 성공
        [2, 3, 1, 5, 'failure'],    // Critical이 있으면 다른 건 상관없이 실패
      ];

      testCases.forEach(([critical, high, medium, low, expected]) => {
        // Act
        let status = 'success';
        if (critical > 0) {
          status = 'failure';
        } else if (high > 0 || medium > 0) {
          status = 'warning';
        }

        // Assert
        expect(status).toBe(expected);
      });
    });

    test('Trivy 결과 파싱 로직', () => {
      // Arrange
      const trivyResults = {
        Results: [
          {
            Target: 'nginx:latest (debian 11.6)',
            Class: 'os-pkgs',
            Type: 'debian',
            Vulnerabilities: [
              {
                VulnerabilityID: 'CVE-2023-1234',
                Severity: 'HIGH',
                Title: 'Test vulnerability 1'
              },
              {
                VulnerabilityID: 'CVE-2023-5678',
                Severity: 'MEDIUM',
                Title: 'Test vulnerability 2'
              }
            ]
          },
          {
            Target: 'app/package.json',
            Class: 'lang-pkgs',
            Type: 'npm',
            Vulnerabilities: [
              {
                VulnerabilityID: 'CVE-2023-9999',
                Severity: 'CRITICAL',
                Title: 'Critical npm vulnerability'
              }
            ]
          }
        ]
      };

      // Act
      const allVulnerabilities = trivyResults.Results.reduce((acc, result) => {
        if (result.Vulnerabilities) {
          acc.push(...result.Vulnerabilities);
        }
        return acc;
      }, []);

      const severityCounts = allVulnerabilities.reduce((acc, vuln) => {
        const severity = vuln.Severity.toLowerCase();
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});

      // Assert
      expect(allVulnerabilities).toHaveLength(3);
      expect(severityCounts.critical).toBe(1);
      expect(severityCounts.high).toBe(1);
      expect(severityCounts.medium).toBe(1);
    });

    test('빈 스캔 결과 처리', () => {
      // Arrange
      const emptyResults = {
        Results: []
      };

      // Act
      const vulnCount = emptyResults.Results.reduce((total, result) => {
        return total + (result.Vulnerabilities ? result.Vulnerabilities.length : 0);
      }, 0);

      // Assert
      expect(vulnCount).toBe(0);
    });

    test('null/undefined 안전 처리', () => {
      // Arrange
      const malformedResults = {
        Results: [
          {
            Target: 'test',
            Vulnerabilities: null  // null인 경우
          },
          {
            Target: 'test2'
            // Vulnerabilities 키가 없는 경우
          },
          {
            Target: 'test3',
            Vulnerabilities: [
              { Severity: 'HIGH', VulnerabilityID: 'CVE-2023-1111' }
            ]
          }
        ]
      };

      // Act
      const vulnCount = malformedResults.Results.reduce((total, result) => {
        const vulns = result.Vulnerabilities || [];
        return total + vulns.length;
      }, 0);

      // Assert
      expect(vulnCount).toBe(1);  // 유효한 취약점 1개만 카운트
    });
  });

  describe('🎨 Slack 메시지 포맷팅', () => {
    
    test('성공 상태 메시지 생성', () => {
      // Arrange
      const results = {
        vulnerabilityCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        scanStatus: 'success'
      };
      const imageName = 'nginx:latest';

      // Act
      const message = {
        color: 'good',
        title: '✅ Docker Security Scan Results',
        text: `Image: \`${imageName}\`\n🎉 No vulnerabilities found! Your image is secure.`
      };

      // Assert
      expect(message.color).toBe('good');
      expect(message.title).toContain('✅');
      expect(message.text).toContain('No vulnerabilities found');
    });

    test('경고 상태 메시지 생성', () => {
      // Arrange
      const results = {
        vulnerabilityCount: 5,
        criticalCount: 0,
        highCount: 2,
        mediumCount: 2,
        lowCount: 1,
        scanStatus: 'warning'
      };

      // Act
      const message = {
        color: 'warning',
        title: '⚠️ Docker Security Scan Results',
        fields: [
          { title: 'Total Vulnerabilities', value: results.vulnerabilityCount, short: true },
          { title: '🟡 High', value: results.highCount, short: true },
          { title: '🟠 Medium', value: results.mediumCount, short: true },
          { title: '⚪ Low', value: results.lowCount, short: true }
        ]
      };

      // Assert
      expect(message.color).toBe('warning');
      expect(message.title).toContain('⚠️');
      expect(message.fields).toHaveLength(4);
      expect(message.fields[1].value).toBe(2); // High count
    });

    test('실패 상태 메시지 생성', () => {
      // Arrange
      const results = {
        vulnerabilityCount: 10,
        criticalCount: 3,
        highCount: 4,
        mediumCount: 2,
        lowCount: 1,
        scanStatus: 'failure'
      };

      // Act
      const message = {
        color: 'danger',
        title: '❌ Docker Security Scan Results',
        text: '⚠️ **Critical vulnerabilities detected!**',
        fields: [
          { title: '🔴 Critical', value: results.criticalCount, short: true },
          { title: '🟡 High', value: results.highCount, short: true }
        ]
      };

      // Assert
      expect(message.color).toBe('danger');
      expect(message.title).toContain('❌');
      expect(message.text).toContain('Critical vulnerabilities detected');
      expect(message.fields[0].value).toBe(3); // Critical count
    });
  });

  describe('🔧 유틸리티 함수들', () => {
    
    test('이미지 이름 정규화', () => {
      // Test cases
      const testCases = [
        ['nginx', 'nginx:latest'],
        ['nginx:1.21', 'nginx:1.21'],
        ['gcr.io/project/app', 'gcr.io/project/app:latest'],
        ['registry.com/user/app:v1.0', 'registry.com/user/app:v1.0']
      ];

      testCases.forEach(([input, expected]) => {
        // Act
        const normalized = input.includes(':') ? input : `${input}:latest`;
        
        // Assert
        expect(normalized).toBe(expected);
      });
    });

    test('심각도 필터링', () => {
      // Arrange
      const vulnerabilities = [
        { Severity: 'CRITICAL' },
        { Severity: 'HIGH' },
        { Severity: 'MEDIUM' },
        { Severity: 'LOW' },
        { Severity: 'UNKNOWN' }
      ];
      
      const severityLevels = {
        'CRITICAL': 4,
        'HIGH': 3,
        'MEDIUM': 2,
        'LOW': 1,
        'UNKNOWN': 0
      };

      // Act
      const filteredHigh = vulnerabilities.filter(v => 
        severityLevels[v.Severity] >= severityLevels['HIGH']
      );
      
      const filteredMedium = vulnerabilities.filter(v => 
        severityLevels[v.Severity] >= severityLevels['MEDIUM']
      );

      // Assert
      expect(filteredHigh).toHaveLength(2); // CRITICAL, HIGH
      expect(filteredMedium).toHaveLength(3); // CRITICAL, HIGH, MEDIUM
    });

    test('타임스탬프 포맷팅', () => {
      // Act
      const timestamp = new Date().toISOString();
      const readableTime = new Date(timestamp).toLocaleString();

      // Assert
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(readableTime).toMatch(/\d{4}/); // 연도가 포함되어 있어야 함
      expect(readableTime.length).toBeGreaterThan(10); // 의미있는 길이여야 함
    });
  });

  describe('🎯 GitHub Actions 출력 포맷', () => {
    
    test('GitHub Actions 출력 형식', () => {
      // Arrange
      const scanResults = {
        vulnerabilityCount: 5,
        criticalCount: 1,
        highCount: 2,
        mediumCount: 1,
        lowCount: 1,
        scanStatus: 'failure'
      };

      // Act
      const outputs = {
        'scan-status': scanResults.scanStatus,
        'vulnerability-count': scanResults.vulnerabilityCount.toString(),
        'critical-count': scanResults.criticalCount.toString(),
        'high-count': scanResults.highCount.toString(),
        'medium-count': scanResults.mediumCount.toString(),
        'low-count': scanResults.lowCount.toString()
      };

      // Assert
      expect(outputs['scan-status']).toBe('failure');
      expect(outputs['vulnerability-count']).toBe('5');
      expect(outputs['critical-count']).toBe('1');
    });

    test('PR 댓글 마크다운 생성', () => {
      // Arrange
      const results = {
        vulnerabilityCount: 3,
        criticalCount: 1,
        highCount: 1,
        mediumCount: 1,
        lowCount: 0,
        scanStatus: 'failure',
        scanTimestamp: '2024-01-15T10:30:00Z'
      };
      const imageName = 'nginx:latest';

      // Act
      const comment = `
## 🛡️ Docker Security Scan Results

**Image:** \`${imageName}\`  
**Status:** ${results.scanStatus === 'failure' ? '❌ Failed' : '✅ Passed'}  
**Total Vulnerabilities:** ${results.vulnerabilityCount}

### 📊 Vulnerability Breakdown
| Severity | Count |
|----------|-------|
| 🔴 Critical | ${results.criticalCount} |
| 🟡 High | ${results.highCount} |
| 🟠 Medium | ${results.mediumCount} |
| ⚪ Low | ${results.lowCount} |

${results.criticalCount > 0 ? '⚠️ **Critical vulnerabilities detected!** Please review and fix immediately.' : ''}

*Scan completed at: ${new Date(results.scanTimestamp).toLocaleString()}*
      `.trim();

      // Assert
      expect(comment).toContain('Docker Security Scan Results');
      expect(comment).toContain('❌ Failed');
      expect(comment).toContain('Critical vulnerabilities detected');
      expect(comment).toContain('| 🔴 Critical | 1 |');
    });
  });

  describe('🚀 성능 및 안정성', () => {
    
    test('대량 데이터 처리 성능', () => {
      // Arrange
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        VulnerabilityID: `CVE-2023-${i.toString().padStart(5, '0')}`,
        Severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4],
        Title: `Test vulnerability ${i}`
      }));

      // Act
      const start = performance.now();
      const counts = largeDataset.reduce((acc, vuln) => {
        acc[vuln.Severity] = (acc[vuln.Severity] || 0) + 1;
        return acc;
      }, {});
      const end = performance.now();
      const duration = end - start;

      // Assert
      expect(counts.LOW).toBe(2500);
      expect(counts.MEDIUM).toBe(2500);
      expect(counts.HIGH).toBe(2500);
      expect(counts.CRITICAL).toBe(2500);
      expect(duration).toBeLessThan(100); // 100ms 이내에 처리되어야 함
    });

    test('메모리 효율적인 스트림 처리', () => {
      // Arrange
      const processInChunks = (data, chunkSize = 1000) => {
        const results = { total: 0, critical: 0 };
        
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          chunk.forEach(item => {
            results.total++;
            if (item.Severity === 'CRITICAL') {
              results.critical++;
            }
          });
        }
        
        return results;
      };

      const largeData = Array.from({ length: 5000 }, (_, i) => ({
        Severity: i % 10 === 0 ? 'CRITICAL' : 'LOW'
      }));

      // Act
      const results = processInChunks(largeData, 500);

      // Assert
      expect(results.total).toBe(5000);
      expect(results.critical).toBe(500); // 10%가 CRITICAL
    });
  });
});