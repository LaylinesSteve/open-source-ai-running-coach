import { NextResponse } from 'next/server';
import { hasFormAccess } from '@/lib/auth';
import { chatAboutForm } from '@/lib/form-ai';
import { daysAgo } from '@/lib/garmin';
import { getFormChat, getFormStore, setFormChat } from '@/lib/store';

export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 2000;
const MAX_MESSAGES_STORED = 40;
const MAX_MESSAGES_SENT = 20;

export async function POST(request: Request) {
  if (!(await hasFormAccess())) {
    return NextResponse.json({ error: 'Enter your passkey to continue.' }, { status: 401 });
  }
  const { message } = (await request.json().catch(() => ({}))) as { message?: unknown };
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return NextResponse.json({ error: 'Type a question first.' }, { status: 400 });
  if (text.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: 'That message is too long.' }, { status: 400 });
  }

  try {
    const [{ runs }, history] = await Promise.all([getFormStore(), getFormChat()]);
    if (!runs.some((run) => run.runningMinutes > 0)) {
      return NextResponse.json({ error: 'Analyze your runs first.' }, { status: 400 });
    }
    const reply = await chatAboutForm(runs, history.slice(-MAX_MESSAGES_SENT), text, daysAgo(0));
    const at = new Date().toISOString();
    const messages = [
      ...history,
      { role: 'user' as const, content: text, at },
      { role: 'assistant' as const, content: reply, at },
    ].slice(-MAX_MESSAGES_STORED);
    await setFormChat(messages);
    return NextResponse.json({ messages });
  } catch (e) {
    console.error('Form chat failed:', e instanceof Error ? e.message : 'unknown error');
    return NextResponse.json({ error: 'Could not get an answer. Try again.' }, { status: 502 });
  }
}

export async function DELETE() {
  if (!(await hasFormAccess())) {
    return NextResponse.json({ error: 'Enter your passkey to continue.' }, { status: 401 });
  }
  await setFormChat([]);
  return NextResponse.json({ messages: [] });
}
