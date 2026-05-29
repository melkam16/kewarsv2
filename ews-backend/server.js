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
    origin: "http://localhost:3000",
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
            where: { status: "published" },
            orderBy: { incident_datetime: "desc" }
        });

        const mapped = publishedReports.map((r) => {
            const data = r.data || {};
            return {
                id: r.id,
                title: data.title || r.title || `Report ${r.id}`,
                description: data.description || r.description || "",
                incidentDateTime: r.incident_datetime ? r.incident_datetime.toISOString() : (data.incidentDateTime || new Date().toISOString()),
                region: r.region || data.incidentLocation?.region || "",
                zone: r.zone || data.incidentLocation?.zone || "",
                woreda: r.woreda || data.incidentLocation?.woreda || "",
                severity: r.severity || data.severity || "low",
                categories: r.categories || data.categories || [],
                incidentGps: data.incidentGps || null,
                mediaFiles: data.mediaFiles || [],
                otherLocation: data.incidentLocation?.other || ""
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

    // Utility: build aggregations for facets used by frontend
    function buildAggregations(list) {
        const aggs = {
            byRegion: {},
            categories: {},
            status: {},
            incidentDateTime: {}, // can be empty or buckets by year/month
            severity: {},
        };

        list.forEach((r) => {
            const region = r.incidentLocation?.region || "Unknown";
            aggs.byRegion[region] = (aggs.byRegion[region] || 0) + 1;

            (r.categories || []).forEach((c) => (aggs.categories[c] = (aggs.categories[c] || 0) + 1));

            aggs.status[r.status] = (aggs.status[r.status] || 0) + 1;

            const severity = r.severity || "unknown";
            aggs.severity[severity] = (aggs.severity[severity] || 0) + 1;
        });

        // convert to arrays similar to Elasticsearch aggregations used by frontend
        const toBuckets = (obj) =>
            Object.entries(obj).map(([key, count]) => ({ key, doc_count: count }));

        return {
            byRegion: toBuckets(aggs.byRegion),
            categories: toBuckets(aggs.categories),
            status: toBuckets(aggs.status),
            incidentDateTime: [], // not aggregated here
            severity: toBuckets(aggs.severity),
        };
    }

    // ---------------- SEARCH REPORTS ----------------
    // POST /api/search/reports
    // Body: { page, resultsPerPage, filters, sortField, sortDirection }
    app.post("/api/search/reports", requireAuth, (req, res) => {
        try {
            const { page = 1, resultsPerPage = 10, filters = [], sortField, sortDirection } = req.body || {};

            // start from all reports
            let list = Array.from(reports.values());

            // apply simple filters (filters format: [{ field, values: [...], type: "any" }])
            filters.forEach((f) => {
                const field = f.field;
                const values = f.values || [];
                if (!values.length) return;
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

            const aggregations = buildAggregations(Array.from(reports.values()));

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
   Start Server
============================ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
