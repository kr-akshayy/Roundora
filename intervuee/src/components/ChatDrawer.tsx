import { useEffect, useState, useRef, FormEvent } from 'react';
import { Send, X, MessageSquare, User, Clock, Check, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import type { InterviewMessage, Profile } from '../types';

interface ChatDrawerProps {
  bookingId: string;
  recipient: Profile;
  isOpen: boolean;
  onClose: () => void;
  topic?: string | null;
}

export default function ChatDrawer({
  bookingId,
  recipient,
  isOpen,
  onClose,
  topic,
}: ChatDrawerProps) {
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages and subscribe to real-time updates
  useEffect(() => {
    if (!isOpen || !bookingId || !profile?.id) return;

    let isMounted = true;

    const fetchMessages = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('interview_messages')
        .select('*, sender:sender_id(*)')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (isMounted && data) {
        setMessages(data as unknown as InterviewMessage[]);
        setLoading(false);
        setTimeout(scrollToBottom, 100);

        // Mark unread messages as read
        await supabase
          .from('interview_messages')
          .update({ is_read: true })
          .eq('booking_id', bookingId)
          .eq('receiver_id', profile.id)
          .eq('is_read', false);
      }
    };

    fetchMessages();

    // Subscribe to Realtime messages on this booking
    const channel = supabase
      .channel(`chat-booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interview_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as InterviewMessage;
          if (newMsg.sender_id === profile.id) return; // already added optimistically

          // Fetch sender details
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMsg.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, sender: (senderProfile as Profile) || undefined },
          ]);
          setTimeout(scrollToBottom, 50);

          // Mark as read
          if (newMsg.receiver_id === profile.id) {
            await supabase
              .from('interview_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isOpen, bookingId, profile?.id]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.id || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: InterviewMessage = {
      id: tempId,
      booking_id: bookingId,
      sender_id: profile.id,
      receiver_id: recipient.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: profile,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 50);

    try {
      const { data, error } = await supabase
        .from('interview_messages')
        .insert({
          booking_id: bookingId,
          sender_id: profile.id,
          receiver_id: recipient.id,
          content,
          is_read: false,
        })
        .select('*')
        .single();

      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...(data as InterviewMessage), sender: profile } : m))
        );

        // Send a notification to recipient
        await supabase.from('notifications').insert({
          user_id: recipient.id,
          title: `💬 New message from ${profile.full_name}`,
          message: content.length > 60 ? `${content.slice(0, 57)}...` : content,
          type: 'chat',
          link: `/room/${bookingId}`,
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md h-full bg-white text-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slideLeft">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden">
                {recipient.avatar_url ? (
                  <img
                    src={recipient.avatar_url}
                    alt={recipient.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  recipient.full_name.charAt(0)
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 leading-tight">
                {recipient.full_name}
              </h3>
              <p className="text-xs text-slate-500">
                {recipient.role === 'mentor' ? 'Interviewer' : 'Student'}
                {topic ? ` • ${topic}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Close Chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-1">
                <MessageSquare size={22} />
              </div>
              <div className="font-semibold text-slate-700 text-sm">Direct Interview Chat</div>
              <p className="text-xs text-slate-500 max-w-xs">
                Discuss interview questions, code snippets, or schedule coordination directly with {recipient.full_name}.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === profile?.id;
              const timeStr = new Date(m.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-sm break-words ${
                      isMine
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    {m.content}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1">
                    <span>{timeStr}</span>
                    {isMine && (
                      m.is_read ? (
                        <CheckCheck size={12} className="text-brand-500" />
                      ) : (
                        <Check size={12} className="text-slate-400" />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${recipient.full_name}...`}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white disabled:opacity-40 transition-all shadow-md shadow-brand-500/20"
              title="Send Message"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
