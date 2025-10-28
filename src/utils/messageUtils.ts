/**
 * Interface for messages
 */
export interface MessageData {
  id: string;
  message: string;
  timestamp?: string;
  created_at?: string;
  user_id?: string;
  sender_id?: string;
  profiles?: {
    username: string;
  };
}

/**
 * Check if two messages are from the same user
 */
export function areSameUser(msg1: MessageData, msg2: MessageData): boolean {
  const userId1 = msg1.user_id || msg1.sender_id;
  const userId2 = msg2.user_id || msg2.sender_id;
  return userId1 === userId2 && userId1 !== undefined;
}

/**
 * Check if two messages are within the grouping time window (5 minutes)
 */
export function areWithinTimeWindow(msg1: MessageData, msg2: MessageData, windowMinutes: number = 5): boolean {
  const time1 = new Date(msg1.timestamp || msg1.created_at || '').getTime();
  const time2 = new Date(msg2.timestamp || msg2.created_at || '').getTime();
  const diff = Math.abs(time1 - time2);
  return diff < windowMinutes * 60 * 1000;
}

/**
 * Check if a message should be grouped with the previous message
 */
export function shouldGroupMessage(
  currentMsg: MessageData,
  previousMsg: MessageData,
  windowMinutes: number = 5
): boolean {
  return areSameUser(currentMsg, previousMsg) && areWithinTimeWindow(currentMsg, previousMsg, windowMinutes);
}

/**
 * Group messages by user and time
 */
export function groupMessages<T extends MessageData>(messages: T[]): T[][] {
  const groups: T[][] = [];
  let currentGroup: T[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // First message always starts a group
    if (currentGroup.length === 0) {
      currentGroup.push(msg);
      continue;
    }

    const lastMsg = currentGroup[currentGroup.length - 1];

    // Check if this message should be grouped with the previous one
    if (shouldGroupMessage(msg, lastMsg)) {
      currentGroup.push(msg);
    } else {
      // Start a new group
      groups.push(currentGroup);
      currentGroup = [msg];
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Format time as relative (e.g., "2m ago", "1h ago")
 */
export function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return date.toLocaleDateString();
}

/**
 * Format time as full timestamp
 */
export function formatFullTime(timestamp: string): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString();
}
