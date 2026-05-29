import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
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
  Chip,
  AppBar,
  Toolbar,
  Dialog,
  DialogContent,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  LocationOn as LocationIcon, 
  CalendarToday as CalendarIcon, 
  Login as LoginIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  Close as CloseIcon,
  NotificationsActive as LiveIcon,
  Warning as WarningIcon,
  Public as GlobeIcon,
  CheckCircle as CheckCircleIcon,
  FileDownload as DownloadIcon,
  TableChart as CsvIcon,
  DataObject as JsonIcon
} from '@mui/icons-material';
import { Wrapper } from "@googlemaps/react-wrapper";
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

import config from '../../config';
import MediaViewer from '../mediaViewer';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:5000/api";

// Google Incidents Map Component for Public Dashboard
const PublicIncidentMap = ({ results, onViewDetails }) => {
  const ref = React.useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [infoWindow, setInfoWindow] = useState(null);

  useEffect(() => {
    if (ref.current && !map) {
      const ethiopiaCenter = { lat: 9.145, lng: 40.4896 };
      // Limit panning/scrolling strictly inside Ethiopian borders
      const ethiopiaBounds = {
        north: 15.3,
        south: 3.2,
        west: 32.8,
        east: 48.2
      };
      
      const newMap = new window.google.maps.Map(ref.current, {
        center: ethiopiaCenter,
        zoom: 6,
        mapTypeId: "satellite",
        restriction: {
          latLngBounds: ethiopiaBounds,
          strictBounds: false
        },
        minZoom: 5.5,
        maxZoom: 14,
      });
      setMap(newMap);
      setInfoWindow(new window.google.maps.InfoWindow());
    }
  }, [ref, map]);

  useEffect(() => {
    if (!map) return;

    markers.forEach((m) => m.setMap(null));
    const newMarkers = [];

    results.forEach((r) => {
      let lat = 9.145;
      let lon = 40.4896;
      if (r.incidentGps && r.incidentGps.lat && (r.incidentGps.lon || r.incidentGps.lng)) {
        lat = parseFloat(r.incidentGps.lat);
        lon = parseFloat(r.incidentGps.lon || r.incidentGps.lng);
      } else if (r.id) {
        lat = 8.98 + (r.id % 5) * 0.05;
        lon = 38.76 + (r.id % 4) * 0.05;
      }

      const severity = r.severity?.toLowerCase() || "low";
      const markerColor = severity === "high" ? "#991b1b" : severity === "medium" ? "#ea580c" : "#2563eb";

      const svgMarker = {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: markerColor,
        fillOpacity: 0.9,
        strokeWeight: 1,
        strokeColor: "#ffffff",
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 22)
      };

      const marker = new window.google.maps.Marker({
        position: { lat, lng: lon },
        map: map,
        icon: svgMarker,
        title: r.title || "Incident"
      });

      marker.addListener("click", () => {
        if (infoWindow) {
          const contentString = `
            <div style="font-family: 'Inter', sans-serif; padding: 10px; color: #111827; max-width: 250px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">${r.title || 'Incident'}</h4>
              <div style="margin-bottom: 6px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: ${markerColor}15; color: ${markerColor}; text-transform: uppercase; letter-spacing: 0.04em;">
                  ${severity}
                </span>
              </div>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #6b7280; line-height: 1.5;">
                <strong style="color: #374151;">Region:</strong> ${r.region || 'N/A'}<br/>
                <strong style="color: #374151;">Zone:</strong> ${r.zone || 'N/A'}<br/>
                <strong style="color: #374151;">Date:</strong> ${new Date(r.incidentDateTime).toLocaleDateString()}
              </p>
              ${onViewDetails ? `
              <button 
                id="infowindow-btn-${r.id}"
                style="width: 100%; border: none; background-color: #1f2937; color: #ffffff; padding: 8px; border-radius: 6px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 11px; cursor: pointer; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#111827'"
                onmouseout="this.style.backgroundColor='#1f2937'"
              >
                View Report Details
              </button>
              ` : ''}
            </div>
          `;
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);

          if (onViewDetails) {
            window.google.maps.event.addListenerOnce(infoWindow, "domready", () => {
              const btn = document.getElementById(`infowindow-btn-${r.id}`);
              if (btn) {
                btn.addEventListener("click", () => {
                  onViewDetails(r);
                });
              }
            });
          }
        }
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    if (newMarkers.length > 0) {
      if (results.length === 1) {
        // Focus on the specific report spot inside details dialog
        const bounds = new window.google.maps.LatLngBounds();
        newMarkers.forEach((m) => bounds.extend(m.getPosition()));
        map.fitBounds(bounds);
        if (map.getZoom() > 9) {
          map.setZoom(9);
        }
      } else {
        // Keep the entire Ethiopia map focused and centered at zoom 6
        map.setCenter({ lat: 9.145, lng: 40.4896 });
        map.setZoom(6);
      }
    }
  }, [map, results]);

  return <div ref={ref} style={{ width: "100%", height: "100%", borderRadius: "12px" }} />;
};

function PublicDashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [regionChart, setRegionChart] = useState(null);
  const [categoryChart, setCategoryChart] = useState(null);
  const [yearChart, setYearChart] = useState(null);

  // Live alert ticker index
  const [tickerIndex, setTickerIndex] = useState(0);

  // Export menu anchor
  const [exportAnchorEl, setExportAnchorEl] = useState(null);

  useEffect(() => {
    fetchPublicReports();
  }, []);

  useEffect(() => {
    if (reports.length === 0) return;
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % reports.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [reports]);

  const fetchPublicReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        prepareChartData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ——— CSV and JSON Export Utilities ———
  const exportAsCSV = () => {
    setExportAnchorEl(null);
    if (!reports.length) return;
    const headers = ['Title', 'Region', 'Zone', 'Woreda', 'Severity', 'Categories', 'Incident Date', 'Description'];
    const rows = reports.map(r => [
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${r.region || ''}"`,
      `"${r.zone || ''}"`,
      `"${r.woreda || ''}"`,
      `"${r.severity || ''}"`,
      `"${(r.categories || []).map(c => config.categories[c]?.label.en || c).join('; ')}"`,
      `"${r.incidentDateTime ? new Date(r.incidentDateTime).toLocaleDateString() : ''}"`,
      `"${(r.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KEWARS_PublicAlerts_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    setExportAnchorEl(null);
    if (!reports.length) return;
    const sanitized = reports.map(r => ({
      title: r.title,
      region: r.region,
      zone: r.zone,
      woreda: r.woreda,
      severity: r.severity,
      categories: (r.categories || []).map(c => config.categories[c]?.label.en || c),
      incidentDateTime: r.incidentDateTime,
      description: r.description,
    }));
    const jsonStr = JSON.stringify(sanitized, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KEWARS_PublicAlerts_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const prepareChartData = (dataList) => {
    const regionCounts = {};
    const categoryCounts = {};
    const yearCounts = {};

    dataList.forEach((r) => {
      const region = r.region || "Unknown Region";
      regionCounts[region] = (regionCounts[region] || 0) + 1;

      (r.categories || []).forEach((cat) => {
        const label = config.categories[cat]?.label.en || cat;
        categoryCounts[label] = (categoryCounts[label] || 0) + 1;
      });

      if (r.incidentDateTime) {
        const year = new Date(r.incidentDateTime).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    const regionLabels = Object.keys(regionCounts);
    setRegionChart({
      labels: regionLabels,
      datasets: [
        {
          label: "Incidents by Region",
          data: Object.values(regionCounts),
          backgroundColor: regionLabels.map((_, i) => `rgba(37, 99, 235, ${0.35 + (i % 5) * 0.13})`),
          borderColor: "#2563eb",
          borderWidth: 1.5,
          borderRadius: 4,
        }
      ]
    });

    const catLabels = Object.keys(categoryCounts);
    setCategoryChart({
      labels: catLabels,
      datasets: [
        {
          label: "Incident Types",
          data: Object.values(categoryCounts),
          backgroundColor: [
            "#991b1b", "#ea580c", "#2563eb", "#1f2937", "#059669", "#7c3aed"
          ].slice(0, catLabels.length),
          borderWidth: 0,
        }
      ]
    });

    const yearLabels = Object.keys(yearCounts).sort();
    setYearChart({
      labels: yearLabels,
      datasets: [
        {
          label: "Incidents by Year",
          data: yearLabels.map((y) => yearCounts[y]),
          backgroundColor: "rgba(234, 88, 12, 0.6)",
          borderColor: "#ea580c",
          borderWidth: 2,
          borderRadius: 4,
        }
      ]
    });
  };

  const getSeverityColor = (severity) => {
    const s = severity?.toLowerCase();
    if (s === "high") return "error";
    if (s === "medium") return "warning";
    return "info";
  };

  const getSeverityHex = (severity) => {
    const s = severity?.toLowerCase();
    if (s === "high") return "#991b1b";
    if (s === "medium") return "#ea580c";
    return "#2563eb";
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f3f4f6', pb: 6 }}>
      {/* Professional Top Navigation Bar */}
      <AppBar position="sticky" sx={{ bgcolor: '#111827', borderBottom: '1px solid #1f2937', boxShadow: 'none' }}>
        <Toolbar sx={{ justifyContent: 'space-between', maxWidth: '1280px', width: '100%', margin: 'auto', px: { xs: 2, md: 4 } }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Corporate shield logo */}
            <Box 
              sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: '#2563eb', 
                borderRadius: '8px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="#ffffff" opacity="0.95" />
                <path d="M10 15.5L7.5 13L8.91 11.59L10 12.67L14.59 8.09L16 9.5L10 15.5Z" fill="#2563eb" />
              </svg>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: '#ffffff' }}>
              KEWARS Public Hub
            </Typography>
          </Stack>
          
          <Button 
            variant="contained" 
            startIcon={<LoginIcon />}
            onClick={() => navigate("/login")}
            sx={{ 
              borderRadius: "8px", 
              fontWeight: 600, 
              bgcolor: '#2563eb', 
              color: '#ffffff',
              '&:hover': { bgcolor: '#1d4ed8' }
            }}
          >
            Staff Portal
          </Button>
        </Toolbar>
      </AppBar>

      {/* Dynamic News Ticker Banner */}
      {reports.length > 0 && (
        <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e5e7eb', py: 1.2, px: 2 }}>
          <Stack direction="row" spacing={2.5} alignItems="center" sx={{ maxWidth: '1280px', margin: 'auto' }}>
            <Box 
              sx={{ 
                bgcolor: '#991b1b', 
                color: '#ffffff', 
                px: 1.5, 
                py: 0.4, 
                borderRadius: '6px', 
                fontSize: '0.72rem', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                display: 'flex', 
                alignItems: 'center',
                flexShrink: 0,
                letterSpacing: '0.03em'
              }}
            >
              <Box 
                sx={{ 
                  width: 6, 
                  height: 6, 
                  bgcolor: '#ffffff', 
                  borderRadius: '50%', 
                  mr: 1, 
                  animation: 'pulse-dot 1.2s infinite ease-in-out',
                  '@keyframes pulse-dot': {
                    '0%': { transform: 'scale(0.8)', opacity: 0.5 },
                    '50%': { transform: 'scale(1.3)', opacity: 1 },
                    '100%': { transform: 'scale(0.8)', opacity: 0.5 }
                  }
                }} 
              />
              Live Alert
            </Box>
            <Typography variant="body2" sx={{ color: '#111827', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              ⚠️ {reports[tickerIndex].title} ({reports[tickerIndex].region}) — Verified on {new Date(reports[tickerIndex].incidentDateTime).toLocaleDateString()}
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Main Container */}
      <Box sx={{ maxWidth: '1280px', margin: 'auto', p: { xs: 2, md: 4 } }}>
        {/* Professional Header Card */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 3, 
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Box 
              sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: '#059669',
                animation: 'pulse-live 1.8s infinite ease-in-out',
                '@keyframes pulse-live': {
                  '0%': { transform: 'scale(0.8)', opacity: 0.5 },
                  '50%': { transform: 'scale(1.3)', opacity: 1 },
                  '100%': { transform: 'scale(0.8)', opacity: 0.5 }
                }
              }} 
            />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Real-time Feeds Active
            </Typography>
          </Stack>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em", mb: 1, color: '#111827' }}>
            Public Early Warning Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '800px', lineHeight: 1.7 }}>
            Welcome to the open-access incident reporting portal. This dashboard plots fully verified and published environmental, humanitarian, and security alerts to promote community safety, regional collaboration, and transparent resource deployments.
          </Typography>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#2563eb' }} />
          </Box>
        ) : (
          <>
            {/* Professional KPI Statistics Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* KPI 1: Active Warnings */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #2563eb',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                      Active Warnings
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>
                      {reports.length}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: 'rgba(37, 99, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <WarningIcon />
                  </Box>
                </Paper>
              </Grid>

              {/* KPI 2: Critical Threats */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #991b1b',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                      Critical Threats
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#991b1b', mt: 0.5 }}>
                      {reports.filter(r => r.severity?.toLowerCase() === 'high').length}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: 'rgba(153, 27, 27, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991b1b' }}>
                    <LiveIcon />
                  </Box>
                </Paper>
              </Grid>

              {/* KPI 3: Monitored Regions */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #374151',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                      Monitored Regions
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>
                      {new Set(reports.map(r => r.region).filter(Boolean)).size}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: 'rgba(55, 65, 81, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
                    <GlobeIcon />
                  </Box>
                </Paper>
              </Grid>

              {/* KPI 4: Portal Status */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3, 
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #059669',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
                      Portal Status
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <Box 
                        sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: '#059669',
                          animation: 'pulse-active 1.8s infinite ease-in-out',
                          '@keyframes pulse-active': {
                            '0%': { transform: 'scale(0.8)', opacity: 0.5 },
                            '50%': { transform: 'scale(1.3)', opacity: 1 },
                            '100%': { transform: 'scale(0.8)', opacity: 0.5 }
                          }
                        }}
                      />
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem', textTransform: 'uppercase' }}>
                        Online
                      </Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: 'rgba(5, 150, 105, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                    <CheckCircleIcon />
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={3.5}>
              {/* 1. INTERACTIVE GIS INCIDENT DISTRIBUTION MAP */}
              <Grid item xs={12}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mb: 2, letterSpacing: '-0.02em' }}>
                  🗺️ Published Incidents GIS Mapping
                </Typography>
                <Card sx={{ width: '100%', aspectRatio: '1/1', maxHeight: '550px', mx: 'auto', p: 0.5, borderRadius: 3, border: '1px solid #d1d5db' }}>
                  <Wrapper apiKey={"AIzaSyAXk_dX6DI6jxcUdjpvKqGBiKIKjoQoMOs"}>
                    <PublicIncidentMap results={reports} onViewDetails={(r) => setSelectedReport(r)} />
                  </Wrapper>
                </Card>
              </Grid>

              {/* 2. SUMMARIZED CHARTS ROW */}
              <Grid item xs={12}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mt: 2, mb: 2, letterSpacing: '-0.02em' }}>
                  📊 Summarized Incident Metrics
                </Typography>
                <Grid container spacing={3}>
                  {/* Region Chart */}
                  <Grid item xs={12} md={5}>
                    <Card sx={{ height: '100%', borderRadius: 3 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                          <LocationIcon sx={{ color: '#2563eb' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                            Incidents by Region
                          </Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        {regionChart && (
                          <Box sx={{ height: '240px', position: 'relative' }}>
                            <Bar 
                              data={regionChart} 
                              options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                  y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#6b7280', font: { family: 'Inter' } } },
                                  x: { grid: { display: false }, ticks: { color: '#6b7280', font: { family: 'Inter' } } }
                                }
                              }} 
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Categories Pie Chart */}
                  <Grid item xs={12} sm={6} md={3.5}>
                    <Card sx={{ height: '100%', borderRadius: 3 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                          <PieChartIcon sx={{ color: '#991b1b' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                            By Incident Type
                          </Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        {categoryChart && (
                          <Box sx={{ height: '240px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            <Pie 
                              data={categoryChart} 
                              options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, family: 'Inter' }, color: '#6b7280' } } }
                              }} 
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Years Chart */}
                  <Grid item xs={12} sm={6} md={3.5}>
                    <Card sx={{ height: '100%', borderRadius: 3 }}>
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                          <TimelineIcon sx={{ color: '#ea580c' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                            Incidents by Year
                          </Typography>
                        </Stack>
                        <Divider sx={{ mb: 2 }} />
                        {yearChart && (
                          <Box sx={{ height: '240px', position: 'relative' }}>
                            <Bar 
                              data={yearChart} 
                              options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                  y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#6b7280', font: { family: 'Inter' } } },
                                  x: { grid: { display: false }, ticks: { color: '#6b7280', font: { family: 'Inter' } } }
                                }
                              }} 
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* 3. PUBLIC REPORTS LIST with Export Buttons */}
              <Grid item xs={12}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                    📁 Published Incidents Briefing Catalog
                  </Typography>
                  
                  {/* Data Export Service Buttons */}
                  {reports.length > 0 && (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => setExportAnchorEl(e.currentTarget)}
                        sx={{
                          borderColor: '#d1d5db',
                          color: '#374151',
                          fontWeight: 600,
                          borderRadius: '8px',
                          '&:hover': {
                            borderColor: '#2563eb',
                            color: '#2563eb',
                            bgcolor: 'rgba(37, 99, 235, 0.04)',
                          }
                        }}
                      >
                        Export Data
                      </Button>
                      <Menu
                        anchorEl={exportAnchorEl}
                        open={Boolean(exportAnchorEl)}
                        onClose={() => setExportAnchorEl(null)}
                        PaperProps={{
                          sx: { borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 180 }
                        }}
                      >
                        <MenuItem onClick={exportAsCSV}>
                          <ListItemIcon><CsvIcon sx={{ color: '#059669' }} /></ListItemIcon>
                          <ListItemText primary="Download CSV" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.88rem' }} />
                        </MenuItem>
                        <MenuItem onClick={exportAsJSON}>
                          <ListItemIcon><JsonIcon sx={{ color: '#2563eb' }} /></ListItemIcon>
                          <ListItemText primary="Download JSON" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.88rem' }} />
                        </MenuItem>
                      </Menu>
                    </>
                  )}
                </Stack>

                {reports.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No published reports are available in the public catalog currently.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={2.5}>
                    {reports.map((r, idx) => {
                      const sevHex = getSeverityHex(r.severity);

                      return (
                        <Grid item xs={12} key={idx}>
                          <Card 
                            onClick={() => setSelectedReport(r)}
                            sx={{ 
                              border: '1px solid #e5e7eb',
                              borderLeft: `4px solid ${sevHex}`,
                              cursor: 'pointer',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': {
                                borderColor: '#2563eb',
                                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.08)',
                                transform: 'translateY(-1px)'
                              }
                            }}
                          >
                            <CardContent>
                              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 1.5 }}>
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                  <Chip 
                                    label={r.severity || 'low'} 
                                    size="small" 
                                    sx={{ 
                                      fontWeight: 700, 
                                      textTransform: 'uppercase', 
                                      height: 22,
                                      bgcolor: `${sevHex}12`,
                                      color: sevHex,
                                      border: `1px solid ${sevHex}30`,
                                    }}
                                  />
                                  {r.categories.map((c, catIdx) => (
                                    <Chip 
                                      key={catIdx} 
                                      label={config.categories[c]?.label.en || c} 
                                      size="small" 
                                      variant="outlined" 
                                      sx={{ fontWeight: 600, height: 22, borderColor: '#d1d5db', color: '#374151' }}
                                    />
                                  ))}
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: { xs: 1, sm: 0 } }}>
                                  <CalendarIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>
                                    {new Date(r.incidentDateTime).toLocaleDateString()}
                                  </Typography>
                                </Stack>
                              </Stack>

                              <Divider sx={{ mb: 2 }} />

                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                                {r.title}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#6b7280', mb: 2, lineHeight: 1.6 }}>
                                {r.description || 'No incident description provided.'}
                              </Typography>

                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <LocationIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>
                                  Location: {r.region || 'N/A'}, {r.zone || 'N/A'}, {r.woreda || 'N/A'}
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Grid>
            </Grid>
          </>
        )}
      </Box>

      {/* Professional Detailed Report Modal */}
      <Dialog 
        open={Boolean(selectedReport)} 
        onClose={() => setSelectedReport(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: '#ffffff',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.12)',
            border: '1px solid #e5e7eb'
          }
        }}
      >
        {selectedReport && (
          <>
            {/* Modal Header – Clean dark gray */}
            <Box 
              sx={{ 
                p: 3, 
                background: '#111827',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ pr: 4 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <Chip 
                    label={selectedReport.severity || 'low'} 
                    size="small" 
                    sx={{ 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      height: 22,
                      bgcolor: `${getSeverityHex(selectedReport.severity)}30`,
                      color: '#ffffff',
                    }}
                  />
                  {selectedReport.categories.map((c, idx) => (
                    <Chip 
                      key={idx} 
                      label={config.categories[c]?.label.en || c} 
                      size="small" 
                      variant="outlined" 
                      sx={{ color: '#93c5fd', borderColor: '#3b82f6', fontWeight: 600, height: 22 }}
                    />
                  ))}
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                  {selectedReport.title}
                </Typography>
              </Box>
              <IconButton 
                onClick={() => setSelectedReport(null)}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.15)' },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <DialogContent sx={{ p: 4, bgcolor: '#f3f4f6' }}>
              <Grid container spacing={3.5}>
                {/* Left details grid */}
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#ffffff', mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', mb: 2 }}>
                      ℹ️ Incident Description
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {selectedReport.description || 'No description provided.'}
                    </Typography>
                  </Paper>

                  {/* Metadata fields */}
                  <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#ffffff' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', mb: 2.5 }}>
                      📍 Geography & Timestamp
                    </Typography>
                    <Stack spacing={2.5}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(37, 99, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                          <LocationIcon />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Incident Location
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {selectedReport.region || 'N/A'}, {selectedReport.zone || 'N/A'}, {selectedReport.woreda || 'N/A'}
                            {selectedReport.otherLocation && ` (${selectedReport.otherLocation})`}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(234, 88, 12, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
                          <CalendarIcon />
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Incident Date & Time
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                            {new Date(selectedReport.incidentDateTime).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                {/* Right media & maps grid */}
                <Grid item xs={12} md={5}>
                  {/* Media viewer */}
                  {selectedReport.mediaFiles && selectedReport.mediaFiles.length > 0 ? (
                    <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#ffffff', mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', mb: 2 }}>
                        📎 Attached Evidence ({selectedReport.mediaFiles.length})
                      </Typography>
                      <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #d1d5db' }}>
                        <MediaViewer links={selectedReport.mediaFiles} />
                      </Box>
                    </Paper>
                  ) : (
                    <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#ffffff', mb: 3, textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No media attachments uploaded for this alert.
                      </Typography>
                    </Paper>
                  )}

                  {/* Micro Incident Map */}
                  <Paper sx={{ p: 0.5, borderRadius: 3, border: '1px solid #d1d5db', bgcolor: '#ffffff', width: '100%', aspectRatio: '1/1', maxHeight: '280px' }}>
                    <Wrapper apiKey={"AIzaSyAXk_dX6DI6jxcUdjpvKqGBiKIKjoQoMOs"}>
                      <PublicIncidentMap results={[selectedReport]} mapTypeId="satellite" />
                    </Wrapper>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default PublicDashboard;
