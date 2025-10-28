import { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    let html = content;

    // Escape HTML to prevent XSS
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks (must be before inline code)
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
      return `<pre class="bg-[#1a1a1a] border border-[#202225] rounded p-3 my-2 overflow-x-auto"><code class="text-sm text-gray-100 font-mono">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, (_, code) => {
      return `<code class="bg-[#1a1a1a] text-[#8B5CF6] px-1.5 py-0.5 rounded text-sm font-mono">${code}</code>`;
    });

    // Spoilers
    html = html.replace(/\|\|([^|]+)\|\|/g, (_, text) => {
      return `<span class="spoiler bg-[#202225] text-[#202225] hover:text-gray-100 hover:bg-[#2f3136] px-1 rounded cursor-pointer transition" onclick="this.classList.toggle('revealed')">${text}</span>`;
    });

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

    // Underline
    html = html.replace(/__([^_]+)__/g, '<u class="underline">$1</u>');

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del class="line-through opacity-75">$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      // Validate URL
      try {
        new URL(url);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#8B5CF6] hover:underline">${text}</a>`;
      } catch {
        return `[${text}](${url})`;
      }
    });

    // Auto-link URLs
    html = html.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#8B5CF6] hover:underline break-all">${url}</a>`;
    });

    // Images (GIFs)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      return `<img src="${url}" alt="${alt}" class="max-w-md rounded-lg mt-2 cursor-pointer hover:opacity-90 transition" onclick="window.open('${url}', '_blank')" />`;
    });

    // Block quotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-[#8B5CF6] pl-3 py-1 my-2 text-gray-300 italic">$1</blockquote>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$1. $2</li>');

    // Wrap consecutive list items in ul/ol
    html = html.replace(/(<li class="ml-4">• .+<\/li>\n?)+/g, '<ul class="my-2">$&</ul>');
    html = html.replace(/(<li class="ml-4">\d+\. .+<\/li>\n?)+/g, '<ol class="my-2">$&</ol>');

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    // Mentions (future feature)
    html = html.replace(/@(\w+)/g, '<span class="text-[#8B5CF6] bg-[#8B5CF6]/10 px-1 rounded font-semibold cursor-pointer hover:bg-[#8B5CF6]/20 transition">@$1</span>');

    // Channel mentions (future feature)
    html = html.replace(/#([\w-]+)/g, '<span class="text-[#8B5CF6] bg-[#8B5CF6]/10 px-1 rounded font-semibold cursor-pointer hover:bg-[#8B5CF6]/20 transition">#$1</span>');

    return html;
  }, [content]);

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

