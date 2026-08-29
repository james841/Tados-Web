import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL,
  authToken: process.env.ANTHROPIC_AUTH_TOKEN,
});

export async function POST(req: Request) {
  const { prompt } = await req.json();
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    return Response.json({ result: message.content });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("AgentRouter error details:", errorMessage);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}