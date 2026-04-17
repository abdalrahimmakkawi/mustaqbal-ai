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
  onChunk?: (delta: string) => void,
  freeMessage?: string
): Promise<string> {
  const body = freeMessage
    ? { message: freeMessage, subject, vibe, language, history }
    : { subject, topic, vibe, language, history };

  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('API Error: ' + response.status);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true })
      .split('\n')
      .filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const str = line.slice(6).trim();
      try {
        const parsed = JSON.parse(str);
        if (parsed.delta) {
          fullContent += parsed.delta;
          if (onChunk) onChunk(parsed.delta);
        }
        if (parsed.done) fullContent = parsed.content || fullContent;
      } catch {}
    }
  }

  return fullContent ||
    (language === 'ar' ? 'Sorry, something went wrong. Try again.' : 'Sorry, something went wrong. Try again.');
}
