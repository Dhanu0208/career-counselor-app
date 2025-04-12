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

const questions = [
  {
    text: "Hey! 😊 What’s your name and which class have you just completed?",
    expects: ["name", "class"],
  },
  {
    text: "Which subjects did you really enjoy in Class 10?",
    expects: ["fav_subjects"],
  },
  {
    text: "Any subjects you found boring or tough?",
    expects: ["weak_subjects"],
  },
  {
    text: "What do you love doing in your free time? (Hobbies)",
    expects: ["hobbies"],
  },
  {
    text: "Which of these sounds like you? (e.g., creative, problem solver, techie, etc.)",
    expects: ["personality_type"],
  },
  {
    text: "Would you say you're more of a team player or an independent worker?",
    expects: ["work_style"],
  },
  {
    text: "What do your parents do for work?",
    expects: ["parent_jobs"],
  },
  {
    text: "Are your parents supportive of careers outside doctor/engineer paths?",
    expects: ["parent_support"],
  },
  {
    text: "Do you have a dream job or career in mind?",
    expects: ["dream_job"],
  },
  {
    text: "Is there any career you're definitely not interested in?",
    expects: ["disliked_careers"],
  },
  {
    text: "Would you like to take a fun career test to match your skills?",
    expects: ["take_test"],
  },
];

async function extractDataWithOpenAI(
  answer,
  expectedFields,
  existingAnswers = {}
) {
  const prompt = `
  You are a helpful and intelligent assistant tasked with extracting structured career-related information from a student conversation.
  
  Context:
  - Previously collected answers:
  ${JSON.stringify(existingAnswers, null, 2)}
  
  - Student's latest message:
  "${answer}"
  
  Extraction Goal:
  Identify and extract only the fields listed below if they are clearly present in the student's message:
  ${expectedFields.join(", ")}
  
  Instructions:
  - Normalize formats. For example:
    - "class" can appear as: "10th", "tenth", "X", "x", "Class 10", etc. Normalize to numeric string (e.g., "10").
    - "name" should refer to the student's name—not a subject or unrelated entity.
    - For "subjects", only extract academic school subjects (e.g., Math, Science, English). Ignore hobbies or unrelated words.
  - Be tolerant to natural language variation, typos, or informal phrasing.
  - Ignore fields not clearly stated or ambiguous.
  - Output only the fields that are **explicitly identifiable** in the student’s latest response.
  
  Response Format:
  Return a clean JSON object with only the detected fields.
  
  Example:
  {
    "name": "Dhanu",
    "class": "10"
  }
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  try {
    const jsonStart = completion.choices[0].message.content.indexOf("{");
    const json = completion.choices[0].message.content.slice(jsonStart);
    return JSON.parse(json);
  } catch (e) {
    console.error("❌ Failed to parse AI output:", e);
    return {};
  }
}

let sessions = {};

app.post("/question", async (req, res) => {
  const sessionId = req.headers["x-session-id"] || uuidv4();
  const { answer } = req.body;

  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      currentQuestion: 0,
      answers: {},
    };
  }

  const session = sessions[sessionId];
  const currentQ = questions[session.currentQuestion];

  // ✅ Extract with full context
  const extracted = await extractDataWithOpenAI(
    answer || "",
    currentQ.expects,
    session.answers // ✅ pass previous answers
  );

  // ✅ Store newly extracted fields into session
  Object.assign(session.answers, extracted);

  // ✅ Check for missing fields using updated session.answers
  const missingFields = currentQ.expects.filter(
    (field) => !session.answers[field]
  );

  if (missingFields.length === 0) {
    session.currentQuestion += 1;

    if (session.currentQuestion < questions.length) {
      return res.json({
        question: questions[session.currentQuestion].text,
        sessionId,
      });
    } else {
      db.query(
        "INSERT INTO sessions (session_id, user_input, ai_response) VALUES (?, ?, ?)",
        [
          sessionId,
          JSON.stringify(session.answers),
          "Generating career recommendations...",
        ]
      );

      return res.json({
        done: true,
        message:
          "Thanks! We’ve collected your answers. Generating suggestions...",
      });
    }
  }

  // 🔁 Ask only for the missing fields
  return res.json({
    question: `Thanks! Could you also tell me about: ${missingFields.join(
      ", "
    )}?`,
    sessionId,
  });
});

app.listen(5500, () => console.log("Server running on http://localhost:5500"));
