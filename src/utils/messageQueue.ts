// Utility for local message queue and resend
export type QueuedMessage = {
  conversationId: string;
  content: string;
  recipientId: string;
  timestamp: number;
};

const QUEUE_KEY = "unsentMessages";

export function getQueuedMessages(): QueuedMessage[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addQueuedMessage(msg: QueuedMessage) {
  const queue = getQueuedMessages();
  queue.push(msg);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeQueuedMessage(index: number) {
  const queue = getQueuedMessages();
  queue.splice(index, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueuedMessages() {
  localStorage.removeItem(QUEUE_KEY);
}
