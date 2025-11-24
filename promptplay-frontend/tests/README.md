# Frontend Tests

This directory contains unit and integration tests for the PromptPlay frontend.

## Running Tests

### Install test dependencies

```bash
npm install
```

### Run all tests

```bash
# Run tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm test -- --coverage
```

### Run specific test files

```bash
# Single file
npm test -- utils.test.js

# Pattern matching
npm test -- Button

# Specific test
npm test -- -t "should merge class names correctly"
```