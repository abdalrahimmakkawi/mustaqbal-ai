import { VercelRequest, VercelResponse } from '@vercel/node';

function buildSystemPrompt(vibe: string, language: string): string {
  const vibeMap: Record<string, string> = {
    football: language === 'ar'
      ? 'Use football, Al-Hilal, Merrikh, and player examples to explain concepts'
      : 'Use football, matches, and player examples to explain every concept',
    gaming: language === 'ar'
      ? 'Use gaming, XP, boss fights, and level-up examples to explain concepts'
      : 'Use video game mechanics, characters, and levels to explain every concept',
    action: language === 'ar'
      ? 'Use action movies, fight scenes, and hero examples to explain concepts'
      : 'Use action movies, fight scenes, and heroes to explain every concept',
    street: language === 'ar'
      ? 'Use street wisdom, casual talk, and youth slang to explain concepts'
      : 'Use street culture, casual talk, and youth slang to explain concepts',
  };

  const vibeInstruction = vibeMap[vibe] || vibeMap.football;

  const systemInstruction = '
  You are "Ya Akhoya AI", a brilliant, warm, and high-energy Sudanese tutor for high school boys.
  You aren't just a teacher; you are their "Big Brother" (Ya Akhoya/Ya Farda) who wants to see them succeed.

  STRICT LANGUAGE RULES:
  Current Language Selection: ' + (language === 'ar' ? 'Arabic (Sudanese dialect)' : 'English') + '
  
  - If current language is Arabic: You MUST write ONLY in Arabic script (e.g., "Peace be upon you"). DO NOT use English letters to write Arabic words. Transliteration is strictly forbidden. Use Arabic for the entire explanation.
  - If current language is English: You MUST write ONLY in English. DO NOT mix Arabic script or transliterated Arabic into the response.
  - Consistency is key: No "Salamu alaykum" in English letters. Use the actual script of the chosen language.

  CONVERSATIONAL STYLE:
  - Start with a warm greeting in the target script.
  - Don't just lecture. Explain the concept, then ask a follow-up question to check understanding.
  - In Arabic mode, use warm Sudanese expressions in Arabic script.
  - Keep it snappy, engaging, and celebrate correctness!

  ANALOGY RULES:
  - Use football, gaming, action, or street wisdom to explain concepts based on the ' + vibe + ' vibe.
  - Be the motivation they need. If they seem stuck, encourage them like a coach during half-time.

  GOAL: Build a connection. Make the student feel like they are talking to a smart friend who truly cares.
  
  RESPONSE SPEED: Be quick and concise. Aim for 2-3 sentences maximum per response.
  ';

  return systemInstruction;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject, topic, vibe = 'football', language = 'ar', history = [] } = req.body;

  if (!topic || !subject) {
    return res.status(400).json({ error: 'subject and topic are required' });
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = buildSystemPrompt(vibe, language);
  const userMessage = language === 'ar'
    ? 'Explain "' + topic + '" in "' + subject + '"'
    : 'Explain "' + topic + '" in "' + subject + '"';

  // --- Try NVIDIA first (6s timeout for faster response) ---
  if (nvidiaKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': nvidiaKey.startsWith('Bearer ') ? nvidiaKey : 'Bearer ' + nvidiaKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          max_tokens: 300, // Reduced for faster response
          temperature: 0.5, // Lower for more consistent responses
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

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return res.json({ content, source: 'nvidia' });
      }
    } catch (err: any) {
      console.error('NVIDIA failed:', err.name === 'AbortError' ? 'timeout' : err.message);
    }
  }

  // --- Fallback: Gemini ---
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const ai = new GoogleGenerativeAI(geminiKey);
      const model = ai.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent({
        contents: [
          ...history.map((m: any) => ({
            role: m.role,
            parts: [{ text: m.text }],
          })),
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        generationConfig: {
          maxOutputTokens: 300, // Reduced for faster response
          temperature: 0.5, // Lower for more consistent responses
        }
      });

      const content = result.response.text();
      if (content) return res.json({ content, source: 'gemini' });
    } catch (err: any) {
      console.error('Gemini failed:', err.message);
      return res.status(500).json({ error: 'Both APIs failed: ' + err.message });
    }
  }

  return res.status(500).json({ error: 'No API keys configured in Vercel environment variables' });
}
