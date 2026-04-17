import { VercelRequest, VercelResponse } from '@vercel/node';

function buildSystemPrompt(vibe: string, language: string): string {
  const vibeExamples: Record<string, Record<string, string>> = {
    football: {
      ar: 'Use football matches, players, and tactics as examples for every concept',
      en: 'Use football matches, players, and tactics as examples for every concept',
    },
    gaming: {
      ar: 'Use video games like Minecraft, Fortnite, and FIFA as examples for every concept',
      en: 'Use video games like Minecraft, Fortnite, and FIFA as examples for every concept',
    },
    action: {
      ar: 'Use action movies and superheroes as examples for every concept',
      en: 'Use action movies and superheroes as examples for every concept',
    },
    street: {
      ar: 'Use everyday Sudanese street culture and youth slang to explain concepts',
      en: 'Use everyday Sudanese street culture and youth slang to explain concepts',
    },
  };

  const vib = vibeExamples[vibe] || vibeExamples.football;
  const vibeInstruction = language === 'ar' ? vib.ar : vib.en;

  if (language === 'ar') {
    return 'You are "Ya Akhoya AI" ' + ' ' + ' ' + 'a smart, energetic Sudanese tutor for high school boys. You are an expert in ALL Sudanese high school subjects: Physics, Chemistry, Biology, Math, History, Geography, Arabic, English, Art, and more. ' + vibeInstruction + '. Be brief, clear, and fun. Use emoji sometimes. Always end with a follow-up like: "Get it? Want me to go deeper?" or "Any questions?"';
  }

  return 'You are "Ya Akhoya AI" ' + ' ' + ' ' + 'a smart, energetic Sudanese tutor for high school boys. You are an expert in ALL Sudanese high school subjects: Physics, Chemistry, Biology, Math, History, Geography, Arabic, English, Art, and more. ' + vibeInstruction + '. Be brief, clear, and fun. Use emoji sometimes. Always end with a follow-up like: "Get it? Want me to go deeper?" or "Any questions?"';
}

export const config = { maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    subject = 'General',
    topic = '',
    vibe = 'football',
    language = 'ar',
    history = [],
    message = '',
  } = req.body;

  // Accept either a free-form message OR subject+topic format
  const userMessage = message
    ? message
    : language === 'ar'
      ? 'Explain "' + topic + '" in the subject "' + subject + '"' 
      : 'Explain "' + topic + '" in the subject "' + subject + '"';

  if (!userMessage.trim()) {
    return res.status(400).json({ error: 'message or topic+subject required' });
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = buildSystemPrompt(vibe, language);

  // NVIDIA streaming (8s timeout)
  if (nvidiaKey) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);

      const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': nvidiaKey.startsWith('Bearer ') ? nvidiaKey : 'Bearer ' + nvidiaKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          max_tokens: 400,
          temperature: 0.75,
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

      clearTimeout(tid);

      if (nvRes.ok && nvRes.body) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');

        const reader = nvRes.body.getReader();
        const decoder = new TextDecoder();
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value, { stream: true })
            .split('\n')
            .filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const str = line.slice(6).trim();
            if (str === '[DONE]') continue;
            try {
              const delta = JSON.parse(str).choices?.[0]?.delta?.content || '';
              if (delta) {
                full += delta;
                res.write('data: ' + JSON.stringify({ delta }) + '\n\n');
              }
            } catch {}
          }
        }
        res.write('data: ' + JSON.stringify({ done: true, content: full }) + '\n\n');
        return res.end();
      }
    } catch (e: any) {
      console.error('NVIDIA:', e.name === 'AbortError' ? 'timeout' : e.message);
    }
  }

  // Gemini fallback
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: 400, temperature: 0.75 },
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
    } catch (e: any) {
      console.error('Gemini:', e.message);
      return res.status(500).json({ error: 'Both APIs failed: ' + e.message });
    }
  }

  return res.status(500).json({ error: 'No API keys configured' });
}
