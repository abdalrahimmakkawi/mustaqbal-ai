export type Vibe = 'football' | 'gaming' | 'action' | 'street';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function getTutorResponse(
  subject: string,
  topic: string,
  vibe: Vibe,
  language: 'ar' | 'en',
  history: ChatMessage[],
  onChunk?: (delta: string) => void
): Promise<string> {
  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, topic, vibe, language, history }),
  });

  if (!response.ok) throw new Error('API Error: ' + response.status);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const jsonStr = line.replace('data: ', '').trim();
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.delta && onChunk) {
          fullContent += parsed.delta;
          onChunk(parsed.delta);
        }
        if (parsed.done) fullContent = parsed.content || fullContent;
      } catch {}
    }
  }

  return fullContent || (language === 'ar' ? 'آسف، حدث خطأ ما.' : 'Sorry, something went wrong.');
}
