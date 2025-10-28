import { useState, useRef, KeyboardEvent } from 'react';
import { 
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, 
  List, ListOrdered, Quote, Smile, Image as ImageIcon, Send 
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  onTyping?: () => void;
}

export default function RichTextInput({
  value,
  onChange,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  onTyping,
}: RichTextInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // Set cursor position after formatting
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertFormatting('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('*', '*');
          break;
        case 'u':
          e.preventDefault();
          insertFormatting('__', '__');
          break;
        case 'e':
          e.preventDefault();
          insertFormatting('`', '`');
          break;
      }
    }

    // Trigger typing indicator
    if (onTyping) {
      onTyping();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + emoji + value.substring(end);
    
    onChange(newText);
    setShowEmojiPicker(false);
    
    // Set cursor after emoji
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleGifSelect = (gifUrl: string, gifTitle: string) => {
    // Insert GIF as markdown image
    const gifMarkdown = `![${gifTitle}](${gifUrl})`;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + gifMarkdown + value.substring(start);
    
    onChange(newText);
    setShowGifPicker(false);
    
    setTimeout(() => {
      textarea.focus();
      const newPos = start + gifMarkdown.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="relative">
      {/* Formatting Toolbar */}
      {showFormatting && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1a] border border-[#202225] rounded-lg shadow-lg p-2 flex flex-wrap gap-1">
          <button
            onClick={() => insertFormatting('**', '**')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('~~', '~~')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('__', '__')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Underline (Ctrl+U)"
          >
            <span className="text-sm font-bold text-gray-300 underline">U</span>
          </button>
          <div className="w-px bg-[#202225] mx-1" />
          <button
            onClick={() => insertFormatting('`', '`')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Inline Code (Ctrl+E)"
          >
            <Code className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('```\n', '\n```')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Code Block"
          >
            <span className="text-xs font-mono text-gray-300">{'{ }'}</span>
          </button>
          <div className="w-px bg-[#202225] mx-1" />
          <button
            onClick={() => insertFormatting('[', '](url)')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Link"
          >
            <LinkIcon className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('- ', '')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Bullet List"
          >
            <List className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('1. ', '')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('> ', '')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Quote"
          >
            <Quote className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => insertFormatting('||', '||')}
            className="p-2 hover:bg-[#1a1a1a] rounded transition"
            title="Spoiler"
          >
            <span className="text-xs font-bold text-gray-300">SP</span>
          </button>
        </div>
      )}

      {/* Input Container */}
      <div className="flex items-end gap-2 bg-[#1a1a1a] rounded-lg border border-[#202225] focus-within:border-[#8B5CF6] transition">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-gray-100 px-4 py-3 resize-none focus:outline-none placeholder-gray-500"
          style={{ maxHeight: '200px' }}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 px-2 pb-2">
          {/* Formatting Toggle */}
          <button
            onClick={() => setShowFormatting(!showFormatting)}
            className={`p-2 rounded transition ${
              showFormatting
                ? 'bg-[#8B5CF6] text-white'
                : 'text-gray-400 hover:bg-[#2f3136]'
            }`}
            title="Formatting"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Emoji Picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false);
              }}
              className={`p-2 rounded transition ${
                showEmojiPicker
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-gray-400 hover:bg-[#2f3136]'
              }`}
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
                position="top"
              />
            )}
          </div>

          {/* GIF Picker */}
          <div className="relative">
            <button
              onClick={() => {
                setShowGifPicker(!showGifPicker);
                setShowEmojiPicker(false);
              }}
              className={`p-2 rounded transition ${
                showGifPicker
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-gray-400 hover:bg-[#2f3136]'
              }`}
              title="GIF"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            {showGifPicker && (
              <GifPicker
                onGifSelect={handleGifSelect}
                onClose={() => setShowGifPicker(false)}
                position="top"
              />
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={onSend}
            disabled={!value.trim() || disabled}
            className="p-2 bg-[#8B5CF6] text-white rounded hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Send (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formatting Help */}
      {showFormatting && (
        <div className="mt-2 text-xs text-gray-400 px-2">
          <span className="font-semibold">Markdown supported:</span> **bold**, *italic*, __underline__, ~~strikethrough~~, `code`, ```code block```, [link](url), ||spoiler||
        </div>
      )}
    </div>
  );
}

