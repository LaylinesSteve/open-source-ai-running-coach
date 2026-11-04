'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { FormChatMessage } from '@/lib/form-trends';

const MAX_MESSAGE_CHARS = 2000;

export default function FormChat({ initialMessages }: { initialMessages: FormChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, asking]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || asking) return;
    setAsking(text);
    setDraft('');
    setError('');
    try {
      const res = await fetch('/api/form/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages);
      } else {
        setError(data.error ?? 'Could not get an answer. Try again.');
        setDraft(text);
      }
    } catch {
      setError('Could not get an answer. Try again.');
      setDraft(text);
    }
    setAsking(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  async function clear() {
    setError('');
    const res = await fetch('/api/form/chat', { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setMessages([]);
    else setError('Could not clear the chat. Try again.');
  }

  const shown = asking
    ? [...messages, { role: 'user' as const, content: asking, at: 'pending' }]
    : messages;

  return (
    <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: 8, padding: '1rem' }}>
      {shown.length > 0 && (
        <div
          ref={log}
          role="log"
          aria-label="Chat about your form"
          tabIndex={0}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxHeight: 440,
            overflowY: 'auto',
            marginBottom: '1rem',
          }}
        >
          {shown.map((message, index) => (
            <div
              key={`${message.at}-${index}`}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: message.role === 'user' ? '#262626' : 'transparent',
                borderRadius: 8,
                padding: message.role === 'user' ? '0.5rem 0.75rem' : 0,
                color: message.role === 'user' ? '#f5f5f5' : '#d4d4d4',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {message.content}
            </div>
          ))}
          {asking && <p style={{ color: '#a3a3a3', margin: 0 }}>Thinking…</p>}
        </div>
      )}

      <form onSubmit={send} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <textarea
          aria-label="Your question"
          rows={2}
          maxLength={MAX_MESSAGE_CHARS}
          value={draft}
          placeholder="How did my form hold up on my longest run?"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          style={{
            flex: 1,
            minWidth: 0,
            resize: 'vertical',
            padding: '0.6rem 0.75rem',
            borderRadius: 8,
            border: '1px solid #262626',
            background: '#0a0a0a',
            color: '#f5f5f5',
            fontSize: '1rem',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={!!asking || !draft.trim()}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: 8,
            border: 'none',
            background: '#f5f5f5',
            color: '#0a0a0a',
            fontWeight: 600,
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            cursor: asking ? 'default' : 'pointer',
            opacity: asking || !draft.trim() ? 0.6 : 1,
          }}
        >
          Send
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: '#f87171', fontSize: '0.9rem', margin: '0.75rem 0 0' }}>
          {error}
        </p>
      )}
      {messages.length > 0 && !asking && (
        <button
          type="button"
          onClick={clear}
          style={{
            marginTop: '0.75rem',
            padding: 0,
            border: 'none',
            background: 'none',
            color: '#a3a3a3',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Clear chat
        </button>
      )}
    </div>
  );
}
