import { Log } from './logging_middleware/index.js';

// Set API URL for testing
process.env.LOG_API_URL = process.env.LOG_API_URL || 'http://4.224.186.213/evaluation-service/logs';

console.log("=== Testing Logging Middleware ===\n");
console.log(`API URL: ${process.env.LOG_API_URL}\n`);

// Test 1: Valid log
console.log("Test 1: Sending valid log...");
await Log("backend", "error", "handler", "Test error message from handler");

// Test 2: Valid log with different level
console.log("Test 2: Sending info level log...");
await Log("backend", "info", "service", "Service initialized successfully");

// Test 3: Invalid inputs (should be sanitized)
console.log("\nTest 3: Sending log with invalid values...");
await Log("invalid_stack", "invalid_level", "invalid_package", "This has invalid values");

// Test 4: Another valid log
console.log("\nTest 4: Sending another valid log...");
await Log("frontend", "debug", "controller", "Frontend controller action triggered");

console.log("\n=== Tests Complete ===");
