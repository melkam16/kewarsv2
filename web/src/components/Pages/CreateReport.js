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
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import Report from "../report";

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
