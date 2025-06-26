module.exports = {
  // 환경 설정
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  
  // 기본 설정 확장
  extends: [
    'eslint:recommended'
  ],
  
  // 파서 옵션
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  
  // 전역 변수
  globals: {
    'global': 'readonly',
    'process': 'readonly',
    'Buffer': 'readonly',
    '__dirname': 'readonly',
    '__filename': 'readonly',
    'module': 'writable',
    'require': 'readonly',
    'exports': 'writable'
  },
  
  // 규칙 설정
  rules: {
    // 기본 규칙들
    'indent': ['error', 2],
    'linebreak-style': 0, // Windows/Unix 호환성
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // 코드 품질
    'no-console': 'off', // GitHub Actions에서 console 사용 허용
    'no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_' 
    }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
    
    // 스타일 규칙
    'comma-dangle': ['error', 'never'],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'func-call-spacing': 'error',
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'no-trailing-spaces': 'error',
    'no-whitespace-before-property': 'error',
    'object-curly-spacing': ['error', 'always'],
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', 'never'],
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    
    // ES6+ 규칙
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    
    // 보안 관련
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-script-url': 'error',
    
    // GitHub Actions 특화
    'no-process-exit': 'off' // process.exit() 사용 허용
  },
  
  // 특정 파일/디렉토리별 설정
  overrides: [
    {
      // 테스트 파일용 설정
      files: ['test/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        jest: true
      },
      globals: {
        'describe': 'readonly',
        'test': 'readonly',
        'it': 'readonly',
        'expect': 'readonly',
        'beforeEach': 'readonly',
        'afterEach': 'readonly',
        'beforeAll': 'readonly',
        'afterAll': 'readonly',
        'jest': 'readonly'
      },
      rules: {
        // 테스트에서는 더 관대한 규칙
        'no-unused-expressions': 'off',
        'max-lines-per-function': 'off',
        'max-statements': 'off'
      }
    },
    {
      // 설정 파일용 설정
      files: ['*.config.js', '.eslintrc.js', 'jest.config.js'],
      rules: {
        'no-undef': 'off'
      }
    }
  ],
  
  // 무시할 패턴
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '.jest-cache/',
    '*.min.js'
  ]
};