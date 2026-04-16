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
  history: ChatMessage[]
): Promise<string> {
  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, topic, vibe, language, history }),
  });

  if (!response.ok) {
    throw new Error('API Error: ' + response.status);
  }

  const data = await response.json();
  return data.content || (language === 'ar' ? 'آسف، حدث خطأ ما. حاول مرة أخرى.' : 'Sorry, something went wrong.');
}
