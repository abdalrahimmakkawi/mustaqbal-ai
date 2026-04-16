import { VercelRequest, VercelResponse } from '@vercel/node';

function buildSystemPrompt(vibe: string, language: string): string {
  const vibeMap: Record<string, string> = {
    football: language === 'ar'
      ? 'استخدم أمثلة من كرة القدم والدوريات العالمية لشرح كل مفهوم'
      : 'Use football, matches, and player examples to explain every concept',
    gaming: language === 'ar'
      ? 'استخدم أمثلة من الألعاب الإلكترونية لشرح كل مفهوم'
      : 'Use video game mechanics and characters to explain every concept',
    action: language === 'ar'
      ? 'استخدم أمثلة من أفلام الأكشن لشرح كل مفهوم'
      : 'Use action movies and heroes to explain every concept',
    street: language === 'ar'
      ? 'تحدث بأسلوب الشارع والثقافة الشبابية السودانية'
      : 'Use street culture and youth slang to explain concepts',
  };
  const vibeInstruction = vibeMap[vibe] || vibeMap.football;
  if (language === 'ar') {
    return 'أنت "يا أخويا AI"، مدرس سوداني شاطر لطلاب الثانوي. ' + vibeInstruction + '. تحدث بالعربية السودانية. اشرح بإيجاز وبشكل مسلٍّ. استخدم إيموجي. انهِ بـ"فاهم ولا نكمل؟"';
  }
  return 'You are "Ya Akhoya AI", a cool Sudanese tutor for high school boys. ' + vibeInstruction + '. Be brief, fun, and clear. End with "Get it? Want more?"';
}

export const config = { maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject, topic, vibe = 'football', language = 'ar', history = [] } = req.body;
  if (!topic || !subject) return res.status(400).json({ error: 'subject and topic required' });

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = buildSystemPrompt(vibe, language);
  const userMessage = language === 'ar'
    ? 'اشرح "' + topic + '" في مادة "' + subject + '" باختصار' 
    : 'Explain "' + topic + '" in "' + subject + '" briefly';

  // ── NVIDIA with streaming ──────────────────────────────────────
  if (nvidiaKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': nvidiaKey.startsWith('Bearer ') ? nvidiaKey : 'Bearer ' + nvidiaKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          max_tokens: 350,
          temperature: 0.7,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map((m: any) => ({
              role: m.role === 'model' ? 'assistant' : 'user',
              content: m.text,
            })),
            { role: 'user', content: userMessage },
          ],
        }),
      });

      clearTimeout(timeout);

      if (nvRes.ok && nvRes.body) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');

        const reader = nvRes.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const jsonStr = line.replace('data: ', '').trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullContent += delta;
                res.write('data: ' + JSON.stringify({ delta }) + '\n\n');
              }
            } catch {}
          }
        }
        res.write('data: ' + JSON.stringify({ done: true, content: fullContent }) + '\n\n');
        return res.end();
      }
    } catch (err: any) {
      console.error('NVIDIA failed:', err.name === 'AbortError' ? 'timeout' : err.message);
    }
  }

  // ── Gemini fallback (non-streaming, fast enough) ───────────────
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const ai = new GoogleGenerativeAI(geminiKey);
      const model = ai.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: 350, temperature: 0.7 },
      });
      const result = await model.generateContent({
        contents: [
          ...history.map((m: any) => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMessage }] },
        ],
      });
      const content = result.response.text();
      if (content) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.write('data: ' + JSON.stringify({ delta: content }) + '\n\n');
        res.write('data: ' + JSON.stringify({ done: true, content }) + '\n\n');
        return res.end();
      }
    } catch (err: any) {
      console.error('Gemini failed:', err.message);
      return res.status(500).json({ error: 'Both APIs failed' });
    }
  }

  return res.status(500).json({ error: 'No API keys configured' });
}
