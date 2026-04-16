import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject, topic, vibe, language, history } = req.body;
  const apiKey = process.env.NVIDIA_API_KEY;

  console.log('Environment check:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) : 'none'
  });

  if (!apiKey) {
    console.error('NVIDIA_API_KEY is not configured');
    return res.status(500).json({ error: 'NVIDIA_API_KEY is not configured' });
  }

  try {
    const userMessage = 'Explain ' + topic + ' in ' + subject + ' using the ' + vibe + ' vibe. Language: ' + language;
    const authHeader = apiKey.startsWith('Bearer') ? apiKey : 'Bearer ' + apiKey;

    console.log('Making request to Nvidia API:', {
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      hasAuth: !!authHeader,
      model: 'meta/llama-3.1-405b-instruct'
    });

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-405b-instruct',
        messages: [
          { role: 'system', content: 'You are a helpful AI tutor. Provide clear, educational responses tailored to student needs.' },
          ...history.map((m: any) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
          { role: 'user', content: userMessage }
        ],
      })
    });

    console.log('Nvidia API response status:', response.status);

    const data = await response.json();
    console.log('Nvidia API response data:', data);
    
    if (!response.ok) {
      console.error('Nvidia API error:', data);
      return res.status(response.status).json({ error: data.error || 'Failed to fetch from Nvidia API' });
    }

    console.log('Success: Sending response');
    res.json({ content: data.choices[0].message.content });
  } catch (error) {
    console.error('Error calling Nvidia API:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
