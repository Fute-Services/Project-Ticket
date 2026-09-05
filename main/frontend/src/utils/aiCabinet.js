// Backs the Founder dashboard's "AI Agent Command Room" (FounderAiAdvisorView).
// The actual Gemini call (system prompt, persona design, response parsing)
// now lives server-side (controllers/aiCabinetController.js) — this used to
// call generativelanguage.googleapis.com directly from the browser with a
// key the founder typed into Settings and the app kept in localStorage,
// readable by any XSS on the page and logged nowhere. This is now a thin
// call to our own backend, which holds the key and logs every request.
import { askAiCabinet } from './api';

/**
 * Asks the AI Cabinet a question. Throws with a message safe to surface in a
 * toast on any failure (network, upstream Gemini error, or "not configured").
 */
export async function callGeminiCabinet({ model, query, context }) {
  try {
    const { data } = await askAiCabinet({ query, context, model });
    return data.messages;
  } catch (err) {
    throw new Error(err.response?.data?.error || err.message || 'Could not reach the AI Cabinet.');
  }
}
