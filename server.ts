import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const db = new Database("quiz.db");
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT,
    text TEXT,
    image_url TEXT,
    time_limit INTEGER,
    order_index INTEGER,
    FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS options (
    id TEXT PRIMARY KEY,
    question_id TEXT,
    text TEXT,
    image_url TEXT,
    is_correct BOOLEAN,
    FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    quiz_id TEXT,
    title TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    data TEXT
  );
`);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/quizzes", (req, res) => {
    const quizzes = db.prepare("SELECT * FROM quizzes ORDER BY created_at DESC").all();
    res.json(quizzes);
  });

  app.get("/api/quizzes/:id", (req, res) => {
    const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(req.params.id);
    if (!quiz) return res.status(404).json({ error: "Not found" });
    const questions = db.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index").all(quiz.id);
    for (const q of questions) {
      q.options = db.prepare("SELECT * FROM options WHERE question_id = ?").all(q.id);
    }
    quiz.questions = questions;
    res.json(quiz);
  });

  app.post("/api/quizzes", (req, res) => {
    const { title, questions } = req.body;
    const quizId = uuidv4();
    
    const insertQuiz = db.prepare("INSERT INTO quizzes (id, title) VALUES (?, ?)");
    const insertQuestion = db.prepare("INSERT INTO questions (id, quiz_id, text, image_url, time_limit, order_index) VALUES (?, ?, ?, ?, ?, ?)");
    const insertOption = db.prepare("INSERT INTO options (id, question_id, text, image_url, is_correct) VALUES (?, ?, ?, ?, ?)");

    const transaction = db.transaction(() => {
      insertQuiz.run(quizId, title);
      questions.forEach((q: any, i: number) => {
        const questionId = uuidv4();
        insertQuestion.run(questionId, quizId, q.text, q.image_url || null, q.time_limit || 30, i);
        q.options.forEach((opt: any) => {
          insertOption.run(uuidv4(), questionId, opt.text, opt.image_url || null, opt.is_correct ? 1 : 0);
        });
      });
    });

    try {
      transaction();
      res.json({ id: quizId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save quiz" });
    }
  });

  app.delete("/api/quizzes/:id", (req, res) => {
    db.prepare("DELETE FROM quizzes WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/quizzes/:id", (req, res) => {
    const { title, questions } = req.body;
    const quizId = req.params.id;
    
    const updateQuiz = db.prepare("UPDATE quizzes SET title = ? WHERE id = ?");
    const insertQuestion = db.prepare("INSERT INTO questions (id, quiz_id, text, image_url, time_limit, order_index) VALUES (?, ?, ?, ?, ?, ?)");
    const insertOption = db.prepare("INSERT INTO options (id, question_id, text, image_url, is_correct) VALUES (?, ?, ?, ?, ?)");

    const transaction = db.transaction(() => {
      updateQuiz.run(title, quizId);
      db.prepare("DELETE FROM questions WHERE quiz_id = ?").run(quizId);
      
      questions.forEach((q: any, i: number) => {
        const questionId = uuidv4();
        insertQuestion.run(questionId, quizId, q.text, q.image_url || null, q.time_limit || 30, i);
        q.options.forEach((opt: any) => {
          insertOption.run(uuidv4(), questionId, opt.text, opt.image_url || null, opt.is_correct ? 1 : 0);
        });
      });
    });

    try {
      transaction();
      res.json({ id: quizId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update quiz" });
    }
  });

  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a quiz with 5 multiple choice questions based on this prompt: "${prompt}". Each question should have 4 options, with exactly 1 correct option.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A catchy title for the quiz" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "The question text" },
                    time_limit: { type: Type.INTEGER, description: "Time limit in seconds (e.g. 30)" },
                    options: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING, description: "The option text" },
                          is_correct: { type: Type.BOOLEAN, description: "Whether this is the correct answer" }
                        },
                        required: ["text", "is_correct"]
                      }
                    }
                  },
                  required: ["text", "time_limit", "options"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });

  app.get("/api/results", (req, res) => {
    const results = db.prepare("SELECT * FROM results ORDER BY date DESC").all();
    res.json(results);
  });

  app.delete("/api/results/:id", (req, res) => {
    db.prepare("DELETE FROM results WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Socket.IO Logic
  const activeSessions = new Map();

  io.on("connection", (socket) => {
    socket.on("host:create_session", async (quizId, callback) => {
      const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(quizId);
      if (!quiz) return callback({ error: "Quiz not found" });
      
      const questions = db.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index").all(quizId);
      for (const q of questions) {
        q.options = db.prepare("SELECT * FROM options WHERE question_id = ?").all(q.id);
      }
      quiz.questions = questions;

      const roomId = uuidv4().substring(0, 6).toUpperCase();
      activeSessions.set(roomId, {
        roomId,
        quiz,
        hostSocketId: socket.id,
        status: 'waiting', // waiting, question, leaderboard, finished
        currentQuestionIndex: -1,
        questionStartTime: null,
        participants: new Map(),
      });

      socket.join(roomId);
      callback({ roomId, quiz });
    });

    socket.on("participant:join", ({ roomId, teamName, members }, callback) => {
      const session = activeSessions.get(roomId);
      if (!session) return callback({ error: "Session not found" });
      if (session.status !== 'waiting') return callback({ error: "Quiz already started" });

      const participantId = socket.id;
      
      let existingParticipant = Array.from(session.participants.values()).find((p: any) => p.teamName === teamName) as any;
      
      if (existingParticipant) {
        session.participants.delete(existingParticipant.id);
        existingParticipant.id = participantId;
        existingParticipant.members = members;
        session.participants.set(participantId, existingParticipant);
      } else {
        session.participants.set(participantId, {
          id: participantId,
          teamName,
          members,
          score: 0,
          currentAnswer: null
        });
      }

      socket.join(roomId);
      io.to(session.hostSocketId).emit("host:participant_joined", Array.from(session.participants.values()));
      callback({ success: true, sessionStatus: session.status });
    });

    socket.on("host:remove_participant", ({ roomId, participantId }) => {
      const session = activeSessions.get(roomId);
      if (session && session.hostSocketId === socket.id) {
        session.participants.delete(participantId);
        io.to(participantId).emit("participant:removed");
        io.sockets.sockets.get(participantId)?.leave(roomId);
        io.to(session.hostSocketId).emit("host:participant_joined", Array.from(session.participants.values()));
      }
    });

    socket.on("host:start_quiz", ({ roomId }) => {
      const session = activeSessions.get(roomId);
      if (session && session.hostSocketId === socket.id) {
        session.status = 'question';
        session.currentQuestionIndex = 0;
        session.questionStartTime = Date.now();
        
        const question = session.quiz.questions[0];
        const clientQuestion = { ...question, options: question.options.map((o: any) => ({ id: o.id, text: o.text, image_url: o.image_url })) };
        
        io.to(roomId).emit("quiz:question", { question: clientQuestion, questionIndex: 0, totalQuestions: session.quiz.questions.length });
      }
    });

    socket.on("host:next_question", ({ roomId }) => {
      const session = activeSessions.get(roomId);
      if (session && session.hostSocketId === socket.id) {
        session.currentQuestionIndex++;
        if (session.currentQuestionIndex >= session.quiz.questions.length) {
          session.status = 'finished';
          const leaderboard = Array.from(session.participants.values()).sort((a: any, b: any) => b.score - a.score);
          io.to(roomId).emit("quiz:finished", { leaderboard });
          
          // Save results
          db.prepare("INSERT INTO results (id, quiz_id, title, data) VALUES (?, ?, ?, ?)").run(
            uuidv4(), session.quiz.id, session.quiz.title, JSON.stringify(leaderboard)
          );
          activeSessions.delete(roomId);
        } else {
          session.status = 'question';
          session.questionStartTime = Date.now();
          // Reset current answers
          session.participants.forEach((p: any) => p.currentAnswer = null);
          
          const question = session.quiz.questions[session.currentQuestionIndex];
          const clientQuestion = { ...question, options: question.options.map((o: any) => ({ id: o.id, text: o.text, image_url: o.image_url })) };
          io.to(roomId).emit("quiz:question", { question: clientQuestion, questionIndex: session.currentQuestionIndex, totalQuestions: session.quiz.questions.length });
        }
      }
    });

    socket.on("host:show_leaderboard", ({ roomId }) => {
      const session = activeSessions.get(roomId);
      if (session && session.hostSocketId === socket.id) {
        session.status = 'leaderboard';
        const leaderboard = Array.from(session.participants.values()).sort((a: any, b: any) => b.score - a.score);
        
        // Include correct option for the previous question
        const question = session.quiz.questions[session.currentQuestionIndex];
        const correctOption = question.options.find((o: any) => o.is_correct);

        io.to(roomId).emit("quiz:leaderboard", { leaderboard, correctOptionId: correctOption.id });
      }
    });

    socket.on("participant:answer", ({ roomId, optionId }) => {
      const session = activeSessions.get(roomId);
      if (session && session.status === 'question') {
        const participant = session.participants.get(socket.id);
        if (participant && !participant.currentAnswer) {
          const question = session.quiz.questions[session.currentQuestionIndex];
          const option = question.options.find((o: any) => o.id === optionId);
          
          const timeTaken = (Date.now() - session.questionStartTime) / 1000;
          const timeLeft = Math.max(0, question.time_limit - timeTaken);
          
          let points = 0;
          if (option && option.is_correct) {
            points = Math.round(10 * timeLeft);
          }
          
          participant.currentAnswer = optionId;
          participant.score += points;

          io.to(session.hostSocketId).emit("host:participant_answered", {
            participantId: socket.id,
            totalAnswered: Array.from(session.participants.values()).filter((p: any) => p.currentAnswer).length,
            totalParticipants: session.participants.size
          });
        }
      }
    });

    socket.on("disconnect", () => {
      // Handle disconnects if needed (e.g., remove from active sessions)
      // For simplicity, we keep them in the session so they can reconnect if we implemented it,
      // but here we just let them be.
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
