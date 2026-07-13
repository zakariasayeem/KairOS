import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Subtask = {
  title: string;
  est_minutes: number;
};

async function callGroq(prompt: string, context: any): Promise<Subtask[]> {
  const apiKey = Deno.env.get('GROQ_API_KEY');

  const systemPrompt = `You are a task breakdown assistant. Break the user's goal into 3-7 small, actionable subtasks.
Apply SMART/WBS planning principles: each subtask should be specific and completable in one sitting.
Respond ONLY with a JSON array, no other text, in this exact format:
[{"title": "subtask title", "est_minutes": 15}, ...]`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Goal: ${prompt}${context?.experience_level ? `\nExperience level: ${context.experience_level}` : ''}` },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const parsed = JSON.parse(content);
  return parsed;
}

async function callLLM(prompt: string, context: any): Promise<Subtask[]> {
  const provider = Deno.env.get('AI_PROVIDER');

  if (provider === 'groq') {
    return callGroq(prompt, context);
  }

  throw new Error(`Unknown or unconfigured AI provider: ${provider}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subtasks = await callLLM(prompt, context);
    const requestId = crypto.randomUUID();

    return new Response(
      JSON.stringify({ subtasks, request_id: requestId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI breakdown error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate breakdown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});