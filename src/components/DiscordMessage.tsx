import { useState } from 'react';

interface DiscordMessageProps {
  id: string;
  message: string;
  username: string;
  avatar: string;
  timestamp: string;
  isOwnMessage: boolean;
  showAvatar: boolean;
  showUsername: boolean;
}

export default function DiscordMessage({
  id,
  message,
  username,
  avatar,
  timestamp,
  isOwnMessage,
  showAvatar,
  showUsername,
}: DiscordMessageProps) {
  const [showFullTime, setShowFullTime] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getMessageTime = () => {
    if (showFullTime) {
      return new Date(timestamp).toLocaleString();
    }
    return formatTime(timestamp);
  };

  return (
    <div 
      className="group flex items-start gap-3 px-4 py-1 hover:bg-[#1a1a1a]/30 dark:hover:bg-[#1a1a1a]/30 transition-colors"
    >
      {/* Avatar - only show on first message in group */}
      <div className="flex-shrink-0 w-10 h-10 mt-1">
        {showAvatar && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-indigo-600 hover:rounded-2xl transition-all cursor-pointer"
          >
            {username[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Username and timestamp - only show on first message in group */}
        {showUsername && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="font-semibold text-sm text-white hover:underline cursor-pointer">
              {username}
            </span>
            <span
              className="text-xs text-gray-400 hidden group-hover:inline cursor-pointer"
              onMouseEnter={() => setShowFullTime(true)}
              onMouseLeave={() => setShowFullTime(false)}
              title={new Date(timestamp).toLocaleString()}
            >
              {getMessageTime()}
            </span>
          </div>
        )}

        {/* Message Text - Discord style, no bubble */}
        <div className="relative">
          <p className="text-sm text-gray-100 leading-relaxed break-words whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </div>
  );
}
