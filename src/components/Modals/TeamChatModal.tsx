/**
 * TeamChatModal.tsx – Internal brokerage team chat.
 * - Fetches messages from `messages` table for the current org
 * - Real-time subscription for instant updates
 * - Fixed floating window, bottom-right corner
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageSquare, Loader2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';

interface ChatMessage {
  id: string;
  org_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface TeamChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatChatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '??'
  );
}

// Deterministic avatar color based on sender name
const AVATAR_COLORS = [
  'bg-[#005d42]', 'bg-[#0284c7]', 'bg-[#7c3aed]',
  'bg-[#d97706]', 'bg-[#dc2626]', 'bg-[#0891b2]',
];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const TeamChatModal: React.FC<TeamChatModalProps> = ({ isOpen, onClose }) => {
  const { user, orgId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const senderName: string =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Team Member';

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch initial messages
  useEffect(() => {
    if (!isOpen || !orgId) return;
    let isMounted = true;
    setLoading(true);

    supabase
      .from('messages')
      .select('id, org_id, sender_id, sender_name, content, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          setMessages(data as ChatMessage[]);
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, orgId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (isOpen) setTimeout(scrollToBottom, 50);
  }, [messages, isOpen, scrollToBottom]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!isOpen || !orgId) return;

    const channel = supabase
      .channel(`team-chat-${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Deduplicate: skip if already in list (optimistic insert)
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, orgId]);

   const handleSend = async () => {
    const content = input.trim();
    if (!content || !orgId || !user?.id || sending) return;

    setSending(true);
    setInput(''); // Clear input instantly

    // Optimistic insert with a temp id
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      org_id: orgId,
      sender_id: user.id,
      sender_name: senderName,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    // Database insert
    const { error } = await supabase.from('messages').insert({
      org_id: orgId,
      sender_id: user.id,
      sender_name: senderName,
      content,
    });

    if (error) {
      // THIS WILL TELL US EXACTLY WHY IT FAILED
      console.error("CHAT ERROR:", error); 
      alert(`Failed to send: ${error.message}`); 
      
      // Roll back optimistic update on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content); // restore so user can retry
    } else {
      // Success! Re-fetch to get the real database ID
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    }
    
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;
  if (!user || !orgId) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-[360px] max-h-[520px] flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      style={{ background: 'var(--bg-card, #ffffff)' }}
      role="dialog"
      aria-label="Team Chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--primary,#005d42)] text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight">Team Chat</p>
            <p className="text-[10px] text-white/70 leading-tight">Internal brokerage channel</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close team chat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0 max-h-[360px] bg-[#f8f9ff]">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-[var(--primary,#005d42)] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <MessageSquare className="w-8 h-8 text-slate-200" />
            <p className="text-[12px] text-slate-400 text-center">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar – only for others */}
                {!isMe && (
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold ${avatarColor(msg.sender_name)}`}
                  >
                    {getInitials(msg.sender_name)}
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-[10px] font-semibold text-[#3e4943] px-1">
                      {msg.sender_name}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-[13px] leading-snug break-words ${
                      isMe
                        ? 'bg-[var(--primary,#005d42)] text-white rounded-br-sm'
                        : 'bg-white border border-slate-100 text-[#0b1c30] rounded-bl-sm shadow-xs'
                    } ${msg.id.startsWith('temp-') ? 'opacity-70' : ''}`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-slate-400 px-1">
                    {formatChatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-slate-100 bg-[var(--bg-card,#ffffff)] shrink-0">
        <div className="flex items-center gap-2 bg-[#eff4ff] rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--primary,#005d42)]/30 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the team…"
            maxLength={1000}
            className="flex-1 bg-transparent border-0 outline-none text-[13px] text-[#0b1c30] placeholder:text-slate-400"
            aria-label="Chat message input"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-7 h-7 rounded-lg bg-[var(--primary,#005d42)] hover:bg-[var(--primary-hover,#004d37)] disabled:opacity-40 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-[9px] text-slate-400 text-center mt-1">
          Press <kbd className="font-mono bg-slate-100 px-1 rounded text-[8px]">Enter</kbd> to send
        </p>
      </div>
    </div>
  );
};
