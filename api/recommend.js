export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { genre, mood, level, prompt } = req.body || {};

    if (!genre || !mood || !level) {
      return res.status(400).json({ error: "Missing genre/mood/level" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY on server" });
    }

    const model = "gemini-2.5-flash";
    const finalPrompt =
      prompt ||
      `Recommend 6 books for a ${level} ${genre} reader feeling ${mood}. Explain why each book fits.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: data?.error?.message || "Gemini request failed",
      });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p?.text).filter(Boolean).join("\n") || "No text returned.";

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
                      }
