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
  IconButton,
  Divider,
} from "@mui/material";
import { 
  CloudUpload as CloudUploadIcon, 
  Delete as DeleteIcon, 
  Movie as MovieIcon, 
  Description as DescriptionIcon,
  AudioFile as AudioIcon
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import Report from "../report";

import API_BASE from '../../api/apiBase';

function CreateReport() {
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);
  const [outcome, setOutcome] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [report, setReport] = useState({
    reporter: user ? { sub: user.sub, name: user.name } : null,
    title: "",
    description: "",
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
    // Preserve mediaFiles when form changes
    const reportToValidate = {
      ...updatedReport,
      mediaFiles: report.mediaFiles,
    };
    setReport(reportToValidate);
    validateReport(reportToValidate);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result;

        // Add to local preview state
        setLocalFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
            preview: base64Data,
          },
        ]);

        // Add to report mediaFiles
        setReport((prev) => {
          const updatedMedia = [...(prev.mediaFiles || []), base64Data];
          const updatedReport = { ...prev, mediaFiles: updatedMedia };
          validateReport(updatedReport);
          return updatedReport;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index) => {
    setLocalFiles((prev) => prev.filter((_, i) => i !== index));
    setReport((prev) => {
      const updatedMedia = (prev.mediaFiles || []).filter((_, i) => i !== index);
      const updatedReport = { ...prev, mediaFiles: updatedMedia };
      validateReport(updatedReport);
      return updatedReport;
    });
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

  return (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #e2e8f0", bgcolor: '#ffffff' }}>
      {/* Premium Glassmorphic Header Card */}
      <Box 
        sx={{ 
          p: 4, 
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

      {/* Main Core Form */}
      <Report report={report} readOnly={false} onChange={onChange} hideReportDate={true} />

      {/* Visual Media & Files Attachment Section */}
      <Divider sx={{ my: 4 }} />
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
          Rich Media & Document Attachments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Attach evidence files like eyewitness photos, drone footage, audio records, or official PDF briefings.
        </Typography>
      </Box>

      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          mt: 2, 
          borderRadius: 4, 
          border: '2px dashed #06b6d4', 
          bgcolor: 'rgba(6, 182, 212, 0.01)',
          textAlign: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(6, 182, 212, 0.04)',
            borderColor: '#22d3ee',
            transform: 'translateY(-2px)'
          }
        }}
      >
        <input
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx"
          style={{ display: 'none' }}
          id="media-upload-input"
          multiple
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="media-upload-input" style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
          <Box sx={{ p: 2 }}>
            <CloudUploadIcon sx={{ fontSize: 56, color: '#06b6d4', mb: 1, filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.35))' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Drag & Drop or Click to Attach Files
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Supports Images (JPG/PNG), Videos (MP4), Documents (PDF/Word), and Audio (MP3/WAV)
            </Typography>
          </Box>
        </label>
      </Paper>

      {/* Uploaded File Previews Grid */}
      {localFiles.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 2 }}>
            Attached Media Files ({localFiles.length})
          </Typography>
          <Grid container spacing={2}>
            {localFiles.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              const isVideo = file.type.startsWith('video/');
              const isAudio = file.type.startsWith('audio/');

              return (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      borderRadius: 3, 
                      border: '1px solid #e2e8f0', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      bgcolor: '#f8fafc',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#cbd5e1',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
                      }
                    }}
                  >
                    {isImage ? (
                      <Box sx={{ width: 50, height: 50, borderRadius: 2, overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                        <img src={file.preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                    ) : (
                      <Box sx={{ width: 50, height: 50, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(15, 23, 42, 0.05)', color: '#0f172a', flexShrink: 0 }}>
                        {isVideo ? <MovieIcon /> : isAudio ? <AudioIcon /> : <DescriptionIcon />}
                      </Box>
                    )}

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {file.size}
                      </Typography>
                    </Box>

                    <IconButton 
                      onClick={() => removeFile(idx)} 
                      size="small" 
                      sx={{ 
                        color: '#ef4444', 
                        bgcolor: 'rgba(239, 68, 68, 0.05)',
                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.15)' }
                      }}
                    >
                      <DeleteIcon size="small" />
                    </IconButton>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Submission Buttons Block */}
      <Divider sx={{ my: 4 }} />
      <Grid item xs={12}>
        <Stack direction="row" spacing={2} justifyContent="center">
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
