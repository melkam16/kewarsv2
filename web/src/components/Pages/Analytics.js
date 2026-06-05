// src/components/Pages/Analytics.js
import React, { useState, useEffect, useContext } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Stack,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  TableChart as CsvIcon,
  DataObject as JsonIcon,
  Print as PrintIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  Category as CategoryIcon,
} from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import html2pdf from "html2pdf.js";

import config from "../../config";
import { AuthContext } from "../contexts/AuthContext";
import API_BASE from "../../api/apiBase";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);



export default function Analytics() {
  const { token, user } = useContext(AuthContext);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [reportLanguage, setReportLanguage] = useState("am");

  const getTitle = (r) => reportLanguage === "en" ? (r.titleEn || r.title) : r.title;
  const getDescription = (r) => reportLanguage === "en" ? (r.descriptionEn || r.description) : r.description;

  // Data States
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination State for Screen Table
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Chart Config States
  const [severityChart, setSeverityChart] = useState(null);
  const [categoryChart, setCategoryChart] = useState(null);

  const availableRegions = Object.keys(config.locations || {});
  const availableCategories = Object.keys(config.categories || {});

  const handleGenerateReport = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/reports/analytics`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDate || null,
          endDate: endDate || null,
          region: region || null,
          category: category || null,
          severity: severity || null,
          status: status || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to load analytics: ${res.statusText}`);
      }

      const data = await res.json();
      setReportData(data);
      prepareCharts(data.summary);
      setPage(0);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error generating report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      handleGenerateReport();
    }
  }, [token]);

  const prepareCharts = (summary) => {
    if (!summary) return;

    // 1. Severity Chart
    const sev = summary.severitySummary || {};
    setSeverityChart({
      labels: ["High", "Medium", "Low"],
      datasets: [
        {
          data: [sev.high || 0, sev.medium || 0, sev.low || 0],
          backgroundColor: ["#991b1b", "#ea580c", "#2563eb"],
          borderWidth: 0,
        },
      ],
    });

    // 2. Category Chart
    const cat = summary.categorySummary || {};
    const catLabels = Object.keys(cat);
    const catData = Object.values(cat);

    setCategoryChart({
      labels: catLabels.map(
        (c) => config.categories[c]?.label.en || c
      ),
      datasets: [
        {
          label: "Incident Types Count",
          data: catData,
          backgroundColor: "rgba(37, 99, 235, 0.6)",
          borderColor: "#2563eb",
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // DYNAMIC EXECUTIVE SUMMARY COMPILER
  const generateExecutiveSummary = (summary) => {
    if (!summary) return "";
    const total = summary.totalCount || 0;
    const high = summary.severitySummary?.high || 0;
    const medium = summary.severitySummary?.medium || 0;
    const low = summary.severitySummary?.low || 0;

    let regionsText = "";
    if (summary.regionSummary && Object.keys(summary.regionSummary).length > 0) {
      const sortedRegions = Object.entries(summary.regionSummary)
        .sort((a, b) => b[1] - a[1]);
      const topRegion = sortedRegions[0][0];
      const topCount = sortedRegions[0][1];
      regionsText = `The most active region in this assessment is ${config.locations[topRegion]?.label.en || topRegion} with ${topCount} reported incidents.`;
    }

    let categoriesText = "";
    if (summary.categorySummary && Object.keys(summary.categorySummary).length > 0) {
      const sortedCats = Object.entries(summary.categorySummary)
        .sort((a, b) => b[1] - a[1]);
      const topCat = sortedCats[0][0];
      const topCount = sortedCats[0][1];
      categoriesText = `The primary incident threat category is ${config.categories[topCat]?.label.en || topCat} (${topCount} occurrences).`;
    }

    return `This assessment aggregates and audits warning alerts collected within the specified parameters. A total of ${total} unique warnings were processed. The severity profile indicates ${high} high-level critical threats, ${medium} medium-level alerts, and ${low} low-level minor incidents. ${regionsText} ${categoriesText} The audited records are detailed below to facilitate targeted warning resources, humanitarian coordination, and strategic warning deployment.`;
  };

  // EXPORT UTILITIES
  const handleExportCSV = () => {
    if (!reportData || !reportData.reports.length) return;
    const headers = [
      "Report ID",
      "Title",
      "Status",
      "Severity",
      "Region",
      "Zone",
      "Woreda",
      "Incident Date",
      "Categories",
      "Reporter",
      "Created At",
    ];

    const rows = reportData.reports.map((r) => [
      r.id,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      r.status,
      r.severity,
      r.incidentLocation?.region || "",
      r.incidentLocation?.zone || "",
      r.incidentLocation?.woreda || "",
      r.incidentDateTime ? new Date(r.incidentDateTime).toLocaleDateString() : "",
      `"${(r.categories || []).join("; ")}"`,
      r.reporter?.name || "",
      r.reportDateTime ? new Date(r.reportDateTime).toLocaleDateString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `InternalReport_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (!reportData || !reportData.reports.length) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(reportData, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `InternalReport_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const element = document.querySelector(".print-only-section");
    if (!element) return;

    // Clone element to modify display for html2pdf rendering without showing on screen
    const cloned = element.cloneNode(true);
    cloned.classList.remove("print-only-section"); // Strip the hidden class so html2canvas renders the layout
    cloned.style.display = "block";
    cloned.style.position = "absolute";
    cloned.style.left = "-9999px";
    cloned.style.top = "-9999px";
    cloned.style.width = "800px";
    cloned.style.backgroundColor = "#ffffff";
    document.body.appendChild(cloned);

    const opt = {
      margin:       15,
      filename:     `InternalReport_${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().from(cloned).set(opt).save().then(() => {
      document.body.removeChild(cloned);
    });
  };

  const getSeverityColor = (sev) => {
    const s = sev?.toLowerCase();
    if (s === "high") return "error";
    if (s === "medium") return "warning";
    return "info";
  };

  const getStatusColor = (status) => {
    const st = status?.toLowerCase();
    if (st === "published") return "success";
    if (st === "rejected") return "warning";
    if (st === "unprocessed") return "info";
    return "default";
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Printable CSS Injection */}
      <style>
        {`
          @media screen {
            .print-only-section {
              display: none !important;
            }
          }
          @media print {
            body, html, #root {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            .no-print, nav, header, .MuiDrawer-root, .MuiAppBar-root {
              display: none !important;
            }
            main, [component="main"] {
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
            }
            .print-only-section {
              display: block !important;
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .avoid-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      {/* 1. SCREEN VIEW CONTAINER (NO-PRINT) */}
      <div className="no-print">
        {/* Header Block */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#111827",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <AssessmentIcon sx={{ fontSize: 36, color: "#2563eb" }} />
              Internal Report Generator
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Generate structured early warning reports and export records for auditing.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={!reportData}
              sx={{ borderRadius: "8px" }}
            >
              Download PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<CsvIcon />}
              onClick={handleExportCSV}
              disabled={!reportData || !reportData.reports.length}
              sx={{ borderRadius: "8px" }}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<JsonIcon />}
              onClick={handleExportJSON}
              disabled={!reportData || !reportData.reports.length}
              sx={{ borderRadius: "8px" }}
            >
              Export JSON
            </Button>
          </Stack>
        </Box>

        {/* Filter Controls Panel */}
        <Paper
          elevation={0}
          sx={{ p: 3, mb: 4, border: "1px solid #e5e7eb" }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* Start Date */}
            <Grid item xs={12} sm={6} md={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* End Date */}
            <Grid item xs={12} sm={6} md={1.5}>
              <TextField
                fullWidth
                size="small"
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Region */}
            <Grid item xs={12} sm={4} md={1.7}>
              <FormControl fullWidth size="small">
                <InputLabel id="region-label">Region</InputLabel>
                <Select
                  labelId="region-label"
                  value={region}
                  label="Region"
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Regions</em>
                  </MenuItem>
                  {availableRegions.map((reg) => (
                    <MenuItem key={reg} value={reg}>
                      {config.locations[reg]?.label.en || reg}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Category */}
            <Grid item xs={12} sm={4} md={1.7}>
              <FormControl fullWidth size="small">
                <InputLabel id="category-label">Incident Type</InputLabel>
                <Select
                  labelId="category-label"
                  value={category}
                  label="Incident Type"
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Types</em>
                  </MenuItem>
                  {availableCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {config.categories[cat]?.label.en || cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Severity */}
            <Grid item xs={12} sm={4} md={1.1}>
              <FormControl fullWidth size="small">
                <InputLabel id="severity-label">Severity</InputLabel>
                <Select
                  labelId="severity-label"
                  value={severity}
                  label="Severity"
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={4} md={1.2}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="unprocessed">Unprocessed</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Language Selection */}
            <Grid item xs={12} sm={4} md={1.8}>
              <FormControl fullWidth size="small">
                <InputLabel id="report-lang-label">Report Language</InputLabel>
                <Select
                  labelId="report-lang-label"
                  value={reportLanguage}
                  label="Report Language"
                  onChange={(e) => setReportLanguage(e.target.value)}
                >
                  <MenuItem value="am">Amharic (Default)</MenuItem>
                  <MenuItem value="en">English Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Action Run Button */}
            <Grid item xs={12} md={1} sx={{ textAlign: "right" }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleGenerateReport}
                disabled={loading}
                sx={{
                  bgcolor: "#2563eb",
                  "&:hover": { bgcolor: "#1d4ed8" },
                  borderRadius: "8px",
                  py: 1,
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Run"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Error notification banner */}
        {error && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#fef2f2", border: "1px solid #fca5a5" }}>
            <Typography color="error" variant="body2" sx={{ fontWeight: 600 }}>
              ⚠️ {error}
            </Typography>
          </Paper>
        )}

        {/* Empty-state info card */}
        {!reportData && !loading && (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              border: "1px solid #e5e7eb",
              bgcolor: "#ffffff",
              borderRadius: "12px",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#374151", mb: 1 }}>
              No Report Generated
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure your desired parameters above and click "Run" to compile early warning reports and download formatted documents.
            </Typography>
          </Paper>
        )}

        {/* Summary Metrics Cards */}
        {reportData && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid #e5e7eb",
                    borderLeft: "4px solid #2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>
                      Matching Warnings
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                      {reportData.summary.totalCount}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(37, 99, 235, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                    <AssessmentIcon />
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid #e5e7eb",
                    borderLeft: "4px solid #991b1b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>
                      Critical (High) Severity
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#991b1b" }}>
                      {reportData.summary.severitySummary.high || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(153, 27, 27, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#991b1b" }}>
                    <WarningIcon />
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid #e5e7eb",
                    borderLeft: "4px solid #059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>
                      Active Categories
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                      {Object.keys(reportData.summary.categorySummary || {}).length}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(5, 150, 105, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                    <CategoryIcon />
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: "1px solid #e5e7eb",
                    borderLeft: "4px solid #ea580c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>
                      Incident Regions
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                      {Object.keys(reportData.summary.regionSummary || {}).length}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "rgba(234, 88, 12, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ea580c" }}>
                    <LocationIcon />
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Metrics Charts row */}
            <Grid container spacing={3.5} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      Severity Distribution
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {severityChart && (
                      <Box sx={{ height: 260, display: "flex", justifyContent: "center" }}>
                        <Pie
                          data={severityChart}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: "bottom" } },
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      Incident Type Distribution
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {categoryChart && (
                      <Box sx={{ height: 260 }}>
                        <Bar
                          data={categoryChart}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { grid: { color: "rgba(0, 0, 0, 0.04)" } },
                              x: { grid: { display: false } },
                            },
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Screen details table */}
            <Card sx={{ border: "1px solid #e5e7eb" }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Report Listings Detail ({reportData.reports.length})
                  </Typography>
                </Box>
                <Divider />

                <TableContainer>
                  <Table sx={{ minWidth: 650 }} size="small">
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Region</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Zone / Woreda</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Categories</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Incident Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.reports
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((r, idx) => (
                          <TableRow key={r.id || idx} hover>
                            <TableCell sx={{ fontWeight: 600, color: "#1f2937" }}>
                              {getTitle(r) || `Report ${r.id}`}
                            </TableCell>
                            <TableCell>
                              {config.locations[r.incidentLocation?.region]?.label.en || r.incidentLocation?.region || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                {r.incidentLocation?.zone || "N/A"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {r.incidentLocation?.woreda || "N/A"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={r.severity || "low"}
                                size="small"
                                color={getSeverityColor(r.severity)}
                                sx={{ fontWeight: 700, textTransform: "uppercase", height: 20 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                                {(r.categories || []).map((cat, catIdx) => (
                                  <Chip
                                    key={catIdx}
                                    label={config.categories[cat]?.label.en || cat}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 600 }}
                                  />
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={r.status || "draft"}
                                size="small"
                                color={getStatusColor(r.status)}
                                variant="outlined"
                                sx={{ fontWeight: 600, height: 20 }}
                              />
                            </TableCell>
                            <TableCell>
                              {r.incidentDateTime ? new Date(r.incidentDateTime).toLocaleDateString() : "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={reportData.reports.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 2. PRINT-ONLY SECTION (COVER PAGE, EXECUTIVE SUMMARY, MAP CARDS) */}
      {reportData && (
        <div className="print-only-section">
          {/* A. Cover Page */}
          <Box 
            className="page-break" 
            sx={{ 
              height: "92vh", 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "space-between",
              p: 6,
              border: "12px double #1f2937",
              borderRadius: "8px",
              boxSizing: "border-box"
            }}
          >
            {/* Top Brand Info */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "10px",
                  background: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="#ffffff" opacity="0.95" />
                  <path d="M10 15.5L7.5 13L8.91 11.59L10 12.67L14.59 8.09L16 9.5L10 15.5Z" fill="#2563eb" />
                </svg>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
                  KEWARS
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Early Warning System Hub
                </Typography>
              </Box>
            </Box>

            {/* Central Document Title */}
            <Box sx={{ textAlign: "center", my: "auto" }}>
              <Typography variant="h3" sx={{ fontWeight: 900, color: "#1f2937", mb: 2, letterSpacing: "-0.04em" }}>
                INTERNAL WARNING AUDIT & ASSESSMENT REPORT
              </Typography>
              <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 500, mb: 4 }}>
                Custom Generated Alerts Summary
              </Typography>
              <Box 
                sx={{ 
                  width: "120px", 
                  height: "4px", 
                  bgcolor: "#2563eb", 
                  mx: "auto",
                  borderRadius: "2px"
                }} 
              />
            </Box>

            {/* Print Metadata Block */}
            <Box sx={{ bgcolor: "#f8fafc", p: 3, borderRadius: "10px", border: "1px solid #cbd5e1" }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    GENERATED ON
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date().toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    AUDITOR / GENERATOR
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user?.name || "System Administrator"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    TOTAL WARNINGS MATCHED
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#2563eb" }}>
                    {reportData.summary.totalCount} Incidents
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    FILTER SCOPE
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {region ? `Region: ${config.locations[region]?.label.en || region}` : "All Regions"} • {category ? `Type: ${config.categories[category]?.label.en || category}` : "All Types"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>

          {/* B. Executive Summary Page */}
          <Box className="page-break" sx={{ p: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#1f2937", mb: 3 }}>
              Executive Summary
            </Typography>
            <Divider sx={{ mb: 4 }} />
            
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                border: "1px solid #cbd5e1", 
                borderRadius: "12px", 
                bgcolor: "rgba(37, 99, 235, 0.02)",
                lineHeight: 1.8 
              }}
            >
              <Typography variant="body1" sx={{ color: "#334155", fontSize: "1.1rem", fontStyle: "italic", mb: 2 }}>
                {generateExecutiveSummary(reportData.summary)}
              </Typography>
            </Paper>

            {/* Quick Metrics Breakdown Table */}
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 6, mb: 2 }}>
              Report Statistics Aggregates
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: "10px" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Metric Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Details Breakdown</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Severity Splits</TableCell>
                    <TableCell>
                      High: {reportData.summary.severitySummary.high || 0} • Medium: {reportData.summary.severitySummary.medium || 0} • Low: {reportData.summary.severitySummary.low || 0}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Status Splits</TableCell>
                    <TableCell>
                      Published: {reportData.summary.statusSummary.published || 0} • Unprocessed: {reportData.summary.statusSummary.unprocessed || 0} • Rejected: {reportData.summary.statusSummary.rejected || 0} • Drafts: {reportData.summary.statusSummary.draft || 0}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* C. Detail Incident Cards Loop */}
          {reportData.reports.map((r, idx) => (
            <Box className="page-break avoid-break" key={r.id || idx} sx={{ p: 4, mb: 4, width: "100%", boxSizing: "border-box" }}>
              {/* Incident Title */}
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: "#111827" }}>
                ⚠️ {getTitle(r) || `Report ${r.id}`}
              </Typography>
              <Divider sx={{ mb: 3 }} />

              {/* Full-width Main Body (Incident Description & Media Attachments) */}
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  bgcolor: "#ffffff",
                  boxSizing: "border-box",
                  width: "100%",
                }}
              >
                {/* Information Badge Header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: "rgba(37, 99, 235, 0.08)",
                      color: "#2563eb",
                      p: 0.5,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ℹ️
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b" }}>
                    {reportLanguage === "en" ? "Incident Description" : "የክስተት ገለጻ"}
                  </Typography>
                </Box>

                {/* Report Description */}
                <Typography
                  variant="body1"
                  sx={{
                    color: "#334155",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    fontSize: "0.95rem",
                  }}
                >
                  {getDescription(r) || (reportLanguage === "en" ? "No description provided." : "ምንም ገለጻ አልተሰጠም።")}
                </Typography>

                {/* Attached Media Section (Images, Videos, Docs with Links & Descriptions) */}
                {r.mediaFiles && r.mediaFiles.length > 0 ? (
                  <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid #cbd5e1" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#1e293b", mb: 2 }}>
                      📎 {reportLanguage === "en" ? "Attached Media Files" : "የተያያዙ የሚዲያ ማስረጃዎች"} ({r.mediaFiles.length})
                    </Typography>

                    <Stack spacing={3}>
                      {r.mediaFiles.map((mediaUrl, mediaIdx) => {
                        const filename = decodeURIComponent(mediaUrl).split("/").pop();
                        const extension = mediaUrl.split("?")[0].split(".").pop().toLowerCase();
                        const isImg = ["jpg", "jpeg", "png", "gif", "webp", "tiff", "bmp"].includes(extension);
                        const proxiedUrl = `${API_BASE}/reports/media?url=${encodeURIComponent(mediaUrl)}`;

                        return (
                          <Box
                            key={mediaIdx}
                            sx={{
                              p: 2.5,
                              border: "1px solid #cbd5e1",
                              borderRadius: "10px",
                              bgcolor: "#f8fafc",
                              boxSizing: "border-box"
                            }}
                          >
                            {isImg ? (
                              <Box>
                                <img
                                  src={proxiedUrl}
                                  alt={filename}
                                  style={{
                                    width: "100%",
                                    maxHeight: "550px",
                                    objectFit: "contain",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                    marginBottom: "12px",
                                    backgroundColor: "#ffffff"
                                  }}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "#334155", mb: 1 }}>
                                  {reportLanguage === "en" ? `Image ${mediaIdx + 1} Description: Warning Evidence Photo (${filename})` : `ምስል ${mediaIdx + 1} ገለጻ: የማስጠንቀቂያ ማስረጃ ፎቶ (${filename})`}
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "#334155" }}>
                                  {reportLanguage === "en" ? `File Attachment ${mediaIdx + 1} (${extension.toUpperCase()}):` : `የፋይል አባሪ ${mediaIdx + 1} (${extension.toUpperCase()}):`}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#475569", wordBreak: "break-all" }}>
                                  {filename}
                                </Typography>
                              </Box>
                            )}

                            {/* Clickable Media Source Link */}
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b" }}>
                                {reportLanguage === "en" ? "Media Link:" : "የሚዲያ ሊንክ:"}
                              </Typography>
                              <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#2563eb",
                                  textDecoration: "underline",
                                  fontSize: "0.825rem",
                                  wordBreak: "break-all",
                                  fontWeight: 600
                                }}
                              >
                                {mediaUrl}
                              </a>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                ) : (
                  <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #cbd5e1" }}>
                    <Typography variant="body2" sx={{ color: "#64748b", fontStyle: "italic", fontSize: "0.9rem" }}>
                      {reportLanguage === "en" ? "No media uploaded for this warning." : "ለዚህ ማንቂያ ምንም ሚዲያ አልተጫነም።"}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          ))}
        </div>
      )}
    </Box>
  );
}
