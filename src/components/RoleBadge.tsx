import { Shield, Crown, Wrench, Headphones, Code, Zap } from 'lucide-react';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

const ROLE_CONFIG = {
  super_admin: {
    label: 'SUPER ADMIN',
    color: 'from-red-500 to-pink-600',
    textColor: 'text-red-400',
    icon: Crown,
    glow: 'shadow-red-500/50'
  },
  admin: {
    label: 'ADMIN',
    color: 'from-purple-500 to-pink-500',
    textColor: 'text-purple-400',
    icon: Shield,
    glow: 'shadow-purple-500/50'
  },
  developer: {
    label: 'DEV',
    color: 'from-blue-500 to-cyan-500',
    textColor: 'text-blue-400',
    icon: Code,
    glow: 'shadow-blue-500/50'
  },
  moderator: {
    label: 'MOD',
    color: 'from-green-500 to-emerald-500',
    textColor: 'text-green-400',
    icon: Shield,
    glow: 'shadow-green-500/50'
  },
  support: {
    label: 'SUPPORT',
    color: 'from-yellow-500 to-orange-500',
    textColor: 'text-yellow-400',
    icon: Headphones,
    glow: 'shadow-yellow-500/50'
  },
  vip: {
    label: 'VIP',
    color: 'from-yellow-400 to-amber-500',
    textColor: 'text-yellow-300',
    icon: Zap,
    glow: 'shadow-yellow-400/50'
  },
  user: {
    label: '',
    color: '',
    textColor: '',
    icon: null,
    glow: ''
  }
};

export default function RoleBadge({ 
  role, 
  size = 'sm', 
  showIcon = true, 
  showText = true 
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.user;
  
  // Don't render anything for regular users
  if (role === 'user' || !config.label) return null;

  const Icon = config.icon;
  
  const sizeClasses = {
    sm: {
      container: 'px-1.5 py-0.5 text-[10px] gap-1',
      icon: 'w-2.5 h-2.5',
      font: 'font-bold'
    },
    md: {
      container: 'px-2 py-1 text-xs gap-1.5',
      icon: 'w-3 h-3',
      font: 'font-bold'
    },
    lg: {
      container: 'px-3 py-1.5 text-sm gap-2',
      icon: 'w-4 h-4',
      font: 'font-bold'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div 
      className={`
        inline-flex items-center rounded-md
        bg-gradient-to-r ${config.color}
        ${classes.container} ${classes.font}
        text-white shadow-lg ${config.glow}
        animate-pulse-slow
      `}
      title={config.label}
    >
      {showIcon && Icon && <Icon className={classes.icon} />}
      {showText && <span>{config.label}</span>}
    </div>
  );
}

