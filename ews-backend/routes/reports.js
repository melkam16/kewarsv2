import express from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma.js';
import crypto from 'crypto';
import { put } from '@vercel/blob';

const router = express.Router();

const getDbId = (id) => {
    if (typeof id === 'string' && id.startsWith('rep-')) {
        return id.replace('rep-', '');
    }
    return id;
};

// -------------------------------------------------------------
// MAPPER UTILITIES: Flat DB <=> Nested Frontend JSON
// -------------------------------------------------------------
const isValidUuid = (str) => {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

async function translateText(text) {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=am&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(s => s[0]).join('');
    }
  } catch (err) {
    console.error("Auto-translation failed:", err);
  }
  return text;
}

function dbReportToFrontendReport(db) {
  if (!db) return null;
  return {
    id: db.report_id,
    reportId: db.report_id,
    revision: db.revision,
    status: db.status,
    severity: db.severity,
    title: db.title,
    description: db.description,
    titleEn: db.title_en,
    descriptionEn: db.description_en,
    notes: db.notes,
    eyewitness: db.eyewitness,
    hasMedia: db.has_media,
    latestVersion: db.latest_version,
    reportDateTime: db.report_date_time ? db.report_date_time.toISOString() : null,
    incidentDateTime: db.incident_date_time ? db.incident_date_time.toISOString() : null,
    updateTimestamp: db.update_timestamp ? db.update_timestamp.toISOString() : null,
    incidentLocation: {
      woreda: db.woreda,
      zone: db.zone,
      region: db.region,
      other: db.location_other
    },
    incidentLocationInferred: db.incident_location_inferred,
    isLocationManual: db.is_location_manual,
    incidentGps: db.latitude && db.longitude ? {
      lat: Number(db.latitude),
      lon: Number(db.longitude)
    } : null,
    gpsCalculated: db.gps_calculated,
    reporter: db.reporter_sub ? {
      name: db.reporter_name,
      sub: db.reporter_sub
    } : null,
    analyst: db.analyst_sub ? {
      name: db.analyst_name,
      sub: db.analyst_sub
    } : null,
    categories: db.categories || [],
    mediaFiles: db.media_files || [],
    mediaFilesMime: db.media_files_mime || []
  };
}

function frontendReportToDbReport(fe) {
  if (!fe) return null;

  let reportId = fe.reportId || fe.id;
  if (typeof reportId === 'string' && reportId.startsWith('rep-')) {
    reportId = reportId.replace('rep-', '');
  }
  if (!isValidUuid(reportId)) {
    reportId = crypto.randomUUID();
  }

  return {
    report_id: reportId,
    revision: fe.revision ? String(fe.revision) : 'draft',
    status: fe.status || 'draft',
    severity: fe.severity || null,
    title: fe.title || null,
    description: fe.description || null,
    title_en: fe.titleEn || null,
    description_en: fe.descriptionEn || null,
    notes: fe.notes || null,
    eyewitness: fe.eyewitness !== undefined ? fe.eyewitness : null,
    has_media: fe.hasMedia !== undefined ? fe.hasMedia : (fe.mediaFiles && fe.mediaFiles.length > 0),
    latest_version: fe.latestVersion ? Number(fe.latestVersion) : null,
    report_date_time: fe.reportDateTime ? new Date(fe.reportDateTime) : null,
    incident_date_time: fe.incidentDateTime ? new Date(fe.incidentDateTime) : null,
    update_timestamp: new Date(),
    woreda: fe.incidentLocation?.woreda || null,
    zone: fe.incidentLocation?.zone || null,
    region: fe.incidentLocation?.region || null,
    location_other: fe.incidentLocation?.other || null,
    is_location_manual: fe.isLocationManual !== undefined ? fe.isLocationManual : null,
    incident_location_inferred: fe.incidentLocationInferred !== undefined ? fe.incidentLocationInferred : null,
    latitude: fe.incidentGps?.lat ? parseFloat(fe.incidentGps.lat) : null,
    longitude: fe.incidentGps?.lon ? parseFloat(fe.incidentGps.lon) : null,
    gps_calculated: fe.gpsCalculated !== undefined ? fe.gpsCalculated : null,
    reporter_name: fe.reporter?.name || null,
    reporter_sub: isValidUuid(fe.reporter?.sub) ? fe.reporter.sub : null,
    analyst_name: fe.analyst?.name || null,
    analyst_sub: isValidUuid(fe.analyst?.sub) ? fe.analyst.sub : null,
    categories: fe.categories || [],
    media_files: fe.mediaFiles || [],
    media_files_mime: fe.mediaFilesMime || []
  };
}

// POST /api/search/reports
router.post("/search/reports", authenticate(), async (req, res) => {
    const {
        page = 1,
        resultsPerPage = 10,
        filters = [],
    } = req.body;

    const offset = (page - 1) * resultsPerPage;

    try {
        // -------------------------------------------------------------
        // 1. BUILD PRISMA WHERE FILTER
        // -------------------------------------------------------------
        const where = {};
        filters.forEach((filter) => {
            if (!filter.field || !filter.values || !filter.values.length) return;

            let dbField = filter.field;
            if (dbField === "byRegion") dbField = "region";
            if (dbField === "incidentDateTime") dbField = "incident_date_time";

            if (dbField === "incident_date_time") {
                const cleanValues = filter.values.filter(v => typeof v === 'string' && v.includes('-'));
                const orConditions = cleanValues.map(val => {
                    const [year, month] = val.split('-').map(Number);
                    const startDate = new Date(Date.UTC(year, month - 1, 1));
                    const endDate = new Date(Date.UTC(year, month, 1));
                    return {
                        incident_date_time: {
                            gte: startDate,
                            lt: endDate
                        }
                    };
                });
                if (orConditions.length > 0) {
                    if (!where.OR) where.OR = [];
                    where.OR.push(...orConditions);
                }
                return;
            }

            if (filter.type === "any") {
                const cleanValues = filter.values.filter(v => v !== null && v !== undefined);
                if (cleanValues.length > 0) {
                    if (dbField === "categories") {
                        where[dbField] = { hasSome: cleanValues };
                    } else {
                        where[dbField] = { in: cleanValues };
                    }
                }
            }
        });

        // -------------------------------------------------------------
        // 2. FETCH MATCHING REVISIONS
        // -------------------------------------------------------------
        const allMatching = await prisma.reports.findMany({
            where,
            orderBy: {
                update_timestamp: 'desc'
            }
        });

        // -------------------------------------------------------------
        // 3. GROUP AND SELECT LATEST ACTIVE REVISION PER REPORT
        // -------------------------------------------------------------
        const groupedMap = new Map();
        for (const r of allMatching) {
            const existing = groupedMap.get(r.report_id);
            if (!existing) {
                groupedMap.set(r.report_id, r);
            } else {
                // Draft takes priority
                if (r.revision === 'draft') {
                    groupedMap.set(r.report_id, r);
                } else if (existing.revision !== 'draft') {
                    // Pick the most recently modified revision
                    const existingTime = new Date(existing.update_timestamp || 0).getTime();
                    const rTime = new Date(r.update_timestamp || 0).getTime();
                    if (rTime > existingTime) {
                        groupedMap.set(r.report_id, r);
                    }
                }
            }
        }

        const latestReports = Array.from(groupedMap.values());

        // Sort by update_timestamp DESC overall
        latestReports.sort((a, b) => {
            const tA = new Date(a.update_timestamp || 0).getTime();
            const tB = new Date(b.update_timestamp || 0).getTime();
            return tB - tA;
        });

        const total = latestReports.length;
        const paginated = latestReports.slice(offset, offset + resultsPerPage);

        // -------------------------------------------------------------
        // 4. GENERATE FACET STATISTICS (AGGREGATIONS)
        // -------------------------------------------------------------
        const aggs = {
            incidentDateTime: {},
            byRegion: {},
            status: {},
            categories: {},
            severity: {}
        };

        latestReports.forEach((r) => {
            // Incident Date (monthly)
            if (r.incident_date_time) {
                const month = new Date(r.incident_date_time).toISOString().substring(0, 7); // "YYYY-MM"
                aggs.incidentDateTime[month] = (aggs.incidentDateTime[month] || 0) + 1;
            }

            // Region
            const region = r.region || "Unknown";
            aggs.byRegion[region] = (aggs.byRegion[region] || 0) + 1;

            // Status
            const status = r.status || "Unknown";
            aggs.status[status] = (aggs.status[status] || 0) + 1;

            // Severity
            const severity = r.severity || "Unknown";
            aggs.severity[severity] = (aggs.severity[severity] || 0) + 1;

            // Categories (array field)
            (r.categories || []).forEach((cat) => {
                aggs.categories[cat] = (aggs.categories[cat] || 0) + 1;
            });
        });

        const toBuckets = (obj) =>
            Object.entries(obj).map(([key, count]) => ({ key, doc_count: count }));

        // Format search result items to embed the old .data property for complete frontend compatibility
        const mappedResults = paginated.map(r => {
            const mapped = dbReportToFrontendReport(r);
            return {
                ...r,
                id: r.report_id,
                data: mapped
            };
        });

        // -----------------------------
        // FORMAT RESPONSE
        // -----------------------------
        res.json({
            results: mappedResults,
            total,
            aggregations: {
                incidentDateTime: { buckets: toBuckets(aggs.incidentDateTime) },
                byRegion: { buckets: toBuckets(aggs.byRegion) },
                status: { buckets: toBuckets(aggs.status) },
                categories: { buckets: toBuckets(aggs.categories) },
                severity: { buckets: toBuckets(aggs.severity) },
            },
        });
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ message: "Error searching reports" });
    }
});

// POST /api/reports (Create Report)
router.post("/", authenticate(), async (req, res) => {
    const { report } = req.body || {};
    if (!report) return res.status(400).json({ error: "Missing report" });

    try {
        const reportId = crypto.randomUUID();
        const status = report.status || "draft";
        const isDraft = status === "draft";
        const revision = isDraft ? "draft" : "1";

        const dbData = frontendReportToDbReport({
            ...report,
            reportId,
            revision,
            status,
            latestVersion: 1,
            reportDateTime: new Date().toISOString()
        });

        const newReport = await prisma.reports.create({
            data: dbData
        });

        res.status(201).json(dbReportToFrontendReport(newReport));
    } catch (err) {
        console.error("Create Report Error:", err);
        res.status(500).json({ error: "Server error creating report" });
    }
});

// GET /api/reports/:id (Fetch Report Detail)
router.get("/:id", authenticate(), async (req, res) => {
    const { id } = req.params;
    try {
        const reportId = getDbId(id);
        
        // Find the latest non-draft revision
        const report = await prisma.reports.findFirst({
            where: {
                report_id: reportId,
                NOT: { revision: 'draft' }
            },
            orderBy: {
                update_timestamp: 'desc'
            }
        });

        let targetReport = report;
        if (!targetReport) {
            // Fallback to draft if there are no published revisions yet
            const draftReport = await prisma.reports.findFirst({
                where: {
                    report_id: reportId,
                    revision: 'draft'
                }
            });
            if (!draftReport) {
                return res.status(404).json({ error: "Report not found" });
            }
            targetReport = draftReport;
        }

        const mapped = dbReportToFrontendReport(targetReport);
        if (mapped) {
            let autoTranslated = false;
            if (!mapped.titleEn && mapped.title) {
                mapped.titleEn = await translateText(mapped.title);
                autoTranslated = true;
            }
            if (!mapped.descriptionEn && mapped.description) {
                mapped.descriptionEn = await translateText(mapped.description);
                autoTranslated = true;
            }
            if (autoTranslated) {
                mapped.autoTranslated = true;
            }
        }

        res.json({ latest: mapped });
    } catch (err) {
        console.error("Fetch Report Detail Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET /api/reports/:id/drafts
router.get("/:id/drafts", authenticate(), async (req, res) => {
    const { id } = req.params;
    try {
        const reportId = getDbId(id);
        const draft = await prisma.reports.findUnique({
            where: {
                report_id_revision: {
                    report_id: reportId,
                    revision: 'draft'
                }
            }
        });

        if (!draft) {
            return res.status(204).send();
        }

        const mapped = dbReportToFrontendReport(draft);
        if (mapped) {
            let autoTranslated = false;
            if (!mapped.titleEn && mapped.title) {
                mapped.titleEn = await translateText(mapped.title);
                autoTranslated = true;
            }
            if (!mapped.descriptionEn && mapped.description) {
                mapped.descriptionEn = await translateText(mapped.description);
                autoTranslated = true;
            }
            if (autoTranslated) {
                mapped.autoTranslated = true;
            }
        }

        res.json(mapped);
    } catch (err) {
        console.error("Fetch Draft Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/reports/:id/drafts (Save Draft)
router.post("/:id/drafts", authenticate(), async (req, res) => {
    const { id } = req.params;
    const { report } = req.body || {};
    if (!report) return res.status(400).json({ error: "Missing report" });

    try {
        const reportId = getDbId(id);

        const dbData = frontendReportToDbReport({
            ...report,
            reportId,
            revision: 'draft',
            status: 'draft',
            updateTimestamp: new Date().toISOString()
        });

        const draft = await prisma.reports.upsert({
            where: {
                report_id_revision: {
                    report_id: reportId,
                    revision: 'draft'
                }
            },
            create: dbData,
            update: dbData
        });

        res.status(201).json({ message: "Draft saved", draft: dbReportToFrontendReport(draft) });
    } catch (err) {
        console.error("Save Draft Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// PUT /api/reports/:id (Update or Publish Report)
router.put("/:id", authenticate(), async (req, res) => {
    const { id } = req.params;
    const { report, status } = req.body || {};

    try {
        const reportId = getDbId(id);

        // Find the current latest numeric revision to know the base version
        const currentLatest = await prisma.reports.findFirst({
            where: {
                report_id: reportId,
                NOT: { revision: 'draft' }
            },
            orderBy: {
                update_timestamp: 'desc'
            }
        });

        const baseVersion = currentLatest ? Number(currentLatest.latest_version || 1) : 1;
        const newStatus = status || report?.status || currentLatest?.status || "draft";
        
        let newVersion = baseVersion;
        if (status === "published" || status === "rejected") {
            newVersion = baseVersion + 1;
        }

        const revisionStr = String(newVersion);

        const dbData = frontendReportToDbReport({
            ...(currentLatest ? dbReportToFrontendReport(currentLatest) : {}),
            ...(report || {}),
            reportId,
            revision: revisionStr,
            status: newStatus,
            latestVersion: newVersion,
            updateTimestamp: new Date().toISOString()
        });

        // Create the new revision row or update it if it somehow exists
        const updatedReport = await prisma.reports.upsert({
            where: {
                report_id_revision: {
                    report_id: reportId,
                    revision: revisionStr
                }
            },
            create: dbData,
            update: dbData
        });

        // If we published or rejected, we should delete the active working draft
        if (status === "published" || status === "rejected") {
            try {
                await prisma.reports.delete({
                    where: {
                        report_id_revision: {
                            report_id: reportId,
                            revision: 'draft'
                        }
                    }
                });
            } catch (e) {
                // Ignore if no draft existed
            }
        }

        // Also update the latest_version field on all older revisions of this report
        await prisma.reports.updateMany({
            where: { report_id: reportId },
            data: { latest_version: newVersion }
        });

        res.json(dbReportToFrontendReport(updatedReport));
    } catch (err) {
        console.error("Update Report Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// POST /api/reports/upload (Upload file to Vercel Blob)
router.post("/upload", authenticate(), express.raw({ type: '*/*', limit: '20mb' }), async (req, res) => {
    try {
        const mimeType = req.headers['content-type'] || 'application/octet-stream';
        const filename = decodeURIComponent(req.headers['x-file-name'] || 'file');
        
        const fileBuffer = req.body;
        if (!fileBuffer || fileBuffer.length === 0) {
            return res.status(400).json({ error: "Empty file body" });
        }

        const uniqueFilename = `private/${Date.now()}-${filename}`;
        
        console.log(`Uploading ${filename} to Vercel Blob as ${uniqueFilename}...`);
        
        const blob = await put(uniqueFilename, fileBuffer, {
            access: 'private',
            contentType: mimeType,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log(`Uploaded successfully. URL: ${blob.url}`);

        res.json({ url: blob.url });
    } catch (err) {
        console.error("Vercel Blob Upload Error:", err);
        res.status(500).json({ error: "File upload failed", details: err.message });
    }
});

export default router;