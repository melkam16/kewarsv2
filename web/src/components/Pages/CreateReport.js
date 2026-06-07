import React, { useContext, useState } from "react";
import {
  Snackbar,
  Button,
  Paper,
  Stack,
  Alert,
  Grid,
  Box,
  Typography,
  Divider,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import Report from "../report";
import config from "../../config";

import API_BASE from '../../api/apiBase';

function CreateReport() {
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [outcome, setOutcome] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [report, setReport] = useState({
    reporter: user ? { sub: user.id || user.sub, name: user.name } : null,
    title: "",
    description: "",
    titleEn: "",
    descriptionEn: "",
    categories: [],
    incidentLocation: { region: "", zone: "", woreda: "", other: "" },
    incidentGps: { lat: 9.145, lon: 40.4896 }, // Ethiopia center default
    incidentDateTime: new Date().toISOString(),
    severity: "",
    status: "draft",
    notes: "",
    eyewitness: false,
    mediaFiles: [],
  });

  const [mode, setMode] = useState("manual");
  const [processing, setProcessing] = useState(false);
  const [extractedReports, setExtractedReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempReport, setTempReport] = useState(null);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const validateReport = (rep) => {
    let errors = [];

    if (!rep?.title?.trim()) errors.push("Title is required");
    if (!rep?.categories?.length) errors.push("No categories selected");
    if (
      !rep?.incidentLocation?.region ||
      !rep?.incidentLocation?.zone ||
      !rep?.incidentLocation?.woreda
    ) {
      errors.push("Missing location info");
    }
    if (!rep?.incidentDateTime) errors.push("Missing date/time");
    if (!rep?.severity) errors.push("Missing severity");

    setIsValid(errors.length === 0);
  };

  const onChange = (updatedReport) => {
    setReport(updatedReport);
    validateReport(updatedReport);
  };

  const handleSave = async (status) => {
    setLoading(true);
    try {
      const finalReport = {
        ...report,
        status: status,
        reportDateTime: new Date().toISOString(),
      };

      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ report: finalReport }),
      });

      if (!res.ok) throw new Error("Server error");

      setOutcome({
        show: true,
        message: `Successfully created report as ${status}`,
        type: "success",
      });

      setTimeout(() => {
        navigate("/reports");
      }, 1500);
    } catch (err) {
      console.error(err);
      setOutcome({
        show: true,
        message: "Failed to create report. Please check required fields.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDigitizeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing(true);
    setOutcome({ show: false, message: "", type: "success" });

    try {
      const res = await fetch(`${API_BASE}/reports/digitize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Extraction failed");
      }

      const data = await res.json();
      const parsedList = (data.reports || []).map((rep) => ({
        ...rep,
        reporter: user ? { sub: user.id || user.sub, name: user.name } : null,
        title: rep.title || "",
        description: rep.description || "",
        titleEn: rep.titleEn || "",
        descriptionEn: rep.descriptionEn || "",
        categories: rep.categories || [],
        incidentLocation: {
          region: rep.incidentLocation?.region || "",
          zone: rep.incidentLocation?.zone || "",
          woreda: rep.incidentLocation?.woreda || "",
          other: rep.incidentLocation?.other || "",
        },
        incidentGps: rep.incidentGps || { lat: 9.145, lon: 40.4896 },
        incidentDateTime: rep.incidentDateTime || new Date().toISOString(),
        severity: rep.severity || "low",
        status: "draft",
        notes: rep.notes || "",
        eyewitness: rep.eyewitness || false,
        mediaFiles: [],
      }));

      setExtractedReports(parsedList);
      setSelectedReports(new Array(parsedList.length).fill(true));
      setOutcome({
        show: true,
        message: `Successfully extracted ${parsedList.length} reports!`,
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setOutcome({
        show: true,
        message: `Failed to digitize file: ${err.message}`,
        type: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenEdit = (index) => {
    setEditingIndex(index);
    setTempReport({ ...extractedReports[index] });
  };

  const handleSaveEdit = () => {
    const updated = [...extractedReports];
    updated[editingIndex] = tempReport;
    setExtractedReports(updated);
    setEditingIndex(null);
    setTempReport(null);
  };

  const handleBulkSubmit = async (status) => {
    const indicesToSubmit = selectedReports
      .map((selected, idx) => (selected ? idx : null))
      .filter((idx) => idx !== null);

    if (indicesToSubmit.length === 0) {
      setOutcome({
        show: true,
        message: "Please select at least one report to import.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const idx of indicesToSubmit) {
        const finalReport = {
          ...extractedReports[idx],
          status: status,
          reportDateTime: new Date().toISOString(),
        };

        const res = await fetch(`${API_BASE}/reports`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ report: finalReport }),
        });

        if (res.ok) {
          successCount++;
        }
      }

      setOutcome({
        show: true,
        message: `Successfully imported ${successCount} reports as ${status}!`,
        type: "success",
      });

      setTimeout(() => {
        navigate("/reports");
      }, 1500);
    } catch (err) {
      console.error(err);
      setOutcome({
        show: true,
        message: "An error occurred during bulk import.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: '#ffffff' }}>
      {/* Premium Glassmorphic Header Card */}
      <Box 
        sx={{ 
          p: { xs: 2.5, sm: 4 }, 
          mb: 4, 
          borderRadius: 4, 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.15)'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: '-50%', 
            right: '-20%', 
            width: '300px', 
            height: '300px', 
            borderRadius: '50%', 
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, rgba(6, 182, 212, 0) 70%)',
            filter: 'blur(30px)'
          }}
        />
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 0.5 }}>
          Create New Early Warning Report
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Submit a new security, incident, or environmental assessment. Ensure all required fields are validated before submission.
        </Typography>
      </Box>

      {/* Tabs / Mode Toggle */}
      <Tabs
        value={mode}
        onChange={(e, val) => setMode(val)}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 4, borderBottom: '1px solid #e2e8f0' }}
      >
        <Tab label="Manual Report Creation" value="manual" sx={{ fontWeight: 700 }} />
        <Tab label="Digitize Word/PDF Document" value="digitize" sx={{ fontWeight: 700 }} />
      </Tabs>

      {mode === "manual" ? (
        <>
          {/* Main Core Form */}
          <Report report={report} readOnly={false} onChange={onChange} hideReportDate={true} />

          {/* Submission Buttons Block */}
          <Divider sx={{ my: 4 }} />
          <Grid item xs={12}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
              <Button 
                variant="outlined" 
                onClick={() => navigate(-1)}
                disabled={loading}
                sx={{ borderRadius: "8px", px: 4, py: 1.2, fontWeight: 700, borderColor: '#cbd5e1', color: '#475569' }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                color="secondary"
                disabled={loading}
                onClick={() => handleSave("draft")}
                sx={{ 
                  borderRadius: "8px", 
                  px: 4, 
                  py: 1.2, 
                  fontWeight: 700, 
                  bgcolor: '#06b6d4', 
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#0891b2' }
                }}
              >
                Save as Draft
              </Button>

              <Button
                variant="contained"
                color="success"
                disabled={!isValid || loading}
                onClick={() => handleSave("unprocessed")}
                sx={{ 
                  borderRadius: "8px", 
                  px: 4, 
                  py: 1.2, 
                  fontWeight: 700, 
                  bgcolor: '#10b981', 
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#059669' }
                }}
              >
                Submit Report
              </Button>
            </Stack>
          </Grid>
        </>
      ) : (
        <>
          {/* Digitize View */}
          {/* File upload zone */}
          {extractedReports.length === 0 && !processing && (
            <Paper
              elevation={0}
              sx={{
                p: 5,
                borderRadius: 4,
                border: '2px dashed #06b6d4',
                bgcolor: 'rgba(6, 182, 212, 0.01)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  bgcolor: 'rgba(6, 182, 212, 0.04)',
                  borderColor: '#22d3ee',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <input
                accept=".docx,.pdf"
                style={{ display: 'none' }}
                id="digitize-file-upload"
                type="file"
                onChange={handleDigitizeUpload}
              />
              <label htmlFor="digitize-file-upload" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
                <CloudUploadIcon sx={{ fontSize: 60, color: '#06b6d4', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                  Upload Word (.docx) or PDF File to Digitize
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The system will automatically parse multiple warning reports, extract locations/metadata, and match system categories.
                </Typography>
              </label>
            </Paper>
          )}

          {/* Processing spinner */}
          {processing && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={50} sx={{ color: '#06b6d4', mb: 2 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Digitizing document and matching system categories...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                This may take a few seconds depending on the document length.
              </Typography>
            </Box>
          )}

          {/* Extracted preview list */}
          {extractedReports.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Extracted Reports Preview ({extractedReports.length})
                </Typography>
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={() => {
                    setExtractedReports([]);
                    setSelectedReports([]);
                  }}
                  sx={{ borderRadius: "8px" }}
                >
                  Clear All
                </Button>
              </Box>

              <Stack spacing={3}>
                {extractedReports.map((rep, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      bgcolor: selectedReports[idx] ? 'rgba(6, 182, 212, 0.02)' : '#ffffff',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={1}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!!selectedReports[idx]}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setSelectedReports(prev => {
                                  const updated = [...prev];
                                  updated[idx] = val;
                                  return updated;
                                });
                              }}
                              color="primary"
                            />
                          }
                          label=""
                          sx={{ m: 0 }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={8}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              {rep.title || `Report #${idx + 1}`}
                            </Typography>
                            <Chip 
                              label={rep.severity || 'low'} 
                              size="small" 
                              color={rep.severity === 'high' ? 'error' : rep.severity === 'medium' ? 'warning' : 'info'}
                              sx={{ fontWeight: 700, textTransform: 'uppercase', height: 20 }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {rep.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                            {/* Categories */}
                            {(rep.categories || []).map((catId, catIdx) => (
                              <Chip
                                key={catIdx}
                                label={config.categories[catId]?.label.en || catId}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                              />
                            ))}
                            {/* Location */}
                            {(rep.incidentLocation?.region || rep.incidentLocation?.woreda) && (
                              <Chip
                                label={`📍 ${[rep.incidentLocation.region, rep.incidentLocation.zone, rep.incidentLocation.woreda].filter(Boolean).join(' > ')}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}
                              />
                            )}
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} sm={3} sx={{ textAlign: 'right' }}>
                        <Button
                          variant="outlined"
                          onClick={() => handleOpenEdit(idx)}
                          startIcon={<EditIcon />}
                          sx={{ borderRadius: "8px" }}
                        >
                          Review & Edit
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>

              {/* Digitize Action Buttons */}
              <Divider sx={{ my: 4 }} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setExtractedReports([]);
                    setSelectedReports([]);
                  }}
                  disabled={loading}
                  sx={{ borderRadius: "8px", px: 4, py: 1.2, fontWeight: 700, borderColor: '#cbd5e1', color: '#475569' }}
                >
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  disabled={loading}
                  onClick={() => handleBulkSubmit("draft")}
                  sx={{ 
                    borderRadius: "8px", 
                    px: 4, 
                    py: 1.2, 
                    fontWeight: 700, 
                    bgcolor: '#06b6d4', 
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#0891b2' }
                  }}
                >
                  Import Selected as Draft
                </Button>

                <Button
                  variant="contained"
                  disabled={loading}
                  onClick={() => handleBulkSubmit("unprocessed")}
                  sx={{ 
                    borderRadius: "8px", 
                    px: 4, 
                    py: 1.2, 
                    fontWeight: 700, 
                    bgcolor: '#10b981', 
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#059669' }
                  }}
                >
                  Import & Submit Selected
                </Button>
              </Stack>
            </Box>
          )}
        </>
      )}

      {/* Review Modal */}
      {editingIndex !== null && tempReport && (
        <Dialog
          open={true}
          onClose={() => {
            setEditingIndex(null);
            setTempReport(null);
          }}
          fullWidth
          maxWidth="lg"
          PaperProps={{
            sx: { borderRadius: 4, p: 2 }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
            Review & Edit Extracted Report
          </DialogTitle>
          <DialogContent dividers sx={{ py: 3 }}>
            <Report 
              report={tempReport} 
              readOnly={false} 
              onChange={setTempReport} 
              hideReportDate={true} 
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => {
                setEditingIndex(null);
                setTempReport(null);
              }}
              sx={{ borderRadius: '8px', px: 3 }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSaveEdit}
              sx={{ borderRadius: '8px', px: 3, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
            >
              Apply Changes
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar
        open={outcome.show}
        autoHideDuration={6000}
        onClose={() => setOutcome({ ...outcome, show: false })}
      >
        <Alert severity={outcome.type} sx={{ width: "100%" }}>
          {outcome.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default CreateReport;
