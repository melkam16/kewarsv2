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
  DialogContentText,
  DialogTitle,
  Tabs,
  Tab,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
  FormLabel,
  InputAdornment,
  IconButton,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { TabContext, TabPanel } from "@mui/lab";
import { DataGrid } from "@mui/x-data-grid";
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Analytics as AnalystIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as EnableIcon,
  Block as DisableIcon,
} from "@mui/icons-material";

import { AuthContext } from "../contexts/AuthContext";

import API_BASE from '../../api/apiBase';
const pageSize = 10;

const AVAILABLE_ROLES = [
  { key: "admin", label: "Admin", color: "#991b1b", bg: "rgba(153,27,27,0.08)", icon: <AdminIcon fontSize="small" /> },
  { key: "analyst", label: "Analyst", color: "#2563eb", bg: "rgba(37,99,235,0.08)", icon: <AnalystIcon fontSize="small" /> },
  { key: "user", label: "User", color: "#374151", bg: "rgba(55,65,81,0.08)", icon: null },
];

/* ============================
   COLUMN DEFINITIONS
============================ */
const referralColumns = [
  { field: "id", headerName: "ID", hide: true },
  { field: "name", headerName: "Name", width: 150 },
  { field: "email", headerName: "Email", width: 220 },
  { field: "phoneNumber", headerName: "Phone", width: 150 },
  { field: "region", headerName: "Region", width: 120 },
  { field: "zone", headerName: "Zone", width: 120 },
  { field: "woreda", headerName: "Woreda", width: 120 },
  { field: "other", headerName: "Additional", width: 150 },
  { field: "referralStatus", headerName: "Status", width: 150 },
];

const buildUserColumns = (onViewRoles) => [
  { field: "id", headerName: "ID", hide: true },
  {
    field: "enabled",
    headerName: "Active",
    type: "boolean",
    width: 80,
    renderCell: (params) =>
      params.value ? (
        <EnableIcon sx={{ color: "#059669", fontSize: 20 }} />
      ) : (
        <DisableIcon sx={{ color: "#991b1b", fontSize: 20 }} />
      ),
  },
  { field: "name", headerName: "Name", width: 200 },
  { field: "email", headerName: "Email", width: 240 },
  { field: "phone", headerName: "Phone", width: 140 },
  {
    field: "groups",
    headerName: "Roles",
    width: 260,
    renderCell: (params) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        {(params.row.groups || []).length === 0 ? (
          <Typography variant="caption" sx={{ color: "#9ca3af" }}>No roles</Typography>
        ) : (
          (params.row.groups || []).map((role) => {
            const def = AVAILABLE_ROLES.find((r) => r.key === role);
            return (
              <Chip
                key={role}
                label={def?.label || role}
                size="small"
                sx={{
                  height: 22,
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  bgcolor: def?.bg || "rgba(0,0,0,0.05)",
                  color: def?.color || "#374151",
                  border: `1px solid ${def?.color || "#d1d5db"}30`,
                }}
              />
            );
          })
        )}
      </Stack>
    ),
  },
  {
    field: "created_at",
    headerName: "Created On",
    width: 180,
    renderCell: (params) =>
      params.value ? new Date(params.value).toLocaleDateString() : "—",
  },
];

/* ============================
   ADD USER DIALOG
============================ */
function AddUserDialog({ open, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState(["analyst"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { token } = useContext(AuthContext);

  const handleRoleToggle = (roleKey) => {
    setSelectedRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email and password are required.");
      return;
    }
    if (selectedRoles.length === 0) {
      setError("Please assign at least one role.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          roles: selectedRoles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create user.");
      } else {
        onSuccess("User created successfully!");
        handleReset();
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setSelectedRoles(["analyst"]);
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
        <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PersonAddIcon sx={{ color: "#fff", fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: 700, lineHeight: 1.2 }}>
            Add New User
          </Typography>
          <Typography variant="caption" sx={{ color: "#9ca3af" }}>
            Create a staff account and assign roles
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
            {/* Full Name */}
            <TextField
              fullWidth
              label="Full Name"
              placeholder="e.g. Abebe Bekele"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              variant="outlined"
              size="small"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#d1d5db" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#2563eb" },
                },
              }}
            />

            {/* Email */}
            <TextField
              fullWidth
              label="Email Address"
              placeholder="e.g. abebe@kewars.org"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              variant="outlined"
              size="small"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#d1d5db" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#2563eb" },
                },
              }}
            />

            {/* Password */}
            <TextField
              fullWidth
              label="Password"
              placeholder="Set a secure password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="outlined"
              size="small"
              helperText="Minimum 8 characters recommended"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: 2,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#d1d5db" },
                  "&:hover fieldset": { borderColor: "#9ca3af" },
                  "&.Mui-focused fieldset": { borderColor: "#2563eb" },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: "#9ca3af" }}
                    >
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Role Assignment */}
            <Box sx={{ bgcolor: "#ffffff", borderRadius: 2, border: "1px solid #d1d5db", p: 2 }}>
              <FormLabel
                component="legend"
                sx={{ color: "#374151", fontWeight: 700, fontSize: "0.88rem", mb: 1.5, display: "block" }}
              >
                Assign Roles *
              </FormLabel>
              <FormGroup>
                <Stack spacing={1}>
                  {AVAILABLE_ROLES.map((roleDef) => (
                    <FormControlLabel
                      key={roleDef.key}
                      control={
                        <Checkbox
                          checked={selectedRoles.includes(roleDef.key)}
                          onChange={() => handleRoleToggle(roleDef.key)}
                          sx={{
                            color: roleDef.color,
                            "&.Mui-checked": { color: roleDef.color },
                          }}
                          size="small"
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip
                            label={roleDef.label}
                            size="small"
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              textTransform: "uppercase",
                              bgcolor: roleDef.bg,
                              color: roleDef.color,
                            }}
                          />
                          <Typography variant="caption" sx={{ color: "#6b7280" }}>
                            {roleDef.key === "admin"
                              ? "Full system access — manage users and all reports"
                              : roleDef.key === "analyst"
                              ? "Create, edit, verify, and publish incident reports"
                              : "Read-only access to published content"}
                          </Typography>
                        </Stack>
                      }
                      sx={{ m: 0, py: 0.5 }}
                    />
                  ))}
                </Stack>
              </FormGroup>
            </Box>
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
            {saving ? "Creating..." : "Create User"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/* ============================
   MAIN USERS COMPONENT
============================ */
function Users() {
  const { token } = useContext(AuthContext);

  const [tab, setTab] = useState("1");
  const [users, setUsers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [page, setPage] = useState(0);
  const [rowCount, setRowCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingReferral, setLoadingReferral] = useState(false);

  const [userSelect, setUserSelection] = useState([]);
  const [referralSelect, setReferralSelection] = useState([]);

  const [showSnackbar, setShowSnackbar] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState("");

  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [confirmationTitle, setConfirmationTitle] = useState("");
  const [confirmationBody, setConfirmationBody] = useState("");
  const [actionOnConfirm, setActionOnConfirm] = useState(null);

  const [openAddUser, setOpenAddUser] = useState(false);

  /* ========================
     API CALLS
  ======================== */

  const getUsers = async (newPage = 0, query = searchQuery) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page: newPage + 1, size: pageSize, query }),
      });
      const data = await res.json();
      setUsers(data.users || []);
      setRowCount(data.total || 0);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const getReferrals = async () => {
    setLoadingReferral(true);
    try {
      const res = await fetch(`${API_BASE}/referrals?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReferrals(data || []);
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoadingReferral(false);
    }
  };

  const updateReferral = async (action) => {
    const [id] = referralSelect;
    if (!id) return;
    await fetch(`${API_BASE}/referrals/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    notify(`Referral ${action}d successfully`, true);
    getReferrals();
  };

  const addRemoveRole = async (role) => {
    const [userId] = userSelect;
    if (!userId) return;
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const method = user.groups.includes(role) ? "DELETE" : "POST";
    await fetch(`${API_BASE}/users/${userId}/roles`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    notify(`Role "${role}" ${method === "DELETE" ? "removed" : "added"} successfully`, true);
    getUsers(page);
  };

  const enableDisableUser = async () => {
    const [userId] = userSelect;
    if (!userId) return;
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    await fetch(`${API_BASE}/users/${userId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: user.enabled ? "disable" : "enable" }),
    });
    notify(`User ${user.enabled ? "disabled" : "enabled"} successfully`, true);
    getUsers(page);
  };

  const deleteUser = async () => {
    const [userId] = userSelect;
    if (!userId) return;
    await fetch(`${API_BASE}/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    notify("User deleted successfully", true);
    setUserSelection([]);
    getUsers(page);
  };

  /* ========================
     HELPERS
  ======================== */

  const notify = (msg, success = true) => {
    setMessage(msg);
    setIsSuccess(success);
    setShowSnackbar(true);
  };

  const showConfirmation = (title, body, action) => {
    setConfirmationTitle(title);
    setConfirmationBody(body);
    setActionOnConfirm(() => () => {
      setOpenConfirmation(false);
      action();
    });
    setOpenConfirmation(true);
  };

  /* ========================
     EFFECTS
  ======================== */

  useEffect(() => {
    if (token) {
      getUsers();
      getReferrals();
    }
  }, [token]);

  const selectedUser = users.find((u) => u.id === userSelect[0]);

  /* ========================
     RENDER
  ======================== */

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", mb: 0.5 }}>
          Users Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage staff accounts, referrals, and assign system roles.
        </Typography>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmation}
        onClose={() => setOpenConfirmation(false)}
        PaperProps={{ sx: { borderRadius: 3, border: "1px solid #e5e7eb" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{confirmationTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmationBody}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenConfirmation(false)} sx={{ color: "#6b7280" }}>Cancel</Button>
          <Button onClick={actionOnConfirm} variant="contained" sx={{ bgcolor: "#1f2937", "&:hover": { bgcolor: "#111827" } }} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <AddUserDialog
        open={openAddUser}
        onClose={() => setOpenAddUser(false)}
        onSuccess={(msg) => {
          setOpenAddUser(false);
          notify(msg, true);
          getUsers(page);
        }}
      />

      <Paper sx={{ borderRadius: 3, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <TabContext value={tab}>
          <Box sx={{ borderBottom: "1px solid #e5e7eb", px: 3, bgcolor: "#ffffff" }}>
            <Tabs
              value={tab}
              onChange={(e, v) => setTab(v)}
              sx={{
                "& .MuiTab-root": { fontWeight: 600, textTransform: "none", color: "#6b7280" },
                "& .Mui-selected": { color: "#111827", fontWeight: 700 },
                "& .MuiTabs-indicator": { bgcolor: "#2563eb", height: 3 },
              }}
            >
              <Tab label="Referrals" value="1" />
              <Tab label={`Staff Users (${rowCount})`} value="2" />
            </Tabs>
          </Box>

          {/* REFERRALS TAB */}
          <TabPanel value="1" sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                onClick={() => showConfirmation("Approve Referral?", "Are you sure you want to approve this referral?", () => updateReferral("approve"))}
                disabled={!referralSelect.length}
                sx={{ bgcolor: "#059669", "&:hover": { bgcolor: "#047857" }, fontWeight: 700 }}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => showConfirmation("Reject Referral?", "Are you sure you want to reject this referral?", () => updateReferral("reject"))}
                disabled={!referralSelect.length}
                sx={{ fontWeight: 700 }}
              >
                Reject
              </Button>
            </Stack>

            <DataGrid
              autoHeight
              rows={referrals}
              columns={referralColumns}
              loading={loadingReferral}
              pageSize={10}
              rowsPerPageOptions={[10]}
              onRowSelectionModelChange={setReferralSelection}
              sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}
            />
          </TabPanel>

          {/* USERS TAB */}
          <TabPanel value="2" sx={{ p: 3 }}>
            {/* Actions toolbar */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} mb={3}>
              {/* Search */}
              <TextField
                size="small"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && getUsers(0, searchQuery)}
                sx={{
                  width: { xs: "100%", sm: 280 },
                  bgcolor: "#ffffff",
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#d1d5db" },
                    "&.Mui-focused fieldset": { borderColor: "#2563eb" },
                  },
                }}
              />

              {/* Right-side action buttons */}
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                {/* Add User */}
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setOpenAddUser(true)}
                  sx={{
                    bgcolor: "#1f2937",
                    color: "#ffffff",
                    fontWeight: 700,
                    "&:hover": { bgcolor: "#111827" },
                  }}
                >
                  Add User
                </Button>

                <Divider orientation="vertical" flexItem sx={{ borderColor: "#e5e7eb" }} />

                {/* Role chips */}
                {AVAILABLE_ROLES.map((roleDef) => {
                  const hasRole = selectedUser?.groups?.includes(roleDef.key);
                  return (
                    <Tooltip
                      key={roleDef.key}
                      title={hasRole ? `Remove "${roleDef.label}" role` : `Add "${roleDef.label}" role`}
                    >
                      <span>
                        <Chip
                          label={roleDef.label}
                          icon={hasRole ? <DeleteIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                          onClick={() =>
                            showConfirmation(
                              `${hasRole ? "Remove" : "Add"} Role`,
                              `${hasRole ? "Remove" : "Add"} "${roleDef.label}" role for this user?`,
                              () => addRemoveRole(roleDef.key)
                            )
                          }
                          disabled={!userSelect.length}
                          sx={{
                            height: 34,
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            bgcolor: userSelect.length && hasRole ? roleDef.bg : undefined,
                            color: userSelect.length && hasRole ? roleDef.color : undefined,
                            border: `1px solid ${roleDef.color}40`,
                          }}
                        />
                      </span>
                    </Tooltip>
                  );
                })}

                <Divider orientation="vertical" flexItem sx={{ borderColor: "#e5e7eb" }} />

                {/* Enable/Disable */}
                <Tooltip title={selectedUser?.enabled ? "Disable user account" : "Enable user account"}>
                  <span>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        showConfirmation(
                          selectedUser?.enabled ? "Disable User?" : "Enable User?",
                          `Are you sure you want to ${selectedUser?.enabled ? "disable" : "enable"} this user account?`,
                          enableDisableUser
                        )
                      }
                      disabled={!userSelect.length}
                      startIcon={selectedUser?.enabled ? <DisableIcon /> : <EnableIcon />}
                      sx={{
                        borderColor: selectedUser?.enabled ? "#fecaca" : "#bbf7d0",
                        color: selectedUser?.enabled ? "#991b1b" : "#059669",
                        fontWeight: 600,
                        "&:hover": {
                          borderColor: selectedUser?.enabled ? "#991b1b" : "#059669",
                          bgcolor: selectedUser?.enabled ? "rgba(153,27,27,0.04)" : "rgba(5,150,105,0.04)",
                        },
                      }}
                    >
                      {selectedUser?.enabled ? "Disable" : "Enable"}
                    </Button>
                  </span>
                </Tooltip>

                {/* Delete User */}
                <Tooltip title="Permanently delete this user">
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={() =>
                        showConfirmation(
                          "Delete User?",
                          "This will permanently delete the user account. This action cannot be undone.",
                          deleteUser
                        )
                      }
                      disabled={!userSelect.length}
                      sx={{
                        borderColor: "#fecaca",
                        color: "#991b1b",
                        fontWeight: 600,
                        "&:hover": { borderColor: "#991b1b", bgcolor: "rgba(153,27,27,0.04)" },
                      }}
                    >
                      Delete
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Selected user info strip */}
            {selectedUser && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "rgba(37,99,235,0.04)",
                  border: "1px solid rgba(37,99,235,0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    bgcolor: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    flexShrink: 0,
                  }}
                >
                  {selectedUser.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#111827" }}>
                    {selectedUser.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6b7280" }}>
                    {selectedUser.email} · {selectedUser.enabled ? "Active" : "Disabled"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} sx={{ ml: "auto" }}>
                  {(selectedUser.groups || []).map((role) => {
                    const def = AVAILABLE_ROLES.find((r) => r.key === role);
                    return (
                      <Chip
                        key={role}
                        label={def?.label || role}
                        size="small"
                        sx={{ height: 20, fontWeight: 700, fontSize: "0.68rem", bgcolor: def?.bg, color: def?.color }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}

            <DataGrid
              autoHeight
              rows={users}
              columns={buildUserColumns()}
              pagination
              pageSize={pageSize}
              rowsPerPageOptions={[pageSize]}
              paginationMode="server"
              rowCount={rowCount}
              onPageChange={(newPage) => {
                setPage(newPage);
                getUsers(newPage);
              }}
              loading={loading}
              onRowSelectionModelChange={setUserSelection}
              sx={{
                border: "1px solid #e5e7eb",
                borderRadius: 2,
                "& .MuiDataGrid-columnHeaders": { bgcolor: "#f9fafb", borderBottom: "1px solid #e5e7eb" },
                "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, color: "#374151", fontSize: "0.82rem" },
                "& .MuiDataGrid-row:hover": { bgcolor: "rgba(37,99,235,0.03)" },
                "& .MuiDataGrid-row.Mui-selected": { bgcolor: "rgba(37,99,235,0.06)" },
                "& .MuiDataGrid-cell:focus": { outline: "none" },
              }}
            />
          </TabPanel>
        </TabContext>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={showSnackbar}
        autoHideDuration={5000}
        onClose={() => setShowSnackbar(false)}
      >
        <Alert
          severity={isSuccess ? "success" : "error"}
          onClose={() => setShowSnackbar(false)}
          sx={{ borderRadius: 2 }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Users;