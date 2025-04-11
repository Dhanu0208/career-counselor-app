const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const mysql = require("mysql2");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Session-Id"],
  })
);

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Qwerty000@",
  database: "career_counselor",
});

db.connect((err) => {
  if (err) console.error("DB connection failed:", err);
  else console.log("DB connected");
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  const sessionId = req.headers["x-session-id"] || uuidv4();

  const prompt = `You are an AI career counselor. ${message}`;

  try {
    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a friendly and helpful AI career counselor.",
        },
        { role: "user", content: prompt },
      ],
    });

    const reply = aiRes.choices?.[0]?.message?.content;

    db.query(
      "INSERT INTO sessions (session_id, user_input, ai_response) VALUES (?, ?, ?)",
      [sessionId, message, reply]
    );

    res.json({ response: reply });
  } catch (err) {
    console.error("OpenAI Error:", err);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.listen(5500, () => console.log("Server running on http://localhost:5500"));
