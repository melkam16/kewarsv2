import React, { useContext, useEffect, useState } from "react";
import {
  Snackbar,
  Button,
  Paper,
  Stack,
  Alert,
  Grid,
  Box,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import withProtectedRoute from "../common/ProtectedRoute";
import Report from "../report";
import CombinedReport from "../combinedReport";
import ConfirmLoadDraft from "../Dialogs/ConfirmLoadDraft";
import { ReportStatus } from "../../config";

import API_BASE from '../../api/apiBase';
const fullWidth = 12;

function ReportDetail({ readOnly }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [edited, setEdited] = useState({ draft: false, main: false });
  const [report, setReport] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [outcome, setOutcome] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [draft, setDraft] = useState(null);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const handleConfirmDraftLoad = () => {
    setReport(draft);
    validateReport(draft);
    setEdited({ draft: false, main: true });
    setDraft(null);
    setShowDraftConfirm(false);
  };

  // ---------------- FETCH REPORT ----------------
  const getReportDetail = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        headers: authHeaders,
      });

      const data = await res.json();
      setReport(data.latest);
      validateReport(data.latest);

      await getDraftReport(data.latest.latestVersion);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- FETCH DRAFT ----------------
  const getDraftReport = async (latestVersion) => {
    try {
      const res = await fetch(
        `${API_BASE}/reports/${id}/drafts?revision=${latestVersion}`,
        { headers: authHeaders }
      );

      if (res.ok) {
        const draftData = await res.json();
        if (draftData) {
          setDraft(draftData);
          setShowDraftConfirm(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- SAVE DRAFT ----------------
  const saveDraft = async () => {
    try {
      await fetch(`${API_BASE}/reports/${id}/drafts`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ report }),
      });

      setOutcome({
        show: true,
        message: "Successfully saved draft",
        type: "success",
      });

      setEdited({ draft: false, main: true });
    } catch (err) {
      setOutcome({
        show: true,
        message: "Error saving draft",
        type: "error",
      });
    }
  };

  // ---------------- PUBLISH ----------------
  const publishReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          report,
          status: ReportStatus.published,
        }),
      });

      const updated = await res.json();
      setReport(updated);

      setOutcome({
        show: true,
        message: "Successfully published report",
        type: "success",
      });

      setEdited({ draft: false, main: false });
    } catch (err) {
      setOutcome({
        show: true,
        message: "Error publishing report",
        type: "error",
      });
    }
  };

  // ---------------- REJECT ----------------
  const rejectReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          report,
          status: ReportStatus.rejected,
        }),
      });

      const updated = await res.json();
      setReport(updated);

      setOutcome({
        show: true,
        message: "Successfully rejected report",
        type: "success",
      });

      setEdited({ draft: false, main: false });
    } catch (err) {
      setOutcome({
        show: true,
        message: "Error rejecting report",
        type: "error",
      });
    }
  };

  // ---------------- CHANGE HANDLER ----------------
  const onChange = (updatedReport) => {
    setReport(updatedReport);
    validateReport(updatedReport);
    setEdited({ draft: true, main: true });
  };

  // ---------------- VALIDATION ----------------
  const validateReport = (report) => {
    let errors = [];

    if (!report?.reportId) errors.push("Invalid report id");
    if (report?.latestVersion > 100)
      errors.push("Too many revisions");

    if (!report?.categories?.length)
      errors.push("No categories selected");

    if (
      !report?.incidentLocation?.region ||
      !report?.incidentLocation?.zone ||
      !report?.incidentLocation?.woreda
    )
      errors.push("Missing location info");

    if (!report?.incidentGps?.lat || !report?.incidentGps?.lon)
      errors.push("Missing GPS info");

    if (!report?.incidentDateTime)
      errors.push("Missing date/time");

    if (!report?.severity)
      errors.push("Missing severity");

    setIsValid(errors.length === 0);
  };

  const isReadOnly = () =>
    readOnly ||
    report?.status === ReportStatus.rejected ||
    report?.status === ReportStatus.published;

  useEffect(() => {
    if (!report && token) {
      getReportDetail();
    }
  }, [token]);

  // ---------------- UI ----------------
  return (
    <Paper elevation={3} sx={{ mx: 5, pb: 2 }}>
      <Stack direction="row" spacing={2}>
        <h2>
          Report Detail {report && `(v${report.latestVersion})`}
        </h2>
        <Chip
          label={report?.status}
          color={
            report?.status === ReportStatus.rejected
              ? "warning"
              : "success"
          }
        />
      </Stack>

      {report ? (
        <>
          {report.combinedReport ? (
            <CombinedReport
              report={report}
              onChange={onChange}
              readOnly={isReadOnly()}
            />
          ) : (
            <Report
              report={report}
              onChange={onChange}
              readOnly={isReadOnly()}
            />
          )}

          {!isReadOnly() && (
            <>
              <Grid item xs={fullWidth} sx={{ mt: 2 }}>
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="center"
                >
                  <Button onClick={() => navigate(-1)}>
                    Cancel
                  </Button>

                  <Button
                    variant="contained"
                    disabled={!edited.draft}
                    onClick={saveDraft}
                  >
                    Save Draft
                  </Button>

                  <Button
                    variant="contained"
                    color="success"
                    disabled={!isValid}
                    onClick={publishReport}
                  >
                    Publish
                  </Button>

                  <Button
                    variant="contained"
                    color="error"
                    onClick={rejectReport}
                  >
                    Reject
                  </Button>
                </Stack>
              </Grid>

              <Snackbar
                open={outcome.show}
                autoHideDuration={6000}
                onClose={() =>
                  setOutcome({ show: false, message: "", type: "success" })
                }
              >
                <Alert severity={outcome.type}>
                  {outcome.message}
                </Alert>
              </Snackbar>
            </>
          )}
        </>
      ) : (
        <Box display="flex">
          <CircularProgress sx={{ m: "auto" }} />
        </Box>
      )}

      <ConfirmLoadDraft
        show={showDraftConfirm}
        onConfirm={handleConfirmDraftLoad}
        onCancel={() => setShowDraftConfirm(false)}
      />
    </Paper>
  );
}

// Wrap with protected route
export default function WrappedReportDetail() {
  const { userRoles } = useContext(AuthContext);

  const ProtectedReportDetail = withProtectedRoute(ReportDetail);

  return <ProtectedReportDetail userRoles={userRoles} pathRoles="analyst,admin" />;
}