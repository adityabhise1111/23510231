# Logging Middleware

Simple reusable logging utility for the entire codebase.

## Usage

```javascript
import { Log } from './logging_middleware/index.js';

// Log a message
await Log(stack, level, packageName, message);
```

## Parameters

- **stack** (string): `"backend"` or `"frontend"`
- **level** (string): `"debug"`, `"info"`, `"error"`, `"warn"`, or `"fatal"`
- **packageName** (string): One of:
  - `"cache"`, `"controller"`, `"cron_job"`, `"db"`, `"domain"`, `"handler"`, `"repository"`, `"route"`, `"service"`, `"auth"`, `"config"`, `"middleware"`, `"utils"`
- **message** (string): The log message

## Examples

```javascript
import { Log } from './logging_middleware/index.js';

// Log an error in handler package
await Log("backend", "error", "handler", "Failed to process request");

// Log debug info in service package
await Log("backend", "debug", "service", "Fetching user data");

// Log warning in controller
await Log("backend", "warn", "controller", "User not authenticated");
```

## Behavior

- **Valid inputs**: Logs sent to API via HTTP POST
- **Invalid inputs**: Sanitized to defaults, warning logged to console, then sent to API
- **API success**: Silent (no console output)
- **API failure**: Retried once, then logged to console if both attempts fail
- **Never throws errors**: Application continues unaffected

## Error Handling

If the logging API fails:
1. First attempt to send the log
2. If failed, retry once
3. If retry also fails, console.error is called with error details

The application never crashes due to logging failures.

## Environment Variables

Add to `.env`:

```
LOG_API_URL=http://4.224.186.213/evaluation-service/logs
```
