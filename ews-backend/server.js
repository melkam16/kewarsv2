import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './prisma.js';

import reportsRoutes from './routes/reports.js';
import usersRoutes from './routes/user.js';
import studentsRoutes from './routes/students.js';

const app = express();

/* ============================
   __dirname for ES modules
============================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ============================
   Database Connection
============================ */
// PostgreSQL connection is managed via standard Prisma Pg driver adapter
console.log("PostgreSQL connected (via Prisma)");

app.locals.db = prisma;

/* ============================
   Middleware
============================ */
app.use(cors({
    origin: (origin, callback) => {
        const allowed = [
            "http://localhost:3000",
            process.env.CORS_ORIGIN
        ].filter(Boolean);
        // Allow requests with no origin (server-to-server, curl, etc.)
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // permissive in v1 — tighten after domain confirmed
        }
    },
    credentials: true
}));

app.use(express.json());

// We handle search queries specifically via direct route delegation in the DB block below


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
   PUBLIC REPORTS API
============================ */
app.get("/api/public/reports", async (req, res, next) => {
    try {
        const publishedReports = await prisma.reports.findMany({
            where: { 
                status: "published",
                revision: { not: "draft" }
            },
            orderBy: { update_timestamp: "desc" }
        });

        // Group by report_id and select the latest revision
        const groupedMap = new Map();
        for (const r of publishedReports) {
            const existing = groupedMap.get(r.report_id);
            if (!existing) {
                groupedMap.set(r.report_id, r);
            } else {
                const existingTime = new Date(existing.update_timestamp || 0).getTime();
                const rTime = new Date(r.update_timestamp || 0).getTime();
                if (rTime > existingTime) {
                    groupedMap.set(r.report_id, r);
                }
            }
        }

        const latestPublishedReports = Array.from(groupedMap.values());

        // Sort by incident_date_time desc overall
        latestPublishedReports.sort((a, b) => {
            const tA = new Date(a.incident_date_time || 0).getTime();
            const tB = new Date(b.incident_date_time || 0).getTime();
            return tB - tA;
        });

        const mapped = latestPublishedReports.map((r) => {
            return {
                id: r.report_id,
                title: r.title || `Report ${r.report_id}`,
                description: r.description || "",
                titleEn: r.title_en || "",
                descriptionEn: r.description_en || "",
                incidentDateTime: r.incident_date_time ? r.incident_date_time.toISOString() : new Date().toISOString(),
                region: r.region || "",
                zone: r.zone || "",
                woreda: r.woreda || "",
                severity: r.severity || "low",
                categories: r.categories || [],
                incidentGps: r.latitude && r.longitude ? { lat: Number(r.latitude), lon: Number(r.longitude) } : null,
                mediaFiles: (r.media_files || []).map(url => {
                    const prefix = process.env.BLOB_BASE_URL;
                    if (prefix && !url.startsWith('http')) {
                        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
                        const isS3Key = cleanUrl.startsWith('public/') || 
                                        cleanUrl.startsWith('protected/') || 
                                        (cleanUrl.startsWith('private/') && cleanUrl.includes(':'));
                        if (isS3Key) {
                            return url;
                        }
                        const cleanPrefix = prefix.endsWith('/') ? prefix.substring(0, prefix.length - 1) : prefix;
                        return `${cleanPrefix}/${cleanUrl}`;
                    }
                    return url;
                }),
                otherLocation: r.location_other || ""
            };
        });

        res.json(mapped);
    } catch (err) {
        next(err);
    }
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

        const existingUser = await prisma.users.findUnique({
            where: { email },
            select: { id: true }
        });

        if (existingUser) {
            return res.status(400).json({
                error: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'analyst'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        res.status(201).json({
            message: "Registration successful",
            user
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

        const user = await prisma.users.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({
                error: "Invalid credentials"
            });
        }

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
   Routes (users)
============================ */
app.use("/api/users", usersRoutes);

/* ============================
   In-memory mock API (optional)
   If USE_IN_MEMORY_API=true the server will expose demo endpoints
   at the same /api/... paths instead of mounting the DB-backed routes.
============================ */
if (process.env.USE_IN_MEMORY_API === 'true') {
    // Simple auth middleware used by the frontend (expects Authorization: Bearer <token>)
    function requireAuth(req, res, next) {
        const auth = req.headers.authorization;
        if (!auth) return res.status(401).json({ error: "Unauthorized" });
        // Optionally verify JWT if desired
        const token = auth.split(" ")[1];
        try {
            // try verify against JWT_SECRET, but don't fail on verification errors for dev
            const payload = jwt.verify(token, JWT_SECRET);
            req.user = payload;
        } catch (e) {
            // token invalid — continue but set token info anyway for compatibility
            req.user = null;
        }
        req.token = token || null;
        next();
    }

    // In-memory stores for demo/dev
    const reports = new Map();
    const drafts = new Map(); // drafts keyed by `${id}:${revision}`

    // Helper to create a sample report
    function makeReport(idNum) {
        const id = `rep-${idNum}`;
        return {
            id,
            reportId: id,
            latestVersion: 1,
            combinedReport: false,
            categories: ["security", "theft"].slice(0, (idNum % 2) + 1),
            incidentLocation: { region: `Region ${((idNum - 1) % 3) + 1}`, zone: `Zone ${idNum}`, woreda: `Woreda ${idNum}` },
            incidentGps: { lat: 8.98 + idNum * 0.001, lon: 38.76 + idNum * 0.001 },
            incidentDateTime: new Date(Date.now() - idNum * 86400000).toISOString(),
            severity: ["low", "medium", "high"][idNum % 3],
            status: idNum % 2 === 0 ? "draft" : "published",
            created_at: new Date(Date.now() - idNum * 3600000).toISOString(),
            updated_at: new Date().toISOString(),
            title: `Sample report ${idNum}`,
            summary: `Summary for report ${idNum}`,
        };
    }

    // seed sample reports
    for (let i = 1; i <= 42; i++) {
        const r = makeReport(i);
        reports.set(r.id, r);
    }

    // In-memory student store
    const students = new Map();
    const mockNames = [
        "Abebe Bekele", "Aster Awoke", "Almaz Tafese", "Dawit Lema", "Yosef Assefa",
        "Solomon Tekle", "Kidist Tilahun", "Helen Berhe", "Bereket Desta", "Tariku Mulugeta",
        "Selam Kebede", "Tsion Hailu", "Hana Girma", "Abel Tesfaye", "Elias Wolde",
        "Martha Daniel", "Tigist Getachew", "Usmael Kedir", "Melkamu Alemu", "Biniam Yosef"
    ];
    const mockDepts = [
        "Computer Science", "Software Engineering", "Electrical Engineering", 
        "Information Systems", "Mechanical Engineering"
    ];

    for (let i = 1; i <= 20; i++) {
        const name = mockNames[i - 1];
        const studentId = `STU${10000 + i}`;
        const email = `${name.toLowerCase().replace(" ", ".")}@kewars.edu`;
        const department = mockDepts[(i - 1) % mockDepts.length];
        const classYear = ((i - 1) % 5) + 1; // 1 to 5
        const status = i % 8 === 0 ? "inactive" : "active"; // mostly active
        
        students.set(i, {
            id: i,
            student_id: studentId,
            name,
            email,
            department,
            class_year: classYear,
            status,
            created_at: new Date(Date.now() - i * 86400000 * 5).toISOString()
        });
    }

    // Utility: build aggregations for facets used by frontend
    function buildAggregations(list) {
        const aggs = {
            byRegion: {},
            categories: {},
            status: {},
            incidentDateTime: {},
            severity: {},
        };

        list.forEach((r) => {
            const region = r.incidentLocation?.region || "Unknown";
            aggs.byRegion[region] = (aggs.byRegion[region] || 0) + 1;

            (r.categories || []).forEach((c) => (aggs.categories[c] = (aggs.categories[c] || 0) + 1));

            aggs.status[r.status] = (aggs.status[r.status] || 0) + 1;

            const severity = r.severity || "unknown";
            aggs.severity[severity] = (aggs.severity[severity] || 0) + 1;

            if (r.incidentDateTime) {
                const year = new Date(r.incidentDateTime).toISOString().substring(0, 4);
                aggs.incidentDateTime[year] = (aggs.incidentDateTime[year] || 0) + 1;
            }
        });

        // convert to arrays similar to Elasticsearch aggregations used by frontend
        const toBuckets = (obj) =>
            Object.entries(obj).map(([key, count]) => ({ key, doc_count: count }));

        return {
            byRegion: toBuckets(aggs.byRegion),
            categories: toBuckets(aggs.categories),
            status: toBuckets(aggs.status),
            incidentDateTime: toBuckets(aggs.incidentDateTime),
            severity: toBuckets(aggs.severity),
        };
    }

    // ---------------- SEARCH REPORTS ----------------
    // POST /api/search/reports
    // Body: { page, resultsPerPage, filters, sortField, sortDirection }
    app.post("/api/search/reports", requireAuth, (req, res) => {
        try {
            const { page = 1, resultsPerPage = 10, filters = [], sortField, sortDirection } = req.body || {};

            // start from all reports (excluding rejected reports)
            let list = Array.from(reports.values()).filter(r => r.status !== 'rejected');

            // apply simple filters (filters format: [{ field, values: [...], type: "any" }])
            filters.forEach((f) => {
                const field = f.field;
                const values = field === "status" ? (f.values || []).filter(v => v !== 'rejected') : (f.values || []);
                if (!values.length) return;

                if (field === "incidentDateTime") {
                    list = list.filter((r) => {
                        if (!r.incidentDateTime) return false;
                        const year = new Date(r.incidentDateTime).toISOString().substring(0, 4);
                        return values.includes(year);
                    });
                    return;
                }

                list = list.filter((r) => {
                    const val = (function getField(obj, fld) {
                        // support dotted fields loosely
                        if (!obj) return undefined;
                        if (fld.includes(".")) {
                            return fld.split(".").reduce((acc, p) => (acc ? acc[p] : undefined), obj);
                        }
                        return obj[fld];
                    })(r, field);
                    if (Array.isArray(val)) return values.some((v) => val.includes(v));
                    if (typeof val === "string") return values.includes(val);
                    return values.includes(String(val));
                });
            });

            // simple sorting
            if (sortField) {
                list.sort((a, b) => {
                    const va = a[sortField];
                    const vb = b[sortField];
                    if (va == null && vb == null) return 0;
                    if (va == null) return 1;
                    if (vb == null) return -1;
                    if (sortDirection === "desc") return va < vb ? 1 : va > vb ? -1 : 0;
                    return va > vb ? 1 : va < vb ? -1 : 0;
                });
            }

            const total = list.length;
            const start = (page - 1) * resultsPerPage;
            const results = list.slice(start, start + resultsPerPage);

            const aggregations = buildAggregations(Array.from(reports.values()).filter(r => r.status !== 'rejected'));

            // Return results; frontend will map id differently as needed
            return res.json({
                results,
                total,
                aggregations,
            });
        } catch (err) {
            console.error("search error", err);
            return res.status(500).json({ error: "Search failed" });
        }
    });

    // ---------------- GET REPORT DETAIL ----------------
    // GET /api/reports/:id  -> { latest: <report> }
    app.get("/api/reports/:id", requireAuth, (req, res) => {
        const { id } = req.params;
        const r = reports.get(id);
        if (!r) return res.status(404).json({ error: "Not found" });
        return res.json({ latest: r });
    });

    // ---------------- GET DRAFT ----------------
    // GET /api/reports/:id/drafts?revision=<n>
    // returns a draft object (200) or 204 if none
    app.get("/api/reports/:id/drafts", requireAuth, (req, res) => {
        const { id } = req.params;
        const { revision } = req.query;
        const key = `${id}:${revision}`;
        const d = drafts.get(key);
        if (!d) return res.status(204).send();
        return res.json(d);
    });

    // ---------------- SAVE DRAFT ----------------
    // POST /api/reports/:id/drafts
    // body: { report }
    app.post("/api/reports/:id/drafts", requireAuth, (req, res) => {
        const { id } = req.params;
        const { report } = req.body || {};
        if (!report) return res.status(400).json({ error: "Missing report" });

        // Use provided latestVersion as base; if absent derive from stored report
        const base = reports.get(id);
        const baseVersion = (report.latestVersion || base?.latestVersion || 1);
        const newRevision = baseVersion + 1;

        const key = `${id}:${baseVersion}`;
        const draftToStore = { ...report, latestVersion: newRevision, draftSavedAt: new Date().toISOString() };
        drafts.set(key, draftToStore);

        return res.status(201).json({ message: "Draft saved", draft: draftToStore });
    });

    // ---------------- UPDATE / PUBLISH / REJECT ----------------
    // PUT /api/reports/:id
    // body: { report, status }
    app.put("/api/reports/:id", requireAuth, (req, res) => {
        const { id } = req.params;
        const { report, status } = req.body || {};
        const existing = reports.get(id);

        if (!existing && !report) return res.status(404).json({ error: "Not found" });

        const updated = {
            ...(existing || {}),
            ...(report || {}),
            id,
            status: status || (report && report.status) || existing?.status || "draft",
            updated_at: new Date().toISOString(),
            latestVersion: (report && report.latestVersion) || (existing && existing.latestVersion) || 1,
        };

        // if publishing or rejecting, ensure latestVersion increments
        if (status === "published" || status === "rejected") {
            updated.latestVersion = (existing?.latestVersion || 1) + 1;
        }

        reports.set(id, updated);
        return res.json(updated);
    });

    // ---------------- DELETE REPORT ----------------
    // DELETE /api/reports/:id
    app.delete("/api/reports/:id", requireAuth, (req, res) => {
        const { id } = req.params;
        // Check role - check if user.role === 'admin'
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: "Forbidden: Admins only" });
        }
        const reportId = id.startsWith('rep-') ? id : `rep-${id}`;
        const rawId = id.replace('rep-', '');
        
        // Remove from reports
        reports.delete(reportId);
        reports.delete(rawId);
        
        // Also remove any drafts for this report
        for (const [key, val] of drafts.entries()) {
            if (key.startsWith(`${reportId}:`) || key.startsWith(`${rawId}:`)) {
                drafts.delete(key);
            }
        }
        
        return res.json({ message: "Report deleted successfully" });
    });

    // ---------------- SEARCH STUDENTS ----------------
    // POST /api/students/search
    app.post("/api/students/search", requireAuth, (req, res) => {
        try {
            const { page = 1, size = 10, query = "", department = "All", class_year = "All", status = "All" } = req.body || {};
            let list = Array.from(students.values());

            // Search query filter (matches name or student_id)
            if (query) {
                const q = query.toLowerCase();
                list = list.filter((s) => 
                    s.name.toLowerCase().includes(q) || 
                    s.student_id.toLowerCase().includes(q)
                );
            }

            // Department filter
            if (department && department !== "All") {
                list = list.filter((s) => s.department === department);
            }

            // Class year filter
            if (class_year && class_year !== "All") {
                list = list.filter((s) => s.class_year === parseInt(class_year, 10));
            }

            // Status filter
            if (status && status !== "All") {
                list = list.filter((s) => s.status === status);
            }

            // Sort by created_at desc
            list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const total = list.length;
            const start = (page - 1) * size;
            const paginated = list.slice(start, start + size);

            return res.json({
                students: paginated,
                total
            });
        } catch (err) {
            console.error("Mock search students error", err);
            return res.status(500).json({ error: "Search failed" });
        }
    });

    // ---------------- ENROLL STUDENT ----------------
    // POST /api/students
    app.post("/api/students", requireAuth, (req, res) => {
        try {
            const { student_id, name, email, department, class_year, status = "active" } = req.body || {};

            if (!student_id || !name || !department || !class_year) {
                return res.status(400).json({ error: "Student ID, Name, Department, and Class Year are required" });
            }

            // Check uniqueness
            const exists = Array.from(students.values()).some((s) => s.student_id.toLowerCase() === student_id.toLowerCase());
            if (exists) {
                return res.status(400).json({ error: "A student with this Student ID is already enrolled." });
            }

            const newId = Math.max(...Array.from(students.keys()), 0) + 1;
            const newStudent = {
                id: newId,
                student_id: student_id.trim(),
                name: name.trim(),
                email: email ? email.trim() : null,
                department,
                class_year: parseInt(class_year, 10),
                status,
                created_at: new Date().toISOString()
            };

            students.set(newId, newStudent);
            return res.status(201).json({ message: "Student enrolled successfully", student: newStudent });
        } catch (err) {
            console.error("Mock enroll student error", err);
            return res.status(500).json({ error: "Enrollment failed" });
        }
    });

    // ---------------- TOGGLE STUDENT STATUS ----------------
    // PUT /api/students/:id/status
    app.put("/api/students/:id/status", requireAuth, (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            const { status } = req.body || {};

            if (!status) {
                return res.status(400).json({ error: "Status is required" });
            }

            const student = students.get(id);
            if (!student) {
                return res.status(404).json({ error: "Student not found" });
            }

            student.status = status;
            students.set(id, student);

            return res.json({ message: `Student status updated to ${status}`, student });
        } catch (err) {
            console.error("Mock student status error", err);
            return res.status(500).json({ error: "Update failed" });
        }
    });

    // health endpoint specific to mock API
    app.get("/api/health", (req, res) => res.json({ ok: true }));

    // Serve React app build (if present)
    const webBuildPath = path.join(__dirname, "..", "web", "build");
    app.use(express.static(webBuildPath));
  app.get(/.*/, (req, res, next) => {
         // Only serve index.html for non-API routes
         if (req.path.startsWith("/api/")) return next();
         res.sendFile(path.join(webBuildPath, "index.html"), (err) => {
             if (err) next();
         });
     });

} else {
     // Forward search request to reportRoutes with the correct subpath
     app.post("/api/search/reports", (req, res, next) => {
         req.url = "/search/reports";
         reportsRoutes(req, res, next);
     });

     // Use DB-backed reports routes when not using in-memory mock
     app.use("/api/reports", reportsRoutes);

     // Use DB-backed students routes when not using in-memory mock
     app.use("/api/students", studentsRoutes);
 
     // Serve React build when available
     const webBuildPath = path.join(__dirname, "..", "web", "build");
     app.use(express.static(webBuildPath));
    app.get(/.*/, (req, res, next) => {
         if (req.path.startsWith("/api/")) return next();
         res.sendFile(path.join(webBuildPath, "index.html"), (err) => {
             if (err) next();
         });
     });
 }


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
   Start Server (local only)
============================ */
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel serverless runtime
export default app;
