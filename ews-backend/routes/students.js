import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

/*
-----------------------------------
SEARCH/FILTER STUDENTS (pagination)
POST /api/students/search
-----------------------------------
*/
router.post("/search", async (req, res) => {
    const { page = 1, size = 10, query = "", department = "All", class_year = "All", status = "All" } = req.body;
    const skip = (page - 1) * size;

    try {
        const where = {};

        // Search text query (matches name or student_id)
        if (query) {
            where.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { student_id: { contains: query, mode: "insensitive" } }
            ];
        }

        // Department filter
        if (department && department !== "All") {
            where.department = department;
        }

        // Class year filter
        if (class_year && class_year !== "All") {
            where.class_year = parseInt(class_year, 10);
        }

        // Status filter
        if (status && status !== "All") {
            where.status = status;
        }

        const [students, total] = await Promise.all([
            prisma.students.findMany({
                where,
                orderBy: { created_at: "desc" },
                take: size,
                skip: skip,
            }),
            prisma.students.count({ where }),
        ]);

        res.json({ students, total });
    } catch (err) {
        console.error("Error searching students in database:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/*
-----------------------------------
MANUAL ENROLLMENT
POST /api/students
-----------------------------------
*/
router.post("/", async (req, res) => {
    const { student_id, name, email, department, class_year, status = "active" } = req.body;

    if (!student_id || !name || !department || !class_year) {
        return res.status(400).json({ error: "Student ID, Name, Department, and Class Year are required" });
    }

    try {
        const existing = await prisma.students.findUnique({
            where: { student_id }
        });

        if (existing) {
            return res.status(400).json({ error: "A student with this Student ID is already enrolled." });
        }

        const student = await prisma.students.create({
            data: {
                student_id: student_id.trim(),
                name: name.trim(),
                email: email ? email.trim() : null,
                department,
                class_year: parseInt(class_year, 10),
                status
            }
        });

        res.status(201).json({
            message: "Student enrolled successfully",
            student
        });
    } catch (err) {
        console.error("Error creating student in database:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/*
-----------------------------------
TOGGLE STATUS
PUT /api/students/:id/status
-----------------------------------
*/
router.put("/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: "Status is required" });
    }

    try {
        const student = await prisma.students.update({
            where: { id: parseInt(id, 10) },
            data: { status }
        });

        res.json({
            message: `Student status updated to ${status}`,
            student
        });
    } catch (err) {
        console.error("Error updating student status in database:", err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
