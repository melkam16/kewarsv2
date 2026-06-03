import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Paper,
  Button,
  Stack,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Tooltip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  School as SchoolIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Group as GroupIcon,
  FactCheck as FactCheckIcon,
  MenuBook as BookIcon,
} from "@mui/icons-material";

import { AuthContext } from "../contexts/AuthContext";
import API_BASE from '../../api/apiBase';

const pageSize = 10;

const DEPARTMENTS = [
  "Computer Science",
  "Software Engineering",
  "Electrical Engineering",
  "Information Systems",
  "Mechanical Engineering"
];

const CLASS_YEARS = [1, 2, 3, 4, 5];

/* ============================================================================
   ENROLL STUDENT DIALOG
   ============================================================================ */
function EnrollStudentDialog({ open, onClose, onSuccess }) {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [classYear, setClassYear] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { token } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim() || !department || !classYear) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId.trim(),
          name: name.trim(),
          email: email.trim() || null,
          department,
          class_year: classYear,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to enroll student.");
      } else {
        onSuccess("Student enrolled successfully!");
        handleReset();
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStudentId("");
    setName("");
    setEmail("");
    setDepartment("");
    setClassYear("");
    setStatus("active");
    setError("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ bgcolor: "#111827", px: 3, py: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "#2563eb", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
          <PersonAddIcon sx={{ color: "#fff", fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: 700, lineHeight: 1.2 }}>
            Enroll Student Manually
          </Typography>
          <Typography variant="caption" sx={{ color: "#9ca3af" }}>
            Add a new student to active enrollment lists
          </Typography>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3, bgcolor: "#f9fafb" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, bgcolor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Student ID & Name */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label="Student ID *"
                  placeholder="e.g. STU12345"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth
                  label="Full Name *"
                  placeholder="e.g. Martha Hailu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
                />
              </Grid>
            </Grid>

            {/* Email */}
            <TextField
              fullWidth
              label="Email Address"
              placeholder="e.g. martha.hailu@kewars.edu"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
            />

            {/* Department & Class Year */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth
                  select
                  label="Department *"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
                >
                  {DEPARTMENTS.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  select
                  label="Class Year *"
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
                >
                  {CLASS_YEARS.map((yr) => (
                    <MenuItem key={yr} value={yr}>
                      Year {yr}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Enrollment Status */}
            <TextField
              fullWidth
              select
              label="Enrollment Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              variant="outlined"
              size="small"
              sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#ffffff", gap: 1 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderColor: "#d1d5db", color: "#374151" }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : <PersonAddIcon />}
            sx={{
              bgcolor: "#1f2937",
              color: "#ffffff",
              "&:hover": { bgcolor: "#111827" },
              fontWeight: 700,
            }}
          >
            {saving ? "Enrolling..." : "Enroll Student"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/* ============================================================================
   MAIN STUDENTS COMPONENT
   ============================================================================ */
export default function Students() {
  const { token } = useContext(AuthContext);

  // Lists & grid state
  const [studentsList, setStudentsList] = useState([]);
  const [page, setPage] = useState(0);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectionModel, setSelectionModel] = useState([]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("active"); // default to Active enrollees

  // Metrics state
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    graduating: 0, // Year 5
  });

  // UI helpers
  const [openEnroll, setOpenEnroll] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  /* ========================
     API CALLS
     ======================== */

  const getStudents = async (newPage = page, query = searchQuery, dept = selectedDept, yr = selectedYear, stat = selectedStatus) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: newPage + 1,
          size: pageSize,
          query: query.trim(),
          department: dept,
          class_year: yr,
          status: stat,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStudentsList(data.students || []);
        setRowCount(data.total || 0);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      notify("Failed to fetch students.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getMetrics = async () => {
    if (!token) return;
    try {
      // Get all students count by fetching without filters
      const res = await fetch(`${API_BASE}/students/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: 1,
          size: 10000, // retrieve all for metrics
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const list = data.students || [];
        const active = list.filter((s) => s.status === "active").length;
        const inactive = list.filter((s) => s.status === "inactive").length;
        const graduating = list.filter((s) => s.class_year === 5).length;

        setMetrics({
          total: list.length,
          active,
          inactive,
          graduating,
        });
      }
    } catch (err) {
      console.error("Error computing metrics:", err);
    }
  };

  const toggleStudentStatus = async (studentRow) => {
    if (!token || !studentRow) return;
    const newStatus = studentRow.status === "active" ? "inactive" : "active";

    try {
      const res = await fetch(`${API_BASE}/students/${studentRow.id}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        notify(`Status of ${studentRow.name} updated to ${newStatus}.`, "success");
        getStudents();
        getMetrics();
      } else {
        notify("Failed to update student status.", "error");
      }
    } catch (err) {
      notify("Network error. Failed to update status.", "error");
    }
  };

  /* ========================
     EFFECTS & TRIGGERS
     ======================== */

  useEffect(() => {
    if (token) {
      getStudents(0);
      getMetrics();
    }
  }, [token]);

  // Handle manual filter triggers
  const handleApplyFilters = () => {
    setPage(0);
    getStudents(0);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedDept("All");
    setSelectedYear("All");
    setSelectedStatus("active");
    setPage(0);
    getStudents(0, "", "All", "All", "active");
  };

  const notify = (msg, severity = "success") => {
    setSnackbar({
      open: true,
      message: msg,
      severity,
    });
  };

  /* ========================
     COLUMN DEFINITIONS
     ======================== */
  const columns = [
    { field: "student_id", headerName: "Student ID", width: 140, renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 700, color: "#1f2937" }}>
        {params.value}
      </Typography>
    )},
    { field: "name", headerName: "Name", width: 220, renderCell: (params) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {params.value}
      </Typography>
    )},
    { field: "department", headerName: "Department", width: 240, renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        sx={{
          fontWeight: 600,
          bgcolor: "rgba(37,99,235,0.06)",
          color: "#2563eb",
          border: "1px solid rgba(37,99,235,0.15)",
        }}
      />
    )},
    { field: "class_year", headerName: "Class Year", width: 130, renderCell: (params) => (
      <Chip
        label={`Year ${params.value}`}
        size="small"
        sx={{
          fontWeight: 600,
          bgcolor: "rgba(17,24,39,0.05)",
          color: "#111827",
        }}
      />
    )},
    { field: "email", headerName: "Email Address", width: 240, renderCell: (params) => (
      params.value ? params.value : <Typography variant="body2" color="text.secondary">—</Typography>
    )},
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          {params.value === "active" ? (
            <Chip
              icon={<ActiveIcon sx={{ "&&": { color: "#059669" } }} />}
              label="Active"
              size="small"
              sx={{
                bgcolor: "rgba(5,150,105,0.08)",
                color: "#059669",
                fontWeight: 700,
                border: "1px solid rgba(5,150,105,0.2)",
              }}
            />
          ) : (
            <Chip
              icon={<InactiveIcon sx={{ "&&": { color: "#991b1b" } }} />}
              label="Inactive"
              size="small"
              sx={{
                bgcolor: "rgba(153,27,27,0.08)",
                color: "#991b1b",
                fontWeight: 700,
                border: "1px solid rgba(153,27,27,0.2)",
              }}
            />
          )}
        </Stack>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title={params.row.status === "active" ? "Deactivate Student" : "Activate Student"}>
          <span>
            <Button
              variant="outlined"
              size="small"
              onClick={() => toggleStudentStatus(params.row)}
              startIcon={params.row.status === "active" ? <ToggleOffIcon /> : <ToggleOnIcon />}
              sx={{
                borderRadius: "6px",
                py: 0.5,
                fontWeight: 600,
                borderColor: params.row.status === "active" ? "#fecaca" : "#bbf7d0",
                color: params.row.status === "active" ? "#991b1b" : "#059669",
                "&:hover": {
                  borderColor: params.row.status === "active" ? "#991b1b" : "#059669",
                  bgcolor: params.row.status === "active" ? "rgba(153,27,27,0.04)" : "rgba(5,150,105,0.04)",
                },
              }}
            >
              {params.row.status === "active" ? "Suspend" : "Activate"}
            </Button>
          </span>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      {/* Page Header & Action */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", mb: 0.5 }}>
            Student Enrollment Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View, search, and filter actively enrolled students by year and department, and perform manual enrollments.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenEnroll(true)}
          sx={{
            bgcolor: "#1f2937",
            color: "#ffffff",
            fontWeight: 700,
            px: 2.5,
            py: 1.2,
            "&:hover": { bgcolor: "#111827" },
          }}
        >
          Enroll Student
        </Button>
      </Stack>

      {/* Enroll Dialog Modal */}
      <EnrollStudentDialog
        open={openEnroll}
        onClose={() => setOpenEnroll(false)}
        onSuccess={(msg) => {
          setOpenEnroll(false);
          notify(msg, "success");
          getStudents(page);
          getMetrics();
        }}
      />

      {/* Metrics Summary Strip */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Card 1: Total */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: "1px solid #e5e7eb", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: "10px", bgcolor: "rgba(31,41,55,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GroupIcon sx={{ color: "#1f2937" }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Total Enrolled</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{metrics.total}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Active */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: "1px solid #e5e7eb", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: "10px", bgcolor: "rgba(5,150,105,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ActiveIcon sx={{ color: "#059669" }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Active Enrollees</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#059669" }}>{metrics.active}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Inactive */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: "1px solid #e5e7eb", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: "10px", bgcolor: "rgba(153,27,27,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <InactiveIcon sx={{ color: "#991b1b" }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Suspended/Inactive</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#991b1b" }}>{metrics.inactive}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Graduating Year 5 */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: "1px solid #e5e7eb", borderRadius: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: "10px", bgcolor: "rgba(37,99,235,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SchoolIcon sx={{ color: "#2563eb" }} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Year 5 (Graduating)</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#2563eb" }}>{metrics.graduating}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Toolbar Filter Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: "1px solid #e5e7eb", bgcolor: "#ffffff" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
          <FilterIcon sx={{ color: "#6b7280" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#374151" }}>
            Filter Enrolled Students
          </Typography>
        </Stack>

        <Grid container spacing={2.5} alignItems="center">
          {/* Search ID/Name */}
          <Grid item xs={12} sm={6} md={3.5}>
            <TextField
              fullWidth
              size="small"
              label="Search by ID or Name"
              placeholder="e.g. STU10001 or Abebe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ color: "#9ca3af", mr: 1 }} />,
              }}
              sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
            />
          </Grid>

          {/* Department filter */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              size="small"
              label="Department"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
            >
              <MenuItem value="All">All Departments</MenuItem>
              {DEPARTMENTS.map((dept) => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Class year filter */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              select
              size="small"
              label="Class Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
            >
              <MenuItem value="All">All Years</MenuItem>
              {CLASS_YEARS.map((yr) => (
                <MenuItem key={yr} value={String(yr)}>
                  Year {yr}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Status filter */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              select
              size="small"
              label="Status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              sx={{ bgcolor: "#ffffff", borderRadius: 2 }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="inactive">Inactive Only</MenuItem>
            </TextField>
          </Grid>

          {/* Filter action buttons */}
          <Grid item xs={12} md={1.5} sx={{ display: "flex", gap: 1 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleApplyFilters}
              sx={{
                bgcolor: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                "&:hover": { bgcolor: "#1d4ed8" },
              }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              sx={{
                borderColor: "#d1d5db",
                color: "#4b5563",
                fontWeight: 600,
                "&:hover": { borderColor: "#9ca3af", bgcolor: "#f3f4f6" },
              }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Students Data Grid Table */}
      <Paper sx={{ borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden", p: 0 }}>
        <Box sx={{ borderBottom: "1px solid #e5e7eb", px: 3, py: 2.5, bgcolor: "#ffffff", display: "flex", alignItems: "center", gap: 1 }}>
          <FactCheckIcon sx={{ color: "#2563eb", fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827" }}>
            Enrollment Records ({rowCount})
          </Typography>
        </Box>

        <DataGrid
          autoHeight
          rows={studentsList}
          columns={columns}
          loading={loading}
          paginationMode="server"
          rowCount={rowCount}
          pageSize={pageSize}
          pagination
          page={page}
          onPageChange={(newPage) => {
            setPage(newPage);
            getStudents(newPage);
          }}
          rowsPerPageOptions={[pageSize]}
          onRowSelectionModelChange={(newSelectionModel) => setSelectionModel(newSelectionModel)}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 700,
                color: "#374151",
              },
            },
            "& .MuiDataGrid-row": {
              "&:hover": {
                bgcolor: "#f3f4f6",
              },
              borderBottom: "1px solid #f3f4f6",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #e5e7eb",
            },
          }}
        />
      </Paper>

      {/* Snackbar notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
