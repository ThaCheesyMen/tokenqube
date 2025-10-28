import { useState, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleWidgetProps {
  id: string;
  title?: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
}

export default function CollapsibleWidget({
  id,
  title,
  children,
  defaultCollapsed = false,
  className = '',
}: CollapsibleWidgetProps) {
  const storageKey = `widget-collapsed-${id}`;
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null ? saved === 'true' : defaultCollapsed;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(isCollapsed));
  }, [isCollapsed, storageKey]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Collapse Button - Only shows on hover if title is not provided */}
      {!title && (
        <button
          onClick={toggleCollapse}
          className="absolute -top-2 right-2 z-10 p-1.5 bg-[#1a1a1a] border border-[#202225] rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#2a2a2a] hover:border-[#8B5CF6] transition-all duration-200 shadow-lg"
          title={isCollapsed ? 'Expand widget' : 'Collapse widget'}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400 hover:text-white" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400 hover:text-white" />
          )}
        </button>
      )}

      {/* Title with collapse button */}
      {title && (
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#202225] rounded-t-xl hover:bg-[#202225] transition-colors"
        >
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          )}
        </button>
      )}

      {/* Widget Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        {children}
      </div>

      {/* Collapsed Placeholder */}
      {isCollapsed && (
        <div className="p-2 bg-[#1a1a1a] border border-[#202225] rounded-b-xl flex items-center justify-center">
          <span className="text-xs text-gray-500">Widget collapsed</span>
        </div>
      )}
    </div>
  );
}

