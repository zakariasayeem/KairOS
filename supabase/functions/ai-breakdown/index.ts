import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_HOURS = 1;

type Subtask = {
  title: string;
  est_minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
};

async function checkRateLimit(identifier: string): Promise<boolean> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { count, error } = await supabaseAdmin
    .from('rate_limit_log')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('identifier', identifier)
    .gte('requested_at', windowStart);

  if (error) {
    console.error('Rate limit check error:', error);

    // Fail open — don't block users if rate limiting itself breaks.
    return true;
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for ${identifier}`);
    return false;
  }

  const { error: insertError } = await supabaseAdmin
    .from('rate_limit_log')
    .insert({ identifier });

  if (insertError) {
    console.error('Rate limit insert error:', insertError);
  }

  return true;
}

async function callGroq(
  prompt: string,
  context: any
): Promise<Subtask[]> {
  const apiKey = Deno.env.get('GROQ_API_KEY');

  const systemPrompt = `You are a task breakdown assistant. Break the user's goal into 3-7 actionable subtasks.

Follow these rules:
1. Order subtasks in the sequence they should be completed (first step first).
2. Each subtask title must be specific and clear — someone should know exactly what to do without more explanation.
3. Each subtask must be completable in a single sitting (under 90 minutes).
4. Do not include vague or optional "nice to have" subtasks — only what's necessary to make real progress on the goal.
5. Assign every subtask a realistic est_minutes value.
6. Assign every subtask a difficulty:
   - "easy" (under 20 min, low effort)
   - "medium" (20–45 min, needs some focus)
   - "hard" (45+ min or complex)

Respond with ONLY a JSON array, no explanation, no markdown code blocks, in this exact format:
[{"title":"subtask title","est_minutes":15,"difficulty":"easy"}]`;

  const response = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content:
              `Goal: ${prompt}` +
              (context?.experience_level
                ? `\nExperience level: ${context.experience_level}`
                : '') +
              (context?.deadline
                ? `\nDeadline: ${context.deadline}`
                : ''),
          },
        ],
        temperature: 0.6,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);

  return parsed.map((task: any) => ({
    title: task.title,
    est_minutes: task.est_minutes ?? 20,
    difficulty: task.difficulty ?? 'medium',
  }));
}

async function callLLM(
  prompt: string,
  context: any
): Promise<Subtask[]> {
  const provider = Deno.env.get('AI_PROVIDER');

  if (provider === 'groq') {
    return callGroq(prompt, context);
  }

  throw new Error(`Unknown or unconfigured AI provider: ${provider}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    const identifier =
      req.headers
        .get('x-forwarded-for')
        ?.split(',')[0]
        .trim() ?? 'unknown';

    const allowed = await checkRateLimit(identifier);

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { prompt, context } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Missing or invalid prompt',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const subtasks = await callLLM(prompt, context);

    return new Response(
      JSON.stringify({
        subtasks,
        request_id: crypto.randomUUID(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('AI breakdown error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate breakdown',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});