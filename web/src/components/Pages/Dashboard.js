import { useNavigate } from "react-router-dom";
import {
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Box,
  Divider,
} from "@mui/material";
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
import { Bar } from "react-chartjs-2";
import { useState, useEffect, useContext } from "react";

import AssessmentIcon from '@mui/icons-material/Assessment';
import PublishIcon from '@mui/icons-material/Publish';
import DraftsIcon from '@mui/icons-material/Drafts';
import WarningIcon from '@mui/icons-material/Warning';

import { AuthContext } from "../contexts/AuthContext";

const API_BASE = "http://localhost:5000/api";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getStats();
  }, [token]);

  const getStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ resultsPerPage: 0 }),
      });
      const data = await res.json();
      setStats(data?.aggregations || null);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChartClick = (field, bucket) => {
    if (!bucket) return;

    const to = bucket.to ? `&filters[0][values][0][to]=${bucket.to}` : "";
    const from = bucket.from ? `&filters[0][values][0][from]=${bucket.from}` : "";
    const value = bucket.key;

    navigate(
      `/reports?filters[0][field]=${field}${to}${from}&filters[0][values][0]=${value}&filters[0][type]=any`
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size={60} thickness={4} sx={{ color: "#2563eb" }} />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3, border: "1px solid #e5e7eb" }}>
        <Typography variant="h6" color="text.secondary">No data available or failed to load statistics.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Please ensure the backend database has been populated and you are logged in.</Typography>
      </Paper>
    );
  }

  // Calculate dynamic stats
  const totalCount = stats?.status?.buckets?.reduce((acc, b) => acc + b.doc_count, 0) || 0;
  const publishedCount = stats?.status?.buckets?.find(b => b.key === 'published')?.doc_count || 0;
  const draftsCount = stats?.status?.buckets?.find(b => b.key === 'draft')?.doc_count || 0;
  const criticalCount = stats?.severity?.buckets?.find(b => b.key?.toLowerCase() === 'high')?.doc_count || 
                        stats?.severity?.buckets?.find(b => b.key?.toLowerCase() === 'critical')?.doc_count || 0;

  // KPI card definitions with humanitarian palette
  const kpiCards = [
    {
      label: "Total Reports",
      value: totalCount,
      subtitle: "Across all regions",
      icon: <AssessmentIcon />,
      accentColor: "#2563eb",      // Blue
      iconBg: "rgba(37, 99, 235, 0.1)",
    },
    {
      label: "Published",
      value: publishedCount,
      subtitle: "Validated and active",
      icon: <PublishIcon />,
      accentColor: "#059669",      // Emerald
      iconBg: "rgba(5, 150, 105, 0.1)",
    },
    {
      label: "Pending Drafts",
      value: draftsCount,
      subtitle: "Awaiting validation",
      icon: <DraftsIcon />,
      accentColor: "#ea580c",      // Orange
      iconBg: "rgba(234, 88, 12, 0.1)",
    },
    {
      label: "Critical Severity",
      value: criticalCount,
      subtitle: "High priority actions",
      icon: <WarningIcon />,
      accentColor: "#991b1b",      // Dark Red
      iconBg: "rgba(153, 27, 27, 0.1)",
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", mb: 0.5 }}>
          Command Center
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time threat assessments, incident tracking, and regional analytics.
        </Typography>
      </Box>

      {/* KPI Cards Grid – White cards with left accent borders */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card 
              sx={{ 
                bgcolor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderLeft: `4px solid ${card.accentColor}`,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
                }
              }}
            >
              <CardContent sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, mb: 0.5, letterSpacing: "-0.03em", color: "#111827" }}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: card.accentColor, fontWeight: 500 }}>
                    {card.subtitle}
                  </Typography>
                </Box>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.accentColor }}>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* INCIDENT DATE */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 3, 
              border: "1px solid #e5e7eb", 
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
              }
            }}
          >
            <Box sx={{ px: 3, pt: 3, pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827" }}>
                Incident Trends
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Weekly timeline distribution
              </Typography>
            </Box>
            <Divider sx={{ mx: 3 }} />
            <CardContent sx={{ p: 3, pt: 1 }}>
              <Bar
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      grid: { color: "rgba(0,0,0,0.04)" },
                      ticks: { color: "#6b7280", font: { family: "Inter" } }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: "#6b7280", font: { family: "Inter" } }
                    }
                  },
                  onClick: (evt, element) => {
                    if (!element.length) return;
                    const bucket = stats?.incidentDateTime?.buckets?.[element[0].index];
                    handleChartClick("incidentDateTime", bucket);
                  },
                }}
                data={{
                  labels: stats?.incidentDateTime?.buckets?.map((b) => b.key) || [],
                  datasets: [
                    {
                      label: "Count",
                      data: stats?.incidentDateTime?.buckets?.map((b) => b.doc_count) || [],
                      backgroundColor: "rgba(37, 99, 235, 0.7)",
                      borderColor: "#2563eb",
                      borderWidth: 1.5,
                      borderRadius: 4,
                      hoverBackgroundColor: "rgba(37, 99, 235, 0.9)",
                    },
                  ],
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* BY REGION */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 3, 
              border: "1px solid #e5e7eb", 
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
              }
            }}
          >
            <Box sx={{ px: 3, pt: 3, pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827" }}>
                Reports by Region
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Geographic volume distribution
              </Typography>
            </Box>
            <Divider sx={{ mx: 3 }} />
            <CardContent sx={{ p: 3, pt: 1 }}>
              <Bar
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      grid: { color: "rgba(0,0,0,0.04)" },
                      ticks: { color: "#6b7280", font: { family: "Inter" } }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: "#6b7280", font: { family: "Inter" } }
                    }
                  },
                  onClick: (evt, element) => {
                    if (!element.length) return;
                    const bucket = stats?.byRegion?.buckets?.[element[0].index];
                    handleChartClick("byRegion", bucket);
                  },
                }}
                data={{
                  labels: stats?.byRegion?.buckets?.map((b) => b.key) || [],
                  datasets: [
                    {
                      label: "Count",
                      data: stats?.byRegion?.buckets?.map((b) => b.doc_count) || [],
                      backgroundColor: "rgba(234, 88, 12, 0.7)",
                      borderColor: "#ea580c",
                      borderWidth: 1.5,
                      borderRadius: 4,
                      hoverBackgroundColor: "rgba(234, 88, 12, 0.9)",
                    },
                  ],
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* STATUS */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 3, 
              border: "1px solid #e5e7eb", 
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
              }
            }}
          >
            <Box sx={{ px: 3, pt: 3, pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827" }}>
                Reports by Status
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Workflow status distribution
              </Typography>
            </Box>
            <Divider sx={{ mx: 3 }} />
            <CardContent sx={{ p: 3, pt: 1 }}>
              <Bar
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      grid: { color: "rgba(0,0,0,0.04)" },
                      ticks: { color: "#6b7280", font: { family: "Inter" } }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { color: "#6b7280", font: { family: "Inter" } }
                    }
                  },
                  onClick: (evt, element) => {
                    if (!element.length) return;
                    const bucket = stats?.status?.buckets?.[element[0].index];
                    handleChartClick("status", bucket);
                  },
                }}
                data={{
                  labels: stats?.status?.buckets?.map((b) => b.key) || [],
                  datasets: [
                    {
                      label: "Count",
                      data: stats?.status?.buckets?.map((b) => b.doc_count) || [],
                      backgroundColor: "rgba(153, 27, 27, 0.7)",
                      borderColor: "#991b1b",
                      borderWidth: 1.5,
                      borderRadius: 4,
                      hoverBackgroundColor: "rgba(153, 27, 27, 0.9)",
                    },
                  ],
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;