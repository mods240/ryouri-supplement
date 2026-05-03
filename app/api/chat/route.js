import Groq from "groq-sdk";

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.choices[0]?.message?.content || "";
    return Response.json({ content: [{ type: "text", text }] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}