import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UsernameCheckerProps {
  username: string;
  onChange: (isAvailable: boolean) => void;
}

export default function UsernameChecker({ username, onChange }: UsernameCheckerProps) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  useEffect(() => {
    if (!username || username.length < 3) {
      setStatus('idle');
      onChange(false);
      return;
    }

    const checkUsername = async () => {
      setStatus('checking');
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', username)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setStatus('taken');
          onChange(false);
        } else {
          setStatus('available');
          onChange(true);
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setStatus('idle');
        onChange(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username]);

  if (!username || username.length < 3) return null;

  return (
    <div className="mt-2">
      {status === 'checking' && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Checking availability...</span>
        </div>
      )}
      {status === 'available' && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Check className="w-3.5 h-3.5" />
          <span className="font-semibold">Username is available!</span>
        </div>
      )}
      {status === 'taken' && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <X className="w-3.5 h-3.5" />
          <span className="font-semibold">Username is already taken</span>
        </div>
      )}
    </div>
  );
}

