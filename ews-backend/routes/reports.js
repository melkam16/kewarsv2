import express from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

const getDbId = (id) => {
    if (typeof id === 'string' && id.startsWith('rep-')) {
        return parseInt(id.replace('rep-', ''));
    }
    return parseInt(id);
};

// POST /api/search/reports
router.post("/search/reports", authenticate(), async (req, res) => {
    const {
        page = 1,
        resultsPerPage = 10,
        filters = [],
    } = req.body;

    const offset = (page - 1) * resultsPerPage;

    try {
        // -----------------------------
        // BUILD PRISMA WHERE OBJECT
        // -----------------------------
        const where = {};
        filters.forEach((filter) => {
            if (!filter.field || !filter.values || !filter.values.length) return;

            if (filter.type === "any") {
                if (filter.field === "categories") {
                    where[filter.field] = { hasSome: filter.values };
                } else {
                    where[filter.field] = { in: filter.values };
                }
            }
        });

        // -----------------------------
        // BUILD RAW SQL WHERE CLAUSE FOR AGGREGATIONS
        // -----------------------------
        let whereClauses = [];
        let sqlValues = [];
        let paramIndex = 1;

        filters.forEach((filter) => {
            if (!filter.field || !filter.values || !filter.values.length) return;

            if (filter.type === "any") {
                whereClauses.push(`${filter.field} = ANY($${paramIndex})`);
                sqlValues.push(filter.values);
                paramIndex++;
            }
        });

        const whereSQL = whereClauses.length
            ? `WHERE ${whereClauses.join(" AND ")}`
            : "";

        // -----------------------------
        // GET RESULTS & TOTAL
        // -----------------------------
        let results = [];
        let total = 0;

        if (resultsPerPage > 0) {
            results = await prisma.reports.findMany({
                where,
                orderBy: {
                    created_at: 'desc'
                },
                take: resultsPerPage,
                skip: offset
            });

            total = await prisma.reports.count({
                where
            });
        }

        // -----------------------------
        // AGGREGATIONS (PostgreSQL Raw SQL for Performance & Date/Array Manipulation)
        // -----------------------------

        // Incident Date (monthly)
        const incidentAgg = await prisma.$queryRawUnsafe(`
            SELECT TO_CHAR(incident_datetime, 'YYYY-MM') AS key, COUNT(*)::int AS doc_count
            FROM reports ${whereSQL} GROUP BY key ORDER BY key
        `, ...sqlValues);

        // By Region
        const regionAgg = await prisma.$queryRawUnsafe(`
            SELECT region AS key, COUNT(*)::int AS doc_count
            FROM reports ${whereSQL} GROUP BY region ORDER BY doc_count DESC
        `, ...sqlValues);

        // By Status
        const statusAgg = await prisma.$queryRawUnsafe(`
            SELECT status AS key, COUNT(*)::int AS doc_count
            FROM reports ${whereSQL} GROUP BY status ORDER BY doc_count DESC
        `, ...sqlValues);

        // By Categories (array column)
        const categoryAgg = await prisma.$queryRawUnsafe(`
            SELECT unnest(categories) AS key, COUNT(*)::int AS doc_count
            FROM reports ${whereSQL} GROUP BY key ORDER BY doc_count DESC
        `, ...sqlValues);

        // By Severity
        const severityAgg = await prisma.$queryRawUnsafe(`
            SELECT severity AS key, COUNT(*)::int AS doc_count
            FROM reports ${whereSQL} GROUP BY severity ORDER BY doc_count DESC
        `, ...sqlValues);

        // Helper to map and convert BigInt values safely to Numbers
        const formatBuckets = (rows) => (rows || []).map(r => ({
            key: r.key,
            doc_count: typeof r.doc_count === 'bigint' ? Number(r.doc_count) : Number(r.doc_count || 0)
        }));

        // -----------------------------
        // FORMAT RESPONSE
        // -----------------------------
        res.json({
            results,
            total,
            aggregations: {
                incidentDateTime: { buckets: formatBuckets(incidentAgg) },
                byRegion: { buckets: formatBuckets(regionAgg) },
                status: { buckets: formatBuckets(statusAgg) },
                categories: { buckets: formatBuckets(categoryAgg) },
                severity: { buckets: formatBuckets(severityAgg) },
            },
        });
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ message: "Error searching reports" });
    }
});

// POST /api/reports
router.post("/", authenticate(), async (req, res) => {
    const { report } = req.body || {};
    if (!report) return res.status(400).json({ error: "Missing report" });

    try {
        const newReport = await prisma.reports.create({
            data: {
                incident_datetime: report.incidentDateTime ? new Date(report.incidentDateTime) : null,
                region: report.incidentLocation?.region || null,
                zone: report.incidentLocation?.zone || null,
                woreda: report.incidentLocation?.woreda || null,
                status: report.status || "draft",
                severity: report.severity || null,
                categories: report.categories || [],
                data: {}
            }
        });

        const reportData = {
            ...report,
            id: newReport.id,
            reportId: `rep-${newReport.id}`,
            status: newReport.status,
            latestVersion: 1,
            created_at: newReport.created_at,
        };

        const updatedReport = await prisma.reports.update({
            where: { id: newReport.id },
            data: {
                data: reportData
            }
        });

        res.status(201).json(updatedReport.data);
    } catch (err) {
        console.error("Create Report Error:", err);
        res.status(500).json({ error: "Server error creating report" });
    }
});

// GET /api/reports/:id
router.get("/:id", authenticate(), async (req, res) => {
    const { id } = req.params;
    try {
        const report = await prisma.reports.findUnique({
            where: { id: getDbId(id) }
        });

        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        const reportData = {
            ...(report.data || {}),
            id: report.id,
            reportId: `rep-${report.id}`,
            incident_datetime: report.incident_datetime,
            region: report.region,
            zone: report.zone,
            woreda: report.woreda,
            status: report.status,
            severity: report.severity,
            categories: report.categories,
            created_at: report.created_at,
        };

        // Ensure critical fields are set for validation
        reportData.latestVersion = reportData.latestVersion || 1;
        reportData.combinedReport = reportData.combinedReport || false;

        res.json({ latest: reportData });
    } catch (err) {
        console.error("Fetch Report Detail Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /api/reports/:id/drafts
router.get("/:id/drafts", authenticate(), async (req, res) => {
    const { id } = req.params;
    const { revision } = req.query;

    try {
        const draft = await prisma.drafts.findUnique({
            where: {
                report_id_revision: {
                    report_id: getDbId(id),
                    revision: parseInt(revision)
                }
            }
        });

        if (!draft) {
            return res.status(204).send();
        }

        res.json(draft.data);
    } catch (err) {
        console.error("Fetch Draft Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/reports/:id/drafts
router.post("/:id/drafts", authenticate(), async (req, res) => {
    const { id } = req.params;
    const { report } = req.body || {};
    if (!report) return res.status(400).json({ error: "Missing report" });

    try {
        const base = await prisma.reports.findUnique({
            where: { id: getDbId(id) }
        });

        const baseVersion = parseInt(report.latestVersion || base?.data?.latestVersion || 1);
        const newRevision = baseVersion + 1;

        const draftToStore = {
            ...report,
            latestVersion: newRevision,
            draftSavedAt: new Date().toISOString()
        };

        await prisma.drafts.upsert({
            where: {
                report_id_revision: {
                    report_id: getDbId(id),
                    revision: baseVersion
                }
            },
            create: {
                report_id: getDbId(id),
                revision: baseVersion,
                data: draftToStore
            },
            update: {
                data: draftToStore
            }
        });

        res.status(201).json({ message: "Draft saved", draft: draftToStore });
    } catch (err) {
        console.error("Save Draft Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// PUT /api/reports/:id
router.put("/:id", authenticate(), async (req, res) => {
    const { id } = req.params;
    const { report, status } = req.body || {};

    try {
        const existing = await prisma.reports.findUnique({
            where: { id: getDbId(id) }
        });

        if (!existing && !report) {
            return res.status(404).json({ error: "Report not found" });
        }

        const existingData = existing?.data || {};
        const newStatus = status || report?.status || existing?.status || "draft";
        let newVersion = parseInt(report?.latestVersion || existingData.latestVersion || 1);

        if (status === "published" || status === "rejected") {
            newVersion = parseInt(existingData.latestVersion || 1) + 1;
        }

        const updatedData = {
            ...(existingData),
            ...(report || {}),
            id: getDbId(id),
            reportId: `rep-${id}`,
            status: newStatus,
            latestVersion: newVersion,
            updated_at: new Date().toISOString()
        };

        await prisma.reports.update({
            where: { id: getDbId(id) },
            data: {
                status: newStatus,
                severity: report?.severity || existing?.severity,
                region: report?.incidentLocation?.region || existing?.region,
                zone: report?.incidentLocation?.zone || existing?.zone,
                woreda: report?.incidentLocation?.woreda || existing?.woreda,
                incident_datetime: report?.incidentDateTime ? new Date(report.incidentDateTime) : existing?.incident_datetime,
                categories: report?.categories || existing?.categories || [],
                data: updatedData
            }
        });

        res.json(updatedData);
    } catch (err) {
        console.error("Update Report Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;