import Groq from "groq-sdk";

export async function POST(req) {
  const { prompt } = await req.json();

  // 1番目：Groqで試す
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const message = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.choices[0]?.message?.content || "";
    return Response.json({ content: [{ type: "text", text }] });
  } catch(e1) {
    console.log("Groq failed:", e1.message);
  }

  // 2番目：Geminiで試す
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Gemini empty response");
    return Response.json({ content: [{ type: "text", text }] });
  } catch(e2) {
    console.log("Gemini failed:", e2.message);
  }

  // 全部失敗
  return Response.json({ error: "現在サービスが混み合っています。しばらくしてからお試しください。" }, { status: 500 });
}