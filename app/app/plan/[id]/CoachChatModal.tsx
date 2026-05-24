'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CoachChatMessage } from '@/lib/store';

const modalStyles = `
.coach-chat-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.65);
  -webkit-tap-highlight-color: transparent;
}
.coach-chat-backdrop-dismiss {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
  cursor: pointer;
}
.coach-chat-panel {
  position: relative;
  z-index: 1;
  background: #141414;
  border: 1px solid #262626;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: min(85vh, 640px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  touch-action: manipulation;
}
.coach-chat-header {
  padding: 1rem 1rem 1rem 1.25rem;
  border-bottom: 1px solid #262626;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}
.coach-chat-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin: -6px -8px -6px 0;
  padding: 0;
  background: #262626;
  border: 1px solid #404040;
  border-radius: 10px;
  color: #f5f5f5;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.coach-chat-close:active {
  background: #404040;
}
.coach-chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}
.coach-chat-form {
  flex-shrink: 0;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid #262626;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #141414;
}
.coach-chat-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.coach-chat-input {
  flex: 1;
  resize: none;
  padding: 12px;
  background: #0a0a0a;
  border: 1px solid #404040;
  border-radius: 10px;
  color: #f5f5f5;
  font-size: 16px;
  font-family: inherit;
  line-height: 1.4;
  min-height: 44px;
  max-height: 120px;
}
.coach-chat-send {
  min-width: 72px;
  min-height: 44px;
  padding: 12px 16px;
  background: #e85d04;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  touch-action: manipulation;
  flex-shrink: 0;
}
.coach-chat-send:disabled {
  background: #404040;
  cursor: not-allowed;
}
.coach-chat-bubble {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.coach-chat-bubble-user {
  align-self: flex-end;
  background: #e85d04;
  color: #fff;
}
.coach-chat-bubble-assistant {
  align-self: flex-start;
  background: #262626;
  color: #e5e5e5;
}
@media (max-width: 640px) {
  .coach-chat-backdrop {
    padding: 0;
    align-items: stretch;
  }
  .coach-chat-panel {
    max-width: none;
    max-height: none;
    height: 100dvh;
    height: 100svh;
    border-radius: 0;
    border: none;
  }
  .coach-chat-header {
    padding-top: calc(0.75rem + env(safe-area-inset-top, 0px));
  }
}
`;

export default function CoachChatModal({
  planId,
  initialHistory = [],
  onClose,
}: {
  planId: string;
  initialHistory?: CoachChatMessage[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<CoachChatMessage[]>(initialHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)');
    if (mq.matches) inputRef.current?.focus();
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

  const handleClose = () => {
    onClose();
  };

  if (!mounted) return null;

  const modal = (
    <>
      <style dangerouslySetInnerHTML={{ __html: modalStyles }} />
      <div className="coach-chat-backdrop" role="dialog" aria-modal="true" aria-labelledby="coach-chat-title">
        <button
          type="button"
          className="coach-chat-backdrop-dismiss"
          aria-label="Close chat"
          onClick={handleClose}
        />
        <div className="coach-chat-panel">
          <header className="coach-chat-header">
            <div style={{ minWidth: 0, flex: 1 }}>
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
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#737373', lineHeight: 1.4 }}>
                Ask about progress, upcoming weeks, or training adjustments.
              </p>
            </div>
            <button
              type="button"
              className="coach-chat-close"
              aria-label="Close"
              onClick={handleClose}
            >
              ×
            </button>
          </header>

          <div ref={scrollRef} className="coach-chat-messages">
            {messages.length === 0 && !loading && (
              <p style={{ color: '#737373', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                Try: &ldquo;How am I tracking this week?&rdquo; or &ldquo;Should I move my long run?&rdquo;
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.at}-${i}`}
                className={`coach-chat-bubble ${
                  m.role === 'user' ? 'coach-chat-bubble-user' : 'coach-chat-bubble-assistant'
                }`}
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

          <form className="coach-chat-form" onSubmit={onSubmit}>
            {error && <p style={{ margin: 0, color: '#e85d04', fontSize: '0.85rem' }}>{error}</p>}
            <div className="coach-chat-input-row">
              <textarea
                ref={inputRef}
                className="coach-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message your coach…"
                rows={2}
                disabled={loading}
                enterKeyHint="send"
                autoComplete="off"
              />
              <button
                type="submit"
                className="coach-chat-send"
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
