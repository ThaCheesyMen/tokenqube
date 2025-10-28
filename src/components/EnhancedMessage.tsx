import { useState, useRef, useEffect } from 'react';
import { 
  Edit2, Trash2, Reply, Pin, MoreVertical, Smile, 
  Check, X, Image as ImageIcon, File 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import MarkdownRenderer from './MarkdownRenderer';
import RoleBadge from './RoleBadge';

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

interface Attachment {
  type: 'image' | 'file';
  url: string;
  name: string;
  size?: number;
}

interface EnhancedMessageProps {
  id: string;
  message: string;
  username: string;
  avatar: string;
  timestamp: string;
  isOwnMessage: boolean;
  showAvatar: boolean;
  showUsername: boolean;
  messageType: 'dm' | 'global';
  roomId?: string;
  editedAt?: string | null;
  replyTo?: {
    id: string;
    username: string;
    message: string;
  } | null;
  isPinned?: boolean;
  attachments?: Attachment[];
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string, username: string, message: string) => void;
  userRole?: string;
}

export default function EnhancedMessage({
  id,
  message,
  username,
  avatar,
  timestamp,
  isOwnMessage,
  showAvatar,
  showUsername,
  messageType,
  roomId,
  editedAt,
  replyTo,
  isPinned,
  attachments = [],
  onEdit,
  onDelete,
  onReply,
  userRole,
}: EnhancedMessageProps) {
  const { profile } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showFullTime, setShowFullTime] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Common emojis for quick reactions
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch reactions
  useEffect(() => {
    fetchReactions();
    
    // Subscribe to reaction changes
    const channel = supabase
      .channel(`message_reactions_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${id}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('message_reactions')
      .select('emoji, user_id, profiles:user_id(username)')
      .eq('message_id', id)
      .eq('message_type', messageType);

    if (data) {
      // Group reactions by emoji
      const reactionMap = new Map<string, { users: string[]; userIds: string[] }>();
      
      data.forEach((r: any) => {
        const existing = reactionMap.get(r.emoji) || { users: [], userIds: [] };
        existing.users.push(r.profiles?.username || 'Unknown');
        existing.userIds.push(r.user_id);
        reactionMap.set(r.emoji, existing);
      });

      const reactionList: Reaction[] = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.users.length,
        users: data.users,
        hasReacted: data.userIds.includes(profile?.id || ''),
      }));

      setReactions(reactionList);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!profile) return;

    const reaction = reactions.find(r => r.emoji === emoji);
    
    if (reaction?.hasReacted) {
      // Remove reaction
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', id)
        .eq('user_id', profile.id)
        .eq('emoji', emoji)
        .eq('message_type', messageType);

      if (error) {
        toast.error('Failed to remove reaction');
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: id,
          message_type: messageType,
          user_id: profile.id,
          emoji,
        });

      if (error) {
        toast.error('Failed to add reaction');
      }
    }

    setShowEmojiPicker(false);
  };

  const handleEdit = async () => {
    if (!onEdit || editContent.trim() === message) {
      setIsEditing(false);
      return;
    }

    onEdit(id, editContent.trim());
    setIsEditing(false);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (onDelete && confirm('Delete this message?')) {
      onDelete(id);
      setShowMenu(false);
    }
  };

  const handleReplyClick = () => {
    if (onReply) {
      onReply(id, username, message);
      setShowMenu(false);
    }
  };

  const handlePin = async () => {
    const { error } = await supabase
      .from(messageType === 'dm' ? 'dm_messages' : 'messages')
      .update({ is_pinned: !isPinned })
      .eq('id', id);

    if (error) {
      toast.error('Failed to pin message');
    } else {
      toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
    }
    setShowMenu(false);
  };

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
      className="group relative flex items-start gap-3 px-4 py-1 hover:bg-[#32353b] transition-colors"
    >
      {/* Avatar - only show on first message in group */}
      <div className="flex-shrink-0 w-10 h-10 mt-1">
        {showAvatar && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] hover:rounded-2xl transition-all cursor-pointer overflow-hidden"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white">{username[0].toUpperCase()}</span>
            )}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Username and timestamp - only show on first message in group */}
        {showUsername && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-white hover:underline cursor-pointer">
              {username}
            </span>
            {userRole && <RoleBadge role={userRole} size="sm" />}
            <span
              className="text-xs text-gray-400 hidden group-hover:inline cursor-pointer"
              onMouseEnter={() => setShowFullTime(true)}
              onMouseLeave={() => setShowFullTime(false)}
              title={new Date(timestamp).toLocaleString()}
            >
              {getMessageTime()}
            </span>
            {isPinned && (
              <Pin className="w-3 h-3 text-[#8B5CF6]" />
            )}
          </div>
        )}

        {/* Reply indicator */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-1 text-xs text-gray-400 pl-4 border-l-2 border-gray-600">
            <Reply className="w-3 h-3" />
            <span className="font-semibold">{replyTo.username}</span>
            <span className="truncate max-w-xs">{replyTo.message}</span>
          </div>
        )}

        {/* Message Text */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="flex-1 bg-[#1a1a1a] text-gray-100 text-sm px-2 py-1 rounded border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
              autoFocus
            />
            <button onClick={handleEdit} className="text-green-500 hover:text-green-400">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-100 leading-relaxed break-words">
              <MarkdownRenderer content={message} />
              {editedAt && (
                <span className="text-xs text-gray-500 ml-1">(edited)</span>
              )}
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index}>
                    {attachment.type === 'image' ? (
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="max-w-md rounded-lg cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(attachment.url, '_blank')}
                      />
                    ) : (
                      <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded border border-[#202225] max-w-xs">
                        <File className="w-5 h-5 text-[#8B5CF6]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{attachment.name}</p>
                          {attachment.size && (
                            <p className="text-xs text-gray-400">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reactions */}
            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReaction(reaction.emoji)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition ${
                      reaction.hasReacted
                        ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]'
                        : 'bg-[#1a1a1a] border border-[#202225] hover:border-[#8B5CF6]/50'
                    }`}
                    title={reaction.users.join(', ')}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-gray-300">{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Message Actions (show on hover) */}
      {!isEditing && (
        <div className="absolute top-0 right-4 hidden group-hover:flex items-center gap-1 bg-[#1a1a1a] border border-[#202225] rounded shadow-lg px-1 py-1">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 hover:bg-[#1a1a1a] rounded transition"
            title="Add reaction"
          >
            <Smile className="w-4 h-4 text-gray-400" />
          </button>
          
          {onReply && (
            <button
              onClick={handleReplyClick}
              className="p-1 hover:bg-[#1a1a1a] rounded transition"
              title="Reply"
            >
              <Reply className="w-4 h-4 text-gray-400" />
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-[#1a1a1a] rounded transition"
              title="More"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 bg-[#1a1a1a] border border-[#202225] rounded shadow-xl py-1 min-w-[160px] z-50">
                {isOwnMessage && onEdit && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#8B5CF6] text-gray-300 hover:text-white transition text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Message
                  </button>
                )}
                
                <button
                  onClick={handlePin}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#8B5CF6] text-gray-300 hover:text-white transition text-sm"
                >
                  <Pin className="w-4 h-4" />
                  {isPinned ? 'Unpin' : 'Pin'} Message
                </button>

                {isOwnMessage && onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500 text-gray-300 hover:text-white transition text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Message
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute top-8 right-4 bg-[#1a1a1a] border border-[#202225] rounded shadow-xl p-2 z-50"
        >
          <div className="grid grid-cols-4 gap-1">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="p-2 hover:bg-[#1a1a1a] rounded text-xl transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

