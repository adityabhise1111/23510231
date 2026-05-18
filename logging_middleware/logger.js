import axios from "axios";
import { ALLOWED_STACK, ALLOWED_LEVEL, ALLOWED_PACKAGE } from "./constants.js";

// Validate and sanitize input values
function validateLog(stack, level, packageName, message) {
  const validatedStack = ALLOWED_STACK.includes(stack) ? stack : "backend";
  const validatedLevel = ALLOWED_LEVEL.includes(level) ? level : "error";
  const validatedPackage = ALLOWED_PACKAGE.includes(packageName)
    ? packageName
    : "middleware";

  // Log warnings to console if values were invalid
  if (validatedStack !== stack) {
    console.warn(`[LOG VALIDATION] Invalid stack: "${stack}", using "${validatedStack}"`);
  }
  if (validatedLevel !== level) {
    console.warn(`[LOG VALIDATION] Invalid level: "${level}", using "${validatedLevel}"`);
  }
  if (validatedPackage !== packageName) {
    console.warn(`[LOG VALIDATION] Invalid package: "${packageName}", using "${validatedPackage}"`);
  }

  return { stack: validatedStack, level: validatedLevel, package: validatedPackage, message };
}

// Send log to API
async function sendLogToAPI(logData) {
  const apiUrl = process.env.LOG_API_URL;

  if (!apiUrl) {
    console.error("[LOG SERVICE ERROR] LOG_API_URL not configured in .env");
    return false;
  }

  try {
    await axios.post(apiUrl, logData, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Main Log function - simple and straightforward
export async function Log(stack, level, packageName, message) {
  // Validate and sanitize input
  const validatedLog = validateLog(stack, level, packageName, message);

  // Try to send log to API
  const firstAttempt = await sendLogToAPI(validatedLog);

  if (firstAttempt) {
    // Success - no console output
    return;
  }

  // First attempt failed - retry once
  const retryAttempt = await sendLogToAPI(validatedLog);

  if (retryAttempt) {
    // Retry succeeded - no console output
    return;
  }

  // Both attempts failed - log to console
  console.error(
    `[LOG SERVICE ERROR] Failed to send log: ${JSON.stringify(validatedLog)}`
  );
}
