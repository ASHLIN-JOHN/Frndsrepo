// server.js

import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------- PATH SETUP -------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------- DB -------------------
if (!process.env.DB_URL) {
    console.error("❌ DB_URL not found in .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DB_URL,
});

// Helper function to execute queries
async function query(text, params) {
    const result = await pool.query(text, params);
    return result.rows;
}

// ------------------- MIDDLEWARE -------------------
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html, css, js

// ------------------- TEST -------------------
app.get("/api/test", (req, res) => {
    res.json({ message: "API working" });
});

// ------------------- REGISTER -------------------
app.post("/api/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("REGISTER:", username);

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password required" });
        }

        const existing = await query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Username already exists" });
        }

        await query(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
            [username, password, 'user']
        );

        res.status(201).json({ message: "Registered successfully" });

    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ message: "Server error while registering" });
    }
});

// ------------------- LOGIN -------------------
app.post("/api/login", async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const rows = await query(
            "SELECT id FROM users WHERE username = $1 AND password = $2 AND role = $3",
            [username, password, role]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        res.json({ message: "Login ok" });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: "Server error while logging in" });
    }
});

// ------------------- CREATE APPOINTMENT -------------------
app.post("/api/appointments", async (req, res) => {
    try {
        const { patient, doctor, date, slot, username } = req.body;

        if (!patient || !doctor || !date || !slot || !username) {
            return res.status(400).json({ message: "All fields required" });
        }

        const existing = await query(
            "SELECT id FROM appointments WHERE doctor = $1 AND date = $2 AND slot = $3",
            [doctor, date, slot]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Slot already booked" });
        }

        await query(
            "INSERT INTO appointments (patient_name, doctor, date, slot, username) VALUES ($1, $2, $3, $4, $5)",
            [patient, doctor, date, slot, username]
        );

        res.status(201).json({ message: "Appointment booked" });

    } catch (err) {
        console.error("APPOINTMENT ERROR:", err);
        res.status(500).json({ message: "Server error while booking" });
    }
});

// ------------------- GET APPOINTMENTS -------------------
app.get("/api/appointments", async (req, res) => {
    try {
        const { username } = req.query;

        let rows;
        if (username) {
            rows = await query(
                "SELECT doctor, date, slot FROM appointments WHERE username = $1 ORDER BY date, slot",
                [username]
            );
        } else {
            rows = await query(
                "SELECT patient_name AS patient, doctor, date, slot FROM appointments ORDER BY date, slot",
                []
            );
        }

        res.json(rows);

    } catch (err) {
        console.error("FETCH ERROR:", err);
        res.status(500).json({ message: "Server error while fetching" });
    }
});

// ------------------- START -------------------
app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
