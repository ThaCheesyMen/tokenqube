import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface SuccessConfettiProps {
  show: boolean;
  onComplete?: () => void;
}

export default function SuccessConfetti({ show, onComplete }: SuccessConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; duration: number; rotation: number }>>([]);

  useEffect(() => {
    if (show) {
      // Create 50 particles with random positions
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);

      // Clean up after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute -top-10 animate-confetti-fall"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        >
          <Coins
            className="w-6 h-6 text-yellow-400 animate-spin"
            style={{
              animationDuration: '1s',
              transform: `rotate(${particle.rotation}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

