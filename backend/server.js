// const express = require("express");
// const axios = require("axios");
// const OpenAI = require("openai");
// const cors = require("cors");
// const app = express();

// app.use(cors());

// app.use(express.json());
// require("dotenv").config();

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// const SESSION_STORE = {};
// const org = process.env.ORGANIZATION;
// const projectID = process.env.PROJECT_ID;

// const openai = new OpenAI({
//   apiKey: OPENAI_API_KEY,
//   organization: org,
//   project: projectID,
// });

// app.post("/generate-code", async (req, res) => {
//   const { sessionId, instructions } = req.body;

//   if (!sessionId || !instructions) {
//     return res
//       .status(400)
//       .json({ error: "sessionId and instructions are required." });
//   }

//   const session = SESSION_STORE[sessionId] || [];
//   const messages = generateMessages(session, instructions);

//   try {
//     const response = await openai.chat.completions.create({
//       // model: "gpt-3.5-turbo",
//       // model: "chatgpt-4o-latest",
//       model: "chatgpt-4o-latest",
//       messages: messages,
//       temperature: 0.5,
//       max_tokens: 1000,
//     });

//     const code = response.choices[0].message.content.trim();

//     session.push({ input: instructions, output: code });
//     SESSION_STORE[sessionId] = session;

//     res.json({ code });
//   } catch (error) {
//     console.error("OpenAI API Error:", error);
//     res.status(500).json({ error: "Failed to generate code" });
//   }
// });

// function generateMessages(session, instructions) {
//   const messages = [
//     {
//       role: "system",
//       content:
//         "You are a helpful programming assistant. Provide clear, concise code examples and explanations.",
//     },
//   ];

//   // Add previous conversation context
//   session.forEach((msg) => {
//     messages.push({ role: "user", content: msg.input });
//     messages.push({ role: "assistant", content: msg.output });
//   });

//   // Add current instruction
//   messages.push({ role: "user", content: instructions });

//   return messages;
// }

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Server is running on port : ${PORT}`);
// });
const express = require("express");
const axios = require("axios");
const OpenAI = require("openai");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
require("dotenv").config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SESSION_STORE = {};
const org = process.env.ORGANIZATION;
const projectID = process.env.PROJECT_ID;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: org,
  project: projectID,
});

app.post("/generate-code", async (req, res) => {
  const { sessionId, instructions, documents } = req.body;

  if (!sessionId || !instructions) {
    return res
      .status(400)
      .json({ error: "sessionId and instructions are required." });
  }

  // Format documents in a specific XML structure
  let formattedDocuments = "";
  if (documents && documents.length > 0) {
    formattedDocuments = `
<documents>
${documents
  .map(
    (doc, index) => `
  <document index="${index + 1}">
    <source>${doc.source}</source>
    <document_content>
${doc.document_content}
    </document_content>
  </document>`
  )
  .join("\n")}
</documents>`;
  }

  // Create a combined prompt with both instructions and file contents
  const combinedInstructions = documents?.length
    ? `${formattedDocuments}\n\n${instructions}`
    : instructions;

  const session = SESSION_STORE[sessionId] || [];
  const messages = generateMessages(session, combinedInstructions);

  try {
    console.log("Sending to OpenAI:", JSON.stringify(messages, null, 2)); // Debug log

    const response = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: messages,
      temperature: 0.5,
      max_tokens: 1000,
    });

    const code = response.choices[0].message.content.trim();

    // Store only the user instruction without the file content to save space
    session.push({ input: instructions, output: code });
    SESSION_STORE[sessionId] = session;

    res.json({ code });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate code: " + error.message });
  }
});

function generateMessages(session, instructions) {
  const messages = [
    {
      role: "system",
      content: `You are a helpful programming assistant. When analyzing code files, respond directly to questions about them and provide suggestions for improvement. Format your responses in a clear, direct manner without mentioning file handling capabilities.`,
    },
  ];

  // Add previous conversation context
  session.forEach((msg) => {
    messages.push({ role: "user", content: msg.input });
    messages.push({ role: "assistant", content: msg.output });
  });

  // Add current instruction
  messages.push({ role: "user", content: instructions });

  return messages;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
});
