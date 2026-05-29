import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const { Pool } = pkg;

import reportsRoutes from './routes/reports.js';
import usersRoutes from './routes/user.js';

const app = express();

/* ============================
   Database Connection
============================ */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});

pool.connect()
    .then(() => console.log("PostgreSQL connected"))
    .catch(err => console.error("DB connection error:", err));

app.locals.db = pool;

/* ============================
   Middleware
============================ */
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

/* ============================
   Health Check
============================ */
app.get("/", (req, res) => {
    res.json({
        message: "API running",
        environment: process.env.NODE_ENV || "development"
    });
});

/* ============================
   REGISTER API
============================ */
app.post("/api/register", async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email and password are required"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                error: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role`,
            [name, email, hashedPassword, role || 'analyst']
        );

        res.status(201).json({
            message: "Registration successful",
            user: result.rows[0]
        });

    } catch (err) {
        next(err);
    }
});

/* ============================
   LOGIN API
============================ */
app.post("/api/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                error: "Invalid credentials"
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(400).json({
                error: "Invalid credentials"
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        next(err);
    }
});

/* ============================
   Routes
============================ */
app.use("/api/reports", reportsRoutes);
app.use("/api/users", usersRoutes);

/* ============================
   404 Handler
============================ */
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

/* ============================
   Global Error Handler
============================ */
app.use((err, req, res, next) => {
    console.error("ERROR:", err);
    res.status(err.status || 500).json({
        message: err.message || "Server error"
    });
});

/* ============================
   Start Server
============================ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});