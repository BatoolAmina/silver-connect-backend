const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

router.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many assistant requests. Please try again later.' },
}));

router.post('/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ message: 'The AI assistant is not configured yet.' });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 8) {
        return res.status(400).json({ message: 'Send between 1 and 8 chat messages.' });
    }

    const conversation = [];
    for (const message of messages) {
        if (!message || !['user', 'model'].includes(message.role) || typeof message.content !== 'string') {
            return res.status(400).json({ message: 'The chat history is invalid.' });
        }

        const content = message.content.trim();
        if (!content || content.length > 1200) {
            return res.status(400).json({ message: 'Each message must contain 1 to 1200 characters.' });
        }

        conversation.push({
            role: message.role,
            parts: [{ text: content }],
        });
    }

    if (conversation[conversation.length - 1].role !== 'user') {
        return res.status(400).json({ message: 'The latest chat message must be from the user.' });
    }
    if (conversation[0].role !== 'user') {
        return res.status(400).json({ message: 'The chat history must begin with a user message.' });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const requestBody = JSON.stringify({
                systemInstruction: {
                    parts: [{
                        text: `You are Silver Connect's friendly service assistant. Help users understand the platform, care services, helper profiles, and booking process. Be concise, kind, and clear.

Use only this service catalog when describing Silver Connect offerings. Do not invent other service names, features, prices, or availability:
- Assisted Living: daily support with grooming, mobility, and personal hygiene.
- Travel Escorts: accompaniment to appointments, temple visits, and social gatherings.
- 24/7 SOS Response: one-tap SOS, family alerts, and local outreach.
- Wellness Checks: routine vitals and medication-schedule monitoring by vetted companions.
- Cognitive Care: social engagement and memory activities for people needing cognitive support.
- Post-Surg Support: short-term recovery assistance after hospital discharge.
- Nutritional Support: meal preparation and feeding assistance.
- Physical Therapy: support with exercises prescribed by a doctor.
- Social Companion: conversation, reading, hobbies, and companionship.

If asked about details not listed here, say the website does not specify them and direct the user to the Contact page. Never diagnose, prescribe, or provide medical advice. If someone describes a possible emergency or urgent symptoms, tell them to contact local emergency services or a qualified healthcare professional immediately. Do not claim to book a service, verify a helper, or access private account data. For questions outside Silver Connect, politely redirect to the platform or support team.`,
                    }],
                },
                contents: conversation,
                generationConfig: {
                    maxOutputTokens: 400,
                    temperature: 0.4,
                },
            });
        let response;
        let data;

        for (let attempt = 0; attempt < 2; attempt += 1) {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                signal: controller.signal,
                body: requestBody,
            });
            data = await response.json();

            if ((response.status !== 429 && response.status !== 503) || attempt === 1) break;
            await new Promise((resolve) => setTimeout(resolve, 600));
        }

        if (!response.ok) {
            console.error('Gemini assistant request failed:', response.status, data.error?.message || 'Unknown provider error');
            if (response.status === 429 || response.status === 503) {
                return res.status(503).json({ message: 'The AI service is busy right now. Please try again shortly.' });
            }
            return res.status(502).json({ message: 'The assistant could not respond right now. Please try again.' });
        }

        const answer = data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || '')
            .join('')
            .trim();

        if (!answer) {
            return res.status(502).json({ message: 'The assistant returned an empty response. Please try again.' });
        }

        return res.json({ reply: answer });
    } catch (error) {
        const status = error.name === 'AbortError' ? 504 : 502;
        return res.status(status).json({ message: 'The assistant is temporarily unavailable. Please try again.' });
    } finally {
        clearTimeout(timeout);
    }
});

module.exports = router;