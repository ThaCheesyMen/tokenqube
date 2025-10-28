import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { discordSounds } from '../utils/discordSounds';

interface IncomingCallNotificationProps {
  callerUsername: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallNotification({
  callerUsername,
  callerAvatar,
  isVideoCall,
  onAccept,
  onDecline,
}: IncomingCallNotificationProps) {
  const [isRinging, setIsRinging] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play ringtone
    playRingtone();

    // Auto-decline after 30 seconds
    const timeout = setTimeout(() => {
      onDecline();
    }, 30000);

    return () => {
      clearTimeout(timeout);
      stopRingtone();
    };
  }, []);

  const playRingtone = async () => {
    try {
      await discordSounds.playIncomingCall();
      setIsRinging(true);
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  const stopRingtone = () => {
    setIsRinging(false);
  };

  const handleAccept = () => {
    stopRingtone();
    onAccept();
  };

  const handleDecline = () => {
    stopRingtone();
    onDecline();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-[#2f3136] to-[#36393f] rounded-2xl shadow-2xl border border-[#202225] p-8 max-w-md w-full mx-4 animate-scaleIn">
        {/* Caller Info */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            {/* Avatar with pulse animation */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center text-white text-5xl font-bold shadow-2xl animate-pulse">
              {callerAvatar ? (
                <img
                  src={callerAvatar}
                  alt={callerUsername}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                callerUsername[0].toUpperCase()
              )}
            </div>

            {/* Call type indicator */}
            <div className={`absolute -bottom-2 -right-2 p-3 rounded-full ${
              isVideoCall ? 'bg-green-500' : 'bg-blue-500'
            } shadow-lg`}>
              {isVideoCall ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <Phone className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{callerUsername}</h2>
          <p className="text-gray-400">
            {isVideoCall ? 'Incoming video call...' : 'Incoming voice call...'}
          </p>

          {/* Ringing indicator */}
          {isRinging && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* Call Actions */}
        <div className="flex items-center justify-center gap-6">
          {/* Decline */}
          <button
            onClick={handleDecline}
            className="group relative p-6 bg-red-500 hover:bg-red-600 rounded-full transition-all hover:scale-110 shadow-lg"
            title="Decline"
          >
            <PhoneOff className="w-8 h-8 text-white" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
              Decline
            </span>
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="group relative p-6 bg-green-500 hover:bg-green-600 rounded-full transition-all hover:scale-110 shadow-lg animate-pulse"
            title="Accept"
          >
            {isVideoCall ? (
              <Video className="w-8 h-8 text-white" />
            ) : (
              <Phone className="w-8 h-8 text-white" />
            )}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
              Accept
            </span>
          </button>
        </div>

        {/* Additional info */}
        <p className="text-center text-xs text-gray-500 mt-8">
          Call will auto-decline in 30 seconds
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

