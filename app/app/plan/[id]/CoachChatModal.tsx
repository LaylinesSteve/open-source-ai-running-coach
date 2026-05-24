'use client';

import { useEffect, useRef, useState } from 'react';
import type { CoachChatMessage } from '@/lib/store';

export default function CoachChatModal({
  planId,
  initialHistory = [],
  onClose,
}: {
  planId: string;
  initialHistory?: CoachChatMessage[];
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<CoachChatMessage[]>(initialHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError('');
    setInput('');
    const pendingAt = new Date().toISOString();
    setMessages((prev) => [...prev, { role: 'user', content: text, at: pendingAt }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/plan/${planId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not reach your coach');
        setLoading(false);
        return;
      }
      if (Array.isArray(data.history)) {
        setMessages(data.history);
      } else if (typeof data.reply === 'string') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply, at: new Date().toISOString() },
        ]);
      }
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-chat-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.65)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#141414',
          border: '1px solid #262626',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          maxHeight: 'min(85vh, 640px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #262626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <h2
              id="coach-chat-title"
              style={{
                fontFamily: '"Bebas Neue", sans-serif',
                fontSize: '1.35rem',
                letterSpacing: '0.02em',
                color: '#f5f5f5',
                margin: 0,
              }}
            >
              Coach chat
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#737373' }}>
              Ask about your progress, upcoming weeks, or how to adjust training.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a3a3a3',
              fontSize: '1.5rem',
              lineHeight: 1,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minHeight: 200,
          }}
        >
          {messages.length === 0 && !loading && (
            <p style={{ color: '#737373', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
              Try: &ldquo;How am I tracking against this week&apos;s mileage?&rdquo; or &ldquo;Should I
              move my long run this weekend?&rdquo;
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={`${m.at}-${i}`}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: 12,
                background: m.role === 'user' ? '#e85d04' : '#262626',
                color: m.role === 'user' ? '#fff' : '#e5e5e5',
                fontSize: '0.9rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: '#737373', fontSize: '0.85rem' }}>
              Coach is thinking…
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid #262626',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {error && <p style={{ margin: 0, color: '#e85d04', fontSize: '0.85rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message your coach…"
              rows={2}
              disabled={loading}
              style={{
                flex: 1,
                resize: 'none',
                padding: '10px 12px',
                background: '#0a0a0a',
                border: '1px solid #404040',
                borderRadius: 8,
                color: '#f5f5f5',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '12px 18px',
                background: loading || !input.trim() ? '#404040' : '#e85d04',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
