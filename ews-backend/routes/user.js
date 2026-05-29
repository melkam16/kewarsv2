import express from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma.js";

const router = express.Router();

/*
-----------------------------------
SEARCH USERS (pagination)
POST /api/users/search
-----------------------------------
*/
router.post("/search", async (req, res) => {
    const { page = 1, size = 10, query = "" } = req.body;
    const skip = (page - 1) * size;

    try {
        const where = query
            ? {
                  OR: [
                      { name: { contains: query, mode: "insensitive" } },
                      { email: { contains: query, mode: "insensitive" } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            prisma.users.findMany({
                where,
                include: { user_roles: true },
                orderBy: { created_at: "desc" },
                take: size,
                skip: skip,
            }),
            prisma.users.count({ where }),
        ]);

        const mapped = users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || "",
            enabled: u.enabled ?? true,
            created_at: u.created_at ? u.created_at.toISOString() : null,
            role: u.role || "",
            groups: u.user_roles.map((r) => r.role),
        }));

        res.json({ users: mapped, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/*
-----------------------------------
CREATE USER (admin)
POST /api/users
-----------------------------------
*/
router.post("/", async (req, res) => {
    const { name, email, password, role, roles } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email and password are required" });
    }

    try {
        const existing = await prisma.users.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: "A user with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine initial roles list
        const rolesList = roles && roles.length > 0 ? roles : role ? [role] : [];

        const user = await prisma.users.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: rolesList[0] || "analyst",
                enabled: true,
                user_roles: {
                    create: rolesList.map((r) => ({ role: r })),
                },
            },
            include: { user_roles: true },
        });

        res.status(201).json({
            message: "User created successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                enabled: user.enabled,
                groups: user.user_roles.map((r) => r.role),
                role: user.role,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/*
-----------------------------------
ADD ROLE
POST /api/users/:id/roles
-----------------------------------
*/
router.post("/:id/roles", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
        await prisma.user_roles.upsert({
            where: {
                user_id_role: {
                    user_id: id,
                    role: role,
                },
            },
            create: {
                user_id: id,
                role: role,
            },
            update: {},
        });

        res.json({ message: "Role added" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/*
-----------------------------------
REMOVE ROLE
DELETE /api/users/:id/roles
-----------------------------------
*/
router.delete("/:id/roles", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    try {
        await prisma.user_roles.deleteMany({
            where: {
                user_id: id,
                role: role,
            },
        });

        res.json({ message: "Role removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/*
-----------------------------------
ENABLE / DISABLE USER
PUT /api/users/:id
-----------------------------------
*/
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;

    try {
        if (action === "disable") {
            await prisma.users.update({
                where: { id },
                data: { enabled: false },
            });
        } else if (action === "enable") {
            await prisma.users.update({
                where: { id },
                data: { enabled: true },
            });
        }

        res.json({ message: "User updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

/*
-----------------------------------
DELETE USER
DELETE /api/users/:id
-----------------------------------
*/
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.users.delete({ where: { id } });
        res.json({ message: "User deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;