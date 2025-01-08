const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const OPENAI_API_KEY = "your-openai-api-key";
const SESSION_STORE = {}; // In-memory session store (use DB in production)

app.post("/generate-code", async (req, res) => {
  const { sessionId, instructions } = req.body;

  // Retrieve previous session if exists
  const session = SESSION_STORE[sessionId] || [];

  // Formulate the prompt based on instructions and previous context
  const prompt = generatePrompt(session, instructions);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const code = response.data.choices[0].text.trim();

    // Store the new conversation
    session.push({ input: instructions, output: code });
    SESSION_STORE[sessionId] = session;

    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate code" });
  }
});

function generatePrompt(session, instructions) {
  const previousMessages = session
    .map((msg) => `${msg.input}\n${msg.output}`)
    .join("\n\n");
  return `${previousMessages}\n\nUser: ${instructions}\nAI:`;
}

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
