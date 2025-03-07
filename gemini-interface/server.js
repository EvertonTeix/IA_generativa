import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Configurações iniciais
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "database.sqlite");

// Conecta ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err.message);
  } else {
    console.log("Conectado ao banco de dados SQLite.");
    initializeDatabase();
  }
});

// Cria as tabelas
function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
}

// Configuração do servidor
const app = express();
const PORT = 5000;
const SECRET_KEY = "sua_chave_secreta";

app.use(cors());
app.use(bodyParser.json());

// Rotas
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username e password são obrigatórios." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ message: "Username já existe." });
        }
        res.status(201).json({ message: "Usuário registrado com sucesso." });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Erro ao registrar usuário." });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username e password são obrigatórios." });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ message: "Usuário não encontrado." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Senha incorreta." });
    }

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
  });
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Rotas do chat
app.post("/chat/save", authenticateToken, (req, res) => {
  const { message, response } = req.body;
  const userId = req.user.id;

  db.run(
    "INSERT INTO chat_history (user_id, message, response) VALUES (?, ?, ?)",
    [userId, message, response],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Erro ao salvar histórico." });
      }
      res.status(201).json({ message: "Histórico salvo com sucesso." });
    }
  );
});

app.get("/chat/history", authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    "SELECT message, response, timestamp FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC",
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao obter histórico." });
      }
      res.json(rows);
    }
  );
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});