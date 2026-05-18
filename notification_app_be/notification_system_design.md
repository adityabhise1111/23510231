# Stage 1

### Goal
Support user notifications after login with a small REST API and a real-time option.

### Core Actions
- Get notifications
- Get unread count
- Mark one as read
- Mark all as read
- Create notification
- Receive live updates

### Endpoints
```text
GET  /api/v1/notifications
GET  /api/v1/notifications/unread-count
POST /api/v1/notifications/{notificationId}/read
POST /api/v1/notifications/read-all
POST /api/v1/notifications
GET  /api/v1/notifications/stream
```

### Common Headers
```json
{
  "Authorization": "Bearer <jwt-token>",
  "Accept": "application/json"
}
```

### Main Response Shape
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
      "metadata": {}
    }
  ]
}
```

### Real-Time
Use **Server-Sent Events (SSE)** on `/api/v1/notifications/stream` for live updates. If SSE is not available, poll `GET /api/v1/notifications?status=unread`.

## Plan
1. Keep the endpoint names versioned under `/api/v1`.
2. Use JWT auth for all user routes.
3. Store notifications with read state and timestamps.
4. Use SSE for live updates and polling as fallback.
5. Keep request and response JSON shapes small and consistent.

## Stage 2

### Storage Choice
Use **PostgreSQL** because notifications need reliable storage, transactions, and fast filtered reads.

### Schema
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP NULL,
  metadata JSONB NULL
);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);
```

### Key Queries
```sql
-- Get notifications
SELECT id, user_id, title, message, type, is_read, created_at, read_at, metadata
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- Unread count
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1 AND is_read = FALSE;

-- Mark one as read
UPDATE notifications
SET is_read = TRUE, read_at = NOW()
WHERE id = $1 AND user_id = $2;

-- Mark all as read
UPDATE notifications
SET is_read = TRUE, read_at = NOW()
WHERE user_id = $1 AND is_read = FALSE;
```

### Growth Problems and Fixes
- Large inboxes slow down reads: use indexes and pagination.
- Read-all updates can be heavy: update only unread rows and run them in the background if needed.
- Old data grows storage: archive or partition old notifications.

## Stage 3

### Is the Query Accurate?
Mostly yes, but it should usually select only the needed columns instead of `*`.

```sql
SELECT id, studentID, notificationType, message, isRead, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = FALSE
ORDER BY createdAt DESC;
```

### Why Is It Slow?
- The table is large, so scanning unread rows can still be expensive.
- `ORDER BY createdAt DESC` needs help from an index.
- `SELECT *` reads extra data that the API may not need.

### What Would I Change?
- Select only required columns.
- Add a composite index on `(studentID, isRead, createdAt DESC)`.
- Keep pagination if the result set can grow large.

### Likely Cost
Without an index, the query can approach a full table scan, so the cost grows with the number of notifications. With the right composite index, it becomes much cheaper because the database can filter and sort more efficiently.

### Is Indexing Every Column a Good Idea?
No. Adding indexes on every column is not effective.
- It slows down inserts, updates, and deletes.
- It uses extra storage.
- Most indexes will never be used.

### Better Index
```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications (studentID, isRead, createdAt DESC);
```

### Placement Notifications in Last 7 Days
```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

### Notes on `notification_type`
`notificationType` should use the enum values `Event`, `Result`, and `Placement`.

### Recommendation
PostgreSQL is the best first choice for this system because the data is structured and the API needs are simple.

## Stage 4

### Problem
Fetching notifications on every page load for every student causes too many DB reads.

### Suggested Fix
Use **cached unread counts + paginated notification fetches + real-time push**.

### How to Improve Performance
- Cache unread counts in Redis or memory.
- Load only the latest notifications first.
- Avoid fetching full history on every page load.
- Use SSE/WebSocket to push new notifications instead of re-reading the table.

### Tradeoffs
- **Caching**: faster reads, but cache can become stale.
- **Pagination**: less data per request, but users may need more clicks or scrolling.
- **Real-time push**: best UX, but adds connection and server complexity.
- **Background refresh**: keeps UI fresh, but data may not update instantly.

### Best Practical Choice
Use pagination for the inbox, cache the unread count, and push new notifications in real time. This gives good speed without making the system too complex.
