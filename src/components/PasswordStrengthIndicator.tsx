import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const requirements = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const metCount = requirements.filter(r => r.met).length;
  const strength = metCount === 0 ? 0 : metCount <= 2 ? 1 : metCount <= 3 ? 2 : metCount <= 4 ? 3 : 4;
  
  const strengthColors = ['bg-gray-600', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthTextColors = ['text-gray-400', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400'];

  if (password.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400">Password Strength</span>
          <span className={`text-xs font-bold ${strengthTextColors[strength]}`}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                level <= strength ? strengthColors[strength] : 'bg-[#1a1a1a]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            )}
            <span className={req.met ? 'text-green-400' : 'text-gray-500'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

