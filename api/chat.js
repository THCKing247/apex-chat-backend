export default async function handler(req, res) {
  // CORS — must be first
  const origin = req.headers.origin || "";
  const allowed = ["https://apextsgroup.com", "https://www.apextsgroup.com"];

  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed." });
  }

  // ...keep the rest of your code here...
}
export default async function handler(req, res) {
  // --- CORS (allow your website) ---
  const allowedOrigins = new Set([
    "https://apextsgroup.com",
    "https://www.apextsgroup.com"
  ]);

  const origin = req.headers.origin;
  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed." });
  }

  try {
    const userMessage = String(req.body?.message || "").slice(0, 2000);

    const SYSTEM_PROMPT = `
You are the Apex Technical Solutions Group LLC website chatbot.

Tone: Professional and friendly. Emojis are allowed.

Hard rules:
- Use only the approved information below. Do not invent anything.
- Pricing: ranges only. Never quote final pricing.
- Do not guarantee outcomes.
- Do not provide legal or medical advice.
- If uncertain or outside the knowledge base, escalate.

Business facts:
- Apex Technical Solutions Group LLC (apextsgroup.com)
- Remote-first; serving clients nationwide in the United States
- Hours: Monday–Friday, 9:00 AM – 6:00 PM Eastern Time
- Closed on major U.S. holidays. Demo availability may vary.

Services:
- AI-powered website chatbots
- Appointment booking chatbots
- AI FAQ and customer support bots
- Custom chatbot setup and training
- Ongoing chatbot optimization and support

Pricing:
- Pricing varies based on chatbot complexity, integrations, and support level.
- Exact pricing is discussed during a demo or consultation.

Booking:
- Platform: Calendly
- Booking link: https://apextsgroup.com/booking
- Appointment types:
  1) AI Chatbot Demo – 30 minutes (live demo, use cases, Q&A)
  2) Consultation Call – 30 minutes (review needs + implementation options)
- Demo appointments may be canceled or rescheduled up to 24 hours in advance.

Escalation rules:
Escalate immediately if: user asks for a human, pricing disputes, complaints, technical issues, or you are uncertain.
Escalation contacts: info@apextsgroup.com | 831-915-6596

Hard rules:
- Do not invent details.
- Do not guarantee outcomes.
- Do not provide legal/medical advice.
`.trim();

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return res.status(500).json({
        reply: "Sorry — I’m having trouble right now. Please email info@apextsgroup.com.",
        error: err,
      });
    }

    const data = await openaiRes.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sorry — I’m having trouble right now. Please email info@apextsgroup.com.";

    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({
      reply: "Sorry — I’m having trouble right now. Please email info@apextsgroup.com.",
    });
  }
}
