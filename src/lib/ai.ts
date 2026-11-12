// Optional AI tutor. The app works fully without it. It only ever receives the lesson or ayah context shown
// on screen, and every reply is displayed with an "AI-generated" flag. It is never used to produce Quranic
// text, answer keys, or stored lesson content.
import { settings } from './db';

export const aiEnabled = () => !!settings().aiKey;
const SYSTEM = `You are a tutor for Classical and Quranic Arabic helping an Urdu-speaking adult learner.
Rules:
- Answer only from the context provided and from well-established Arabic grammar. If you are unsure, say so plainly.
- Never write out Quranic text that is not already in the context. Refer to verses by number instead.
- Keep linguistic explanation (words, roots, grammar) separate from tafsir. Do not offer your own interpretation of what a verse means theologically; point the learner to a recognised tafsir for that.
- Where scholars analyse a construction in more than one way, say that it is disputed.
- Use Urdu grammatical terms as a bridge where they help, and note where Urdu and Arabic differ.
- Be concise: under 200 words unless asked for more.`;
export async function askTutor(context: string, question: string): Promise<string> {
  const s = settings();
  if (!s.aiKey) throw new Error('No API key set. Add one in Settings to use the tutor.');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': s.aiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: s.aiModel, max_tokens: 900, system: SYSTEM, messages: [{ role: 'user', content: `CONTEXT (verified app content):\n${context}\n\nQUESTION:\n${question}` }] }),
  });
  if (!r.ok) throw new Error(r.status === 401 ? 'The API key was rejected.' : r.status === 404 ? `Model "${s.aiModel}" was not found. Change it in Settings.` : `The AI service returned an error (${r.status}).`);
  const j = await r.json();
  return (j.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
}
