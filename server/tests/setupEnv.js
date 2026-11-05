// Runs before each test file. These values are only used by the tests.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret';
process.env.JWT_EXPIRES_IN = '1h';
