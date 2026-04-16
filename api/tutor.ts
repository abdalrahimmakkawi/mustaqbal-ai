import { VercelRequest, VercelResponse } from '@vercel/node';

function buildSystemPrompt(vibe: string, language: string): string {
  const vibeMap: Record<string, string> = {
    football: language === 'ar'
      ? 'استخدم أمثلة من كرة القدم والدوريات العالمية لشرح كل مفهوم'
      : 'Use football, matches, and player examples to explain every concept',
    gaming: language === 'ar'
      ? 'استخدم أمثلة من الألعاب الإلكترونية والشخصيات لشرح كل مفهوم'
      : 'Use video game mechanics, characters, and levels to explain every concept',
    action: language === 'ar'
      ? 'استخدم أمثلة من أفلام الأكشن والمعارك لشرح كل مفهوم'
      : 'Use action movies, fight scenes, and heroes to explain every concept',
    street: language === 'ar'
      ? 'تحدث بأسلوب الشارع والثقافة الشبابية السودانية'
      : 'Use street culture, casual talk, and youth slang to explain concepts',
  };

  const vibeInstruction = vibeMap[vibe] || vibeMap.football;

  if (language === 'ar') {
    return 'أنت \"يا أخويا AI\"، مدرس سوداني شاطر وبارع لطلاب الثانوي. مهمتك شرح المواد الدراسية بطريقة ممتعة ومفيدة.' + vibeInstruction + '. تحدث بالعربية السودانية الواضحة. اجعل الشرح مسلياً ومثيراً للاهتمام. استخدم إيموجي أحياناً. لا تجعل الشرح طويلاً جداً - اشرح بوضوح ثم اسأل \"فاهم ولا نكمل؟\"';
  }

  return 'You are \"Ya Akhoya AI\", a brilliant Sudanese tutor for high school boys. Your mission: explain school subjects in a way that is human, entertaining, and educational.' + vibeInstruction + '. Keep it engaging, not too long. End with \"Get it? Want me to go deeper?\" ';
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
    ? 'اشرح لي \"' + topic + '\" في مادة \"' + subject + '\"' 
    : 'Explain \"' + topic + '\" in \"' + subject + '\"';

  // --- Try NVIDIA first (8s timeout to stay within Vercel 10s limit) ---
  if (nvidiaKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': nvidiaKey.startsWith('Bearer ') ? nvidiaKey : 'Bearer ' + nvidiaKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          max_tokens: 600,
          temperature: 0.7,
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
