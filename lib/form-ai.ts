import { formChatContext, formSummary, type FormChatMessage, type RunForm } from '@/lib/form-trends';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const REVIEW_INSTRUCTION = `You are an expert running form coach reviewing one athlete's data from a Garmin watch. Everything you know comes from the numbers provided.

Write a plain-text review with these four headings, each on its own line:
What changed
What held up
What to work on
How sure this is

Rules:
- Compare like with like. Form changes with pace, so lead with the same-pace tables and treat the all-running table as context.
- Quote the numbers behind each claim, with their dates or months.
- A small change can be noise. Don't call something a trend unless it holds across several months or is large.
- In "What to work on", give at most 3 specific, practical cues or drills, each tied to a number you quoted.
- Say plainly when data is thin or a metric is missing. These are sensor averages, not a video gait analysis, so don't diagnose causes you can't see.
- This is training guidance, not medical advice. If something could be an injury sign, such as a growing left-right imbalance, suggest getting it checked rather than explaining it.
- No markdown symbols. Keep it under 350 words.`;

type GeminiMessage = { role: 'user' | 'model'; parts: { text: string }[] };

async function askGemini(
  systemInstruction: string,
  contents: GeminiMessage[],
  temperature: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error (${res.status})`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

export function reviewForm(runs: RunForm[]): Promise<string> {
  return askGemini(
    REVIEW_INSTRUCTION,
    [{ role: 'user', parts: [{ text: formSummary(runs) }] }],
    0.3
  );
}

export function chatAboutForm(
  runs: RunForm[],
  history: FormChatMessage[],
  message: string,
  today: string
): Promise<string> {
  const systemInstruction = `You are an expert running form coach answering one athlete's questions about their own Garmin data. Today is ${today}.

Rules:
- Use only the numbers below. Never invent runs, dates or metrics. If the data can't answer the question, say so.
- Form changes with pace, so compare at the same pace where you can, and say when you can't.
- A small change can be noise. Don't call something a trend unless it holds across several weeks or is large.
- These are sensor averages per run, not second-by-second data or a video gait analysis, so don't diagnose causes you can't see.
- This is training guidance, not medical advice. If something could be an injury sign, suggest getting it checked rather than explaining it.
- Answer in plain text with no markdown symbols, usually in 2 to 4 short paragraphs.

=== ATHLETE DATA ===
${formChatContext(runs)}`;

  return askGemini(
    systemInstruction,
    [
      ...history.map((entry): GeminiMessage => ({
        role: entry.role === 'user' ? 'user' : 'model',
        parts: [{ text: entry.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ],
    0.4
  );
}
