const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export type AISubtask = {
  title: string;
  est_minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
};

export type AIBreakdownResult = {
  subtasks: AISubtask[];
  request_id: string;
};

export async function fetchAIBreakdown(prompt: string): Promise<AIBreakdownResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout per spec Section 12.7

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-breakdown`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}