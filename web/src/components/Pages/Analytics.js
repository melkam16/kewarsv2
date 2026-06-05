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
  Download as DownloadIcon,
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
  const { token } = useContext(AuthContext);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");

  // Data States
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination State for Table
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
    window.print();
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
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-report-area, #printable-report-area * {
              visibility: visible;
            }
            #printable-report-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Main Dashboard Section */}
      <div id="printable-report-area">
        {/* Header Block */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
          className="no-print"
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
              Print PDF
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

        {/* Print Only Header (Invisible on Screen) */}
        <Box sx={{ display: "none", "@media print": { display: "block" }, mb: 4 }}>
          <Typography variant="h3" align="center" sx={{ fontWeight: 800, mb: 1 }}>
            KEWARS Internal Warning Audit Report
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2 }}>
            Generated on: {new Date().toLocaleString()}
          </Typography>
          <Divider sx={{ mb: 3 }} />
        </Box>

        {/* 1. FILTER CONTROLS GRID */}
        <Paper
          elevation={0}
          sx={{ p: 3, mb: 4, border: "1px solid #e5e7eb" }}
          className="no-print"
        >
          <Grid container spacing={2.5} alignItems="center">
            {/* Start Date */}
            <Grid item xs={12} sm={6} md={2}>
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
            <Grid item xs={12} sm={6} md={2}>
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
            <Grid item xs={12} sm={4} md={2}>
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
            <Grid item xs={12} sm={4} md={2}>
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
            <Grid item xs={12} sm={4} md={1.5}>
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
            <Grid item xs={12} sm={4} md={1.5}>
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

            {/* Action Buttons */}
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

        {/* Error Notification */}
        {error && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#fef2f2", border: "1px solid #fca5a5" }}>
            <Typography color="error" variant="body2" sx={{ fontWeight: 600 }}>
              ⚠️ {error}
            </Typography>
          </Paper>
        )}

        {/* 2. SUMMARY METRICS CARD */}
        {reportData && (
          <>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* KPI Total Matching */}
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
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#6b7280",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Matching Warnings
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                      {reportData.summary.totalCount}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(37, 99, 235, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2563eb",
                    }}
                  >
                    <AssessmentIcon />
                  </Box>
                </Paper>
              </Grid>

              {/* KPI Critical Risks */}
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
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#6b7280",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Critical (High) Severity
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#991b1b" }}>
                      {reportData.summary.severitySummary.high || 0}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(153, 27, 27, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#991b1b",
                    }}
                  >
                    <WarningIcon />
                  </Box>
                </Paper>
              </Grid>

              {/* KPI Category Diversity */}
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
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#6b7280",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Active Categories
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                      {Object.keys(reportData.summary.categorySummary || {}).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(5, 150, 105, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#059669",
                    }}
                  >
                    <CategoryIcon />
                  </Box>
                </Paper>
              </Grid>

              {/* KPI Active Regions */}
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
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#6b7280",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Incident Regions
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                      {Object.keys(reportData.summary.regionSummary || {}).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: "rgba(234, 88, 12, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ea580c",
                    }}
                  >
                    <LocationIcon />
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* 3. METRICS CHARTS ROW */}
            <Grid container spacing={3.5} sx={{ mb: 4 }}>
              {/* Severity Breakdown Chart */}
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
                            plugins: {
                              legend: {
                                position: "bottom",
                              },
                            },
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Category Breakdown Chart */}
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
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                grid: { color: "rgba(0, 0, 0, 0.04)" },
                              },
                              x: {
                                grid: { display: false },
                              },
                            },
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* 4. DETAILS TABLE GRID */}
            <Card sx={{ border: "1px solid #e5e7eb" }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }} className="no-print">
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
                              {r.title || `Report ${r.id}`}
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
                              {r.incidentDateTime
                                ? new Date(r.incidentDateTime).toLocaleDateString()
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Table Pagination */}
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={reportData.reports.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  className="no-print"
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Box>
  );
}
