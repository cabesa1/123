import OpenAI from 'openai';

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || 'gpt-5.6-terra';
}

export async function generateStructured(instructions: string, input: string, schema: Record<string, unknown>, name: string) {
  if (process.env.AI_PROVIDER === 'ollama' || !process.env.OPENAI_API_KEY) {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'qwen3:4b', stream: false, format: schema, options: { temperature: 0 }, messages: [{ role: 'system', content: instructions }, { role: 'user', content: input }] }),
    });
    const data = await response.json() as { message?: { content?: string }; error?: string };
    if (!response.ok || !data.message?.content) throw new Error(data.error || 'O Ollama não retornou conteúdo.');
    return data.message.content;
  }
  const response = await getOpenAIClient().responses.create({
    model: getOpenAIModel(), instructions, input,
    text: { format: { type: 'json_schema', name, strict: true, schema } }, store: false,
  });
  return response.output_text;
}
