import "dotenv/config";
import axios from "axios";

const API_URL = "http://4.224.186.213/evaluation-service/notifications";
const typeWeight = { Placement: 3, Result: 2, Event: 1 };

function parseTimestamp(value) {
  const normalizedValue = typeof value === "string" ? value.replace(" ", "T") : value;
  const time = Date.parse(normalizedValue);
  return Number.isNaN(time) ? 0 : time;
}

function scoreNotification(notification) {
  return (typeWeight[notification.Type] || 0) * 1_000_000_000_000 + parseTimestamp(notification.Timestamp);
}

function insertTopTen(heap, item) {
  heap.push(item);
  heap.sort((left, right) => left.score - right.score);

  if (heap.length > 10) {
    heap.shift();
  }
}

async function fetchNotifications(token) {
  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    timeout: 10000,
  });

  return response.data?.notifications || [];
}

function buildPriorityInbox(notifications) {
  const heap = [];

  for (const notification of notifications) {
    insertTopTen(heap, {
      ...notification,
      score: scoreNotification(notification),
    });
  }

  return heap
    .sort((left, right) => right.score - left.score)
    .map(({ score, ...notification }) => notification);
}

async function main() {
  const token = process.env.NOTIFICATION_JWT || process.argv[2];

  if (!token) {
    console.error("Missing JWT token. Set NOTIFICATION_JWT or pass it as the first argument.");
    process.exit(1);
  }

  const notifications = await fetchNotifications(token);
  const topNotifications = buildPriorityInbox(notifications);

  console.log(JSON.stringify({ topNotifications }, null, 2));
}

main().catch((error) => {
  console.error("Failed to build priority inbox:", error.message);
  process.exit(1);
});