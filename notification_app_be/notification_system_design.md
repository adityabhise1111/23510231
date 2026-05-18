# Stage 1

## Purpose
Design a simple REST API for user notifications shown after login. The API must support listing notifications, tracking unread items, marking notifications as read, and providing a real-time delivery mechanism.

## Core Actions
The notification platform should support these actions:

1. Fetch notifications for the logged-in user.
2. Fetch only unread notifications.
3. Mark one notification as read.
4. Mark all notifications as read.
5. Get the unread notification count.
6. Subscribe to real-time notification updates.

## REST API Endpoints

### 1. Get notifications
`GET /api/v1/notifications`

Returns the authenticated user's notifications.

#### Headers
```json
{
  "Authorization": "Bearer <jwt-token>",
  "Accept": "application/json"
}
```

#### Query Parameters
- `status` optional, values: `all`, `unread`, `read`
- `limit` optional, default `20`
- `offset` optional, default `0`

#### Response
```json
{
  "data": [
    {
      "id": "n_123",
      "userId": "u_456",
      "title": "New message",
      "message": "You have a new system message",
      "type": "info",
      "isRead": false,
      "createdAt": "2026-05-18T10:15:00Z",
      "readAt": null,
      "metadata": {
        "source": "system"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 1
  }
}
```

### 2. Get unread count
`GET /api/v1/notifications/unread-count`

Returns how many unread notifications the user has.

#### Headers
```json
{
  "Authorization": "Bearer <jwt-token>",
  "Accept": "application/json"
}
```

#### Response
```json
{
  "unreadCount": 3
}
```

### 3. Mark one notification as read
`POST /api/v1/notifications/{notificationId}/read`

Marks a single notification as read.

#### Headers
```json
{
  "Authorization": "Bearer <jwt-token>",
  "Content-Type": "application/json"
}
```

#### Request Body
```json
{}
```

#### Response
```json
{
  "message": "Notification marked as read",
  "data": {
    "id": "n_123",
    "isRead": true,
    "readAt": "2026-05-18T10:20:00Z"
  }
}
```

### 4. Mark all notifications as read
`POST /api/v1/notifications/read-all`

Marks all notifications for the user as read.

#### Headers
```json
{
  "Authorization": "Bearer <jwt-token>",
  "Content-Type": "application/json"
}
```

#### Request Body
```json
{}
```

#### Response
```json
{
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

### 5. Create notification
`POST /api/v1/notifications`

Creates a notification for a user. This is mainly for internal services.

#### Headers
```json
{
  "Authorization": "Bearer <service-token>",
  "Content-Type": "application/json"
}
```

#### Request Body
```json
{
  "userId": "u_456",
  "title": "New assignment",
  "message": "Your task has been assigned",
  "type": "success",
  "metadata": {
    "source": "scheduler"
  }
}
```

#### Response
```json
{
  "message": "Notification created",
  "data": {
    "id": "n_123",
    "userId": "u_456",
    "title": "New assignment",
    "message": "Your task has been assigned",
    "type": "success",
    "isRead": false,
    "createdAt": "2026-05-18T10:30:00Z"
  }
}
```

## JSON Schema Fields

### Notification object
- `id`: unique notification id
- `userId`: owner of the notification
- `title`: short title
- `message`: main notification text
- `type`: one of `info`, `success`, `warning`, `error`
- `isRead`: boolean read status
- `createdAt`: ISO date string
- `readAt`: ISO date string or `null`
- `metadata`: optional object for extra context

### Error response
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid token"
  }
}
```

## Real-Time Notifications
Use Server-Sent Events (SSE) for live updates.

### Endpoint
`GET /api/v1/notifications/stream`

#### Headers
```json
{
  "Authorization": "Bearer <jwt-token>",
  "Accept": "text/event-stream"
}
```

#### Behavior
- The server keeps the connection open.
- When a new notification is created, the server pushes an event to the client.
- Event names should be stable and predictable, such as:
  - `notification.created`
  - `notification.updated`
  - `notification.read`

#### Example SSE event
```json
{
  "event": "notification.created",
  "data": {
    "id": "n_123",
    "title": "New message",
    "message": "You have a new system message"
  }
}
```

### Real-Time Fallback
If SSE is not available, the client can poll `GET /api/v1/notifications?status=unread` every few seconds.

## Plan
1. Keep the endpoint names versioned under `/api/v1`.
2. Use JWT auth for all user routes.
3. Store notifications with read state and timestamps.
4. Use SSE for live updates and polling as fallback.
5. Keep request and response JSON shapes small and consistent.
