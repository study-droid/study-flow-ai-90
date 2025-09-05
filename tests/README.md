# StudyFlow AI - E2E Test Suite

## Overview

This directory contains the comprehensive end-to-end testing suite for StudyFlow AI, built with Playwright and designed to ensure application quality, performance, and security across all features and browsers.

## 🏗️ Test Architecture

### Test Structure
```
tests/
├── config/           # Test environment configuration
├── utils/            # Utilities, helpers, and page objects
├── e2e/              # End-to-end test suites
├── performance/      # Performance and load testing
├── security/         # Security and vulnerability testing
└── .auth/            # Authentication state storage
```

### Key Components

#### Configuration (`tests/config/`)
- **global-setup.ts** - Test environment initialization, database setup, user creation
- **global-teardown.ts** - Cleanup, reporting, and artifact management
- **database-setup.ts** - Supabase test database management with fixtures
- **user-setup.ts** - Test user creation and management
- **mock-server.ts** - MSW mock server for AI services

#### Utilities (`tests/utils/`)
- **test-helpers.ts** - Testing utility classes and common operations
- **fixtures.ts** - Custom Playwright fixtures and test contexts
- **page-objects.ts** - Page object model implementations

#### Test Suites (`tests/e2e/`)
- **auth/** - Authentication, authorization, and security boundaries
- **core/** - Dashboard, tasks, study sessions, and core functionality
- **ai/** - AI Tutor, table generation, and recommendation systems
- **advanced/** - Analytics, goals, flashcards, and advanced features
- **accessibility/** - WCAG compliance and accessibility testing
- **cross-browser/** - Multi-browser compatibility testing

## 🚀 Getting Started

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup
1. Copy `.env.test.example` to `.env.test`
2. Configure test environment variables:
   ```env
   PLAYWRIGHT_BASE_URL=http://localhost:8080
   TEST_SUPABASE_URL=http://localhost:54321
   TEST_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   TEST_USER_EMAIL=test@studyflow.ai
   TEST_USER_PASSWORD=TestPassword123!
   ```

### Running Tests

#### All Tests
```bash
npm run test:e2e
```

#### Specific Test Suites
```bash
# Authentication tests
npx playwright test tests/e2e/auth

# Core functionality tests
npx playwright test tests/e2e/core

# AI integration tests
npx playwright test tests/e2e/ai

# Advanced features tests
npx playwright test tests/e2e/advanced

# Accessibility tests
npx playwright test tests/e2e/accessibility

# Cross-browser tests
npx playwright test tests/e2e/cross-browser

# Performance tests
npx playwright test tests/performance

# Security tests
npx playwright test tests/security
```

#### Specific Browsers
```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit

# Mobile Chrome
npx playwright test --project=Mobile-Chrome
```

#### Debug Mode
```bash
# Run with UI
npx playwright test --ui

# Debug specific test
npx playwright test --debug tests/e2e/auth/auth-flow.test.ts

# Headed mode
npx playwright test --headed
```

## 🧪 Test Categories

### 1. Authentication & Security (`tests/e2e/auth/`)
- User registration and login flows
- Session management and timeouts
- Permission boundaries and role-based access
- Password security and validation
- OAuth integration testing
- Protected route verification

### 2. Core Functionality (`tests/e2e/core/`)
- **Dashboard**: Widgets, navigation, responsive design
- **Tasks**: CRUD operations, filtering, sorting, search
- **Study Sessions**: Timer functionality, Pomodoro integration, progress tracking

### 3. AI Integration (`tests/e2e/ai/`)
- **AI Tutor**: Chat interface, streaming responses, context management
- **Table Generation**: AI-powered creation, editing, export capabilities
- **Recommendations**: Personalized suggestions, adaptive learning insights

### 4. Advanced Features (`tests/e2e/advanced/`)
- **Analytics**: Data visualization, reporting, performance metrics
- **Goals**: Creation, tracking, achievement, progress analytics
- **Flashcards**: Spaced repetition, study modes, multimedia support

### 5. Accessibility (`tests/e2e/accessibility/`)
- WCAG 2.1 AA compliance testing
- Keyboard navigation and focus management
- Screen reader compatibility
- Color contrast and visual accessibility
- Mobile accessibility and touch targets

### 6. Cross-Browser Compatibility (`tests/e2e/cross-browser/`)
- Chrome, Firefox, Safari, Edge testing
- JavaScript API compatibility
- CSS feature support validation
- Performance across browsers
- Mobile browser testing

### 7. Performance Testing (`tests/performance/`)
- Page load times and Core Web Vitals
- Resource loading optimization
- JavaScript execution performance
- Memory usage and cleanup
- Network performance and offline handling

### 8. Security Testing (`tests/security/`)
- XSS prevention and input sanitization
- CSRF protection validation
- Authentication security measures
- Data protection and storage security
- API security and rate limiting

## 🎯 Test Features

### Mock Server Integration
- **MSW (Mock Service Worker)** for AI service simulation
- Realistic response patterns and streaming simulation
- Error scenario testing and network failure handling
- Configurable response delays and rate limiting

### Advanced Testing Patterns
- **Streaming Response Testing** - Real-time AI chat validation
- **Visual Regression Testing** - Screenshot comparison capabilities
- **Performance Budgets** - Automated performance threshold enforcement
- **Accessibility Auditing** - Integrated axe-core testing
- **Cross-Device Testing** - Mobile, tablet, desktop viewports

### Test Data Management
- **Isolated Test Environment** - Separate database and user management
- **Fixture Management** - Consistent test data setup and cleanup
- **User State Management** - Pre-authenticated test contexts
- **Database Seeding** - Realistic test data scenarios

### Reporting and Monitoring
- **HTML Reports** - Detailed test execution reports
- **Screenshot Capture** - Automatic failure documentation
- **Performance Metrics** - Load times, memory usage, network analysis
- **Accessibility Reports** - WCAG compliance scoring
- **CI/CD Integration** - Automated testing in GitHub Actions

## 🔧 Configuration

### Playwright Configuration (`playwright.config.ts`)
- Multi-browser setup (Chrome, Firefox, Safari, Mobile)
- Test timeouts and retry strategies
- Base URL and global test settings
- Reporter configuration and artifact handling

### Environment Variables (`.env.test`)
```env
# Application URLs
PLAYWRIGHT_BASE_URL=http://localhost:8080
VITE_SUPABASE_URL=http://localhost:54321

# Database Configuration
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Service Configuration
VITE_DEEPSEEK_API_KEY=test-key
MOCK_AI_RESPONSES=true

# Test User Credentials
TEST_USER_EMAIL=test@studyflow.ai
TEST_USER_PASSWORD=TestPassword123!

# Feature Flags
ENABLE_AI_TUTOR_TESTS=true
ENABLE_TABLE_GENERATION_TESTS=true
ENABLE_PERFORMANCE_TESTS=true
ENABLE_ACCESSIBILITY_TESTS=true

# Performance Configuration
TEST_TIMEOUT=60000
PAGE_LOAD_TIMEOUT=30000
TEST_RETRIES=2
```

## 📊 CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/e2e-tests.yml`)
- **Automated Testing** on push and pull requests
- **Matrix Strategy** for parallel test execution
- **Lighthouse Integration** for performance auditing
- **Security Scanning** with npm audit
- **Artifact Management** for reports and screenshots
- **Notification System** for test failures

### Workflow Features
- **Test Parallelization** - Multiple test suites running concurrently
- **Browser Matrix** - Testing across different browsers
- **Environment Management** - Supabase setup and configuration
- **Report Generation** - HTML reports and performance metrics
- **Failure Handling** - Screenshot capture and issue creation

## 🎨 Best Practices

### Test Organization
- **Descriptive Test Names** - Clear, action-oriented descriptions
- **Logical Grouping** - Related tests grouped in describe blocks
- **Page Object Pattern** - Maintainable, reusable page interactions
- **Test Data Isolation** - Independent test execution

### Performance Optimization
- **Parallel Execution** - Tests run concurrently when possible
- **Smart Waits** - Efficient waiting strategies
- **Resource Cleanup** - Memory and resource management
- **Test Filtering** - Run only necessary tests during development

### Maintenance
- **Regular Updates** - Keep test selectors and expectations current
- **Failure Analysis** - Review and fix flaky tests
- **Coverage Monitoring** - Ensure comprehensive test coverage
- **Performance Monitoring** - Track test execution times

## 🛠️ Troubleshooting

### Common Issues

#### Test Failures
```bash
# Run specific failed test with debug
npx playwright test --debug path/to/failed/test.ts

# Generate trace for analysis
npx playwright test --trace on

# View test report
npx playwright show-report
```

#### Environment Issues
```bash
# Reset test database
npx supabase db reset

# Restart Supabase
npx supabase stop
npx supabase start

# Clear test authentication
rm -rf tests/.auth/*.json
```

#### Performance Issues
```bash
# Run performance tests only
npx playwright test tests/performance --reporter=html

# Profile specific test
npx playwright test --trace on tests/performance/performance.test.ts
```

### Debug Tools
- **Playwright Inspector** - Step-by-step test debugging
- **Trace Viewer** - Visual test execution analysis  
- **Screenshot Comparison** - Visual regression debugging
- **Network Tab** - Request/response analysis
- **Console Logs** - Application error tracking

## 📈 Metrics and Reporting

### Performance Metrics
- **Core Web Vitals** - LCP, FID, CLS measurements
- **Page Load Times** - First paint, DOM ready, network idle
- **Resource Analysis** - Bundle sizes, image optimization
- **Memory Usage** - JavaScript heap size monitoring

### Accessibility Metrics
- **WCAG Compliance** - AA level requirement validation
- **Color Contrast** - Automated contrast ratio checking
- **Keyboard Navigation** - Tab order and focus management
- **Screen Reader** - ARIA label and semantic markup validation

### Test Execution Metrics
- **Pass/Fail Rates** - Test reliability tracking
- **Execution Times** - Performance optimization targets
- **Flaky Test Detection** - Stability monitoring
- **Coverage Analysis** - Feature and code coverage metrics

## 🔮 Future Enhancements

### Planned Features
- **Visual Regression Testing** - Automated screenshot comparison
- **API Contract Testing** - Schema validation and contract testing
- **Load Testing** - Multi-user scenario testing
- **Mobile Device Testing** - Real device cloud integration
- **Internationalization Testing** - Multi-language support validation

### Integration Opportunities
- **Monitoring Integration** - Real user monitoring correlation
- **Analytics Integration** - User behavior analysis
- **Performance Budgets** - Automated performance enforcement
- **Security Scanning** - Continuous vulnerability assessment

---

For questions or issues, please refer to the [GitHub Issues](https://github.com/your-org/studyflow-ai/issues) or contact the development team.