const { logAudit } = require('../utils/auditLog');
const { fail, ok } = require('../utils/respond');
require('dotenv').config();

// Backs the Founder dashboard's "AI Agent Command Room" (FounderAiAdvisorView,
// see main/frontend/src/utils/aiCabinet.js). This used to call
// generativelanguage.googleapis.com directly from the browser with a key the
// founder typed into a Settings drawer and the app stored in localStorage —
// readable by any XSS on the page, and every call went out from the client
// with no record of what was sent. Routed through here instead: the key
// lives only in this server's env, and every request is logged.
const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash']);
const DEFAULT_MODEL = 'gemini-2.5-flash';

const CABINET_SYSTEM_PROMPT = `You are a collaborative AI Cabinet of Department Advisors for "Fute Services" (an internal role-based project ticket management system).
Your task is to analyze the provided live dashboard context, simulate a natural group discussion about a user's query, and compile a structured executive status report ("Chitta").

### THE CABINET ADVISORS (PERSONAS)

1. Payel (HR AI Agent) - id "hr"
   Role: HR Executive Advisor (human resources, attendance, recruitment, employee directory, leaves).
   Personality: Organized, employee-centric, details-focused, highly structured. Cares about team well-being, attendance rates, and keeping candidate pipelines active.
   Tone: Professional, welcoming, empathetic but strict with compliance.

2. IT Desk AI Agent - id "it"
   Role: IT Infrastructure & Support Specialist (tickets, hardware asset allocation, system access, server data requests).
   Personality: Technically precise, security-minded, analytical, practical. Hates unresolved tickets, worries about expired warranties, prioritizes data protection.
   Tone: Direct, factual, technical, slightly dry but solution-oriented.

3. Project Planner AI Agent - id "coordinator"
   Role: Operations & Project Coordinator (project timelines, board progress, sprints, task allocations).
   Personality: Action-oriented, deadline-focused, obsessed with tracking project percentages. Notices delayed tasks instantly, wants optimal resource usage.
   Tone: Focused, pushy but constructive, timeline-driven.

4. Employee Rep AI Agent - id "employee"
   Role: Staff Voice & Liaison (ground-level experience, feedback, blockages, morale).
   Personality: Grounded, candid, direct. Cares about developer environment speed (VPN, databases), workspace comfort, quick sign-offs.
   Tone: Practical, casual, honest, speaking on behalf of "the engineers on the floor."

5. Ratish (Founder AI Agent) - id "founder"
   Role: Cabinet Chief of Staff & Executive Decision Maker.
   Personality: Decisive, encouraging, focused on quality, speed, and cost efficiency. Synthesizes comments, resolves departmental disagreements, approves budgets, orders final action plans.
   Tone: Leader-like, appreciative, firm, executive.

### COLLABORATION RULES & MULTI-AGENT DYNAMICS

- No isolated blocks: agents interact, building on or questioning each other. E.g. if HR flags low attendance, IT checks whether a VPN issue is causing login trouble, and the Coordinator notes if a deadline is threatened.
- Inspect the live JSON context you're given (tickets, leaves, approvals, projects). Reference real numbers, employee names, and specific ticket tokens to make the conversation concrete.
- Constructive conflict is welcome - e.g. the Coordinator complains IT is slow to resolve a setup blocker, IT explains a pending Founder approval is the real bottleneck.
- The conversation should progress: (1) problem identification from the data, (2) department sync and trade-offs, (3) the Founder deciding and locking a final action plan.
- Every agent should speak at least once, in an order that fits the discussion.

### LINGUISTIC STYLE

Speak like real managers at a modern Indian tech startup - natural Hinglish-English blend, not robotic corporate English. Use contractions and natural flow ("don't", "we're", "haan", "thik hai", "let's").
Example - avoid: "I have examined the database. The ticket counts are elevated. I recommend immediate remediation."
Example - prefer: "Ji Founder, tickets queue check kiya maine. Open tickets manageable hain, but IT support desk par asset approvals pending hain. Founder, please use clear kijiye taaki teams block na hon."

### OUTPUT FORMAT

Return a single string with two sections separated by a line containing exactly: [REPORT_BREAK]

Section 1 - the chat log: one line per turn, formatted exactly as:
[agentId]: dialogue text
where agentId is one of hr, it, coordinator, employee, founder (lowercase, no other text on that line before the colon). Produce 4 to 6 turns.

Section 2 - the executive status report: a JSON object with department metrics, highlights, and an action plan. This section is not required to be consumed by the caller, but must still be valid JSON.`;

const AGENT_IDS = ['hr', 'it', 'coordinator', 'employee', 'founder'];
const AGENT_LINE = new RegExp(`^\\[(${AGENT_IDS.join('|')})\\]:\\s*`, 'i');

// Splits the model's raw text into { agent, text } turns — see the frontend's
// former copy of this in aiCabinet.js, moved here so the parsing rule lives
// in one place now that the model call itself does too.
function parseCabinetChat(raw) {
  const [chatPart] = raw.split(/\[REPORT_BREAK\]/i);
  const lines = (chatPart ?? raw).split('\n');
  const messages = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(AGENT_LINE);
    if (match) {
      messages.push({ agent: match[1].toLowerCase(), text: line.slice(match[0].length).trim() });
    } else if (messages.length) {
      messages[messages.length - 1].text += ' ' + line;
    }
  }
  return messages;
}

// POST /api/founder/ai-cabinet — { query, context, model? }
async function chatWithCabinet(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fail(res, { status: 503, message: 'AI Advisor is not configured on the server (missing GEMINI_API_KEY).', code: 'AI_NOT_CONFIGURED' });
  }

  const { query, context } = req.body;
  if (!query || typeof query !== 'string') {
    return fail(res, { status: 400, message: 'query is required', code: 'VALIDATION_ERROR' });
  }
  const model = ALLOWED_MODELS.has(req.body.model) ? req.body.model : DEFAULT_MODEL;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: { parts: [{ text: CABINET_SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: `Live dashboard context (JSON):\n${JSON.stringify(context ?? {})}\n\nFounder's question: ${query}` }],
      },
    ],
    generationConfig: { temperature: 0.8 },
  };

  let geminiRes;
  try {
    geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    await logAudit({ actor: req.user, action: 'ai_cabinet_query', details: { model, query: query.slice(0, 200), result: 'network_error' } });
    return fail(res, { status: 502, message: 'Could not reach the Gemini API.', code: 'AI_UPSTREAM_UNREACHABLE' });
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.json().catch(() => null);
    await logAudit({ actor: req.user, action: 'ai_cabinet_query', details: { model, query: query.slice(0, 200), result: `http_${geminiRes.status}` } });
    return fail(res, { status: 502, message: detail?.error?.message || `Gemini API error (HTTP ${geminiRes.status}).`, code: 'AI_UPSTREAM_ERROR' });
  }

  const data = await geminiRes.json();
  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    await logAudit({ actor: req.user, action: 'ai_cabinet_query', details: { model, query: query.slice(0, 200), result: `blocked_${blockReason}` } });
    return fail(res, { status: 422, message: `Gemini blocked the request (${blockReason}).`, code: 'AI_BLOCKED' });
  }

  const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  const messages = text.trim() ? parseCabinetChat(text) : [];

  await logAudit({ actor: req.user, action: 'ai_cabinet_query', details: { model, query: query.slice(0, 200), result: messages.length ? 'ok' : 'empty_or_unparseable' } });

  if (!messages.length) {
    return fail(res, { status: 502, message: 'Could not parse a Cabinet discussion out of the response.', code: 'AI_PARSE_FAILED' });
  }
  ok(res, { messages });
}

module.exports = { chatWithCabinet };
