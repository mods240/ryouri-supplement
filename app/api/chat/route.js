import Anthropic from "@anthropic-ai/sdk";
export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].text || "";
    return Response.json({ content: [{ type: "text", text }] });
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}