import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TournamentCountdownProps {
  tournamentStart: string;
  compact?: boolean;
}

export default function TournamentCountdown({ tournamentStart, compact = false }: TournamentCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(tournamentStart).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          total: difference
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [tournamentStart]);

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 font-semibold">
        <Clock className="w-4 h-4 animate-pulse" />
        <span>LIVE NOW!</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-gray-300">
        <Clock className="w-4 h-4" />
        <span className="font-mono">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#202225]">
      <div className="flex items-center gap-2 mb-3 text-gray-400 text-sm">
        <Clock className="w-4 h-4" />
        <span>Starts in:</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {timeLeft.days > 0 && (
          <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-[#202225]">
            <div className="text-2xl font-bold text-white font-mono">{timeLeft.days}</div>
            <div className="text-xs text-gray-400 mt-1">Days</div>
          </div>
        )}
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-[#202225]">
          <div className="text-2xl font-bold text-white font-mono">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-400 mt-1">Hours</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-[#202225]">
          <div className="text-2xl font-bold text-white font-mono">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-400 mt-1">Minutes</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-lg p-3 text-center border border-[#202225]">
          <div className="text-2xl font-bold text-[#8B5CF6] font-mono animate-pulse">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-400 mt-1">Seconds</div>
        </div>
      </div>
    </div>
  );
}

