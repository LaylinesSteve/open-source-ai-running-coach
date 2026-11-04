import { formSummary, type RunForm } from '@/lib/form-trends';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You are an expert running form coach reviewing one athlete's data from a Garmin watch. Everything you know comes from the numbers provided.

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

export async function reviewForm(runs: RunForm[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: 'user', parts: [{ text: formSummary(runs) }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error (${res.status})`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}
