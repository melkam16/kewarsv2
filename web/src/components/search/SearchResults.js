import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { 
  Grid, 
  Card, 
  Box, 
  Button, 
  CardContent, 
  Typography, 
  CardActions, 
  Checkbox,
  Chip,
  Stack,
  Divider,
  FormGroup,
  FormControlLabel,
  Switch,
  AppBar,
  Toolbar,
} from '@mui/material';
import { 
  LocationOn as LocationIcon, 
  CalendarToday as CalendarIcon, 
  Layers as LayersIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { Wrapper } from "@googlemaps/react-wrapper";
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from "@emotion/react";

import "@elastic/react-search-ui-views/lib/styles/styles.css";

import CombineReports from "../Dialogs/CombineReports";
import { EthDateTimeConverter } from "../../ethDateTime";
import config from '../../config';

const theme = createTheme({  
  palette: {
    neutral: {
      main: '#1f2937',      // Dark Gray
      light: '#374151',     // Gray 700
      dark: '#111827',      // Gray 900
      contrastText: '#ffffff',
    },
  },
});

// Interactive Google Incident Map Component
const IncidentMap = ({ results }) => {
  const navigate = useNavigate();
  const ref = React.useRef(null);
  const [map, setMap] = React.useState(null);
  const [markers, setMarkers] = React.useState([]);
  const [infoWindow, setInfoWindow] = React.useState(null);

  useEffect(() => {
    if (ref.current && !map) {
      const ethiopiaCenter = { lat: 9.145, lng: 40.4896 };
      const newMap = new window.google.maps.Map(ref.current, {
        center: ethiopiaCenter,
        zoom: 6,
        mapTypeId: "satellite"
      });
      setMap(newMap);
      setInfoWindow(new window.google.maps.InfoWindow());
    }
  }, [ref, map]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach((m) => m.setMap(null));
    const newMarkers = [];

    results.forEach((r) => {
      const lat = parseFloat(r.incidentGps?.raw?.lat);
      const lon = parseFloat(r.incidentGps?.raw?.lon);

      if (isNaN(lat) || isNaN(lon)) return;

      const severity = r.severity?.raw?.toLowerCase() || "low";
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
        title: r.title?.raw || "Incident"
      });

      marker.addListener("click", () => {
        if (infoWindow) {
          const region = r.incidentLocation?.raw?.region || "N/A";
          const zone = r.incidentLocation?.raw?.zone || "N/A";
          const woreda = r.incidentLocation?.raw?.woreda || "N/A";

          const contentString = `
            <div style="font-family: 'Inter', sans-serif; padding: 10px; color: #111827; max-width: 250px;">
              <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">${r.title?.raw || 'Incident'}</h4>
              <div style="margin-bottom: 8px;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: ${markerColor}15; color: ${markerColor}; text-transform: uppercase;">
                  ${severity}
                </span>
                <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; background-color: #f3f4f6; color: #6b7280; margin-left: 6px; text-transform: uppercase;">
                  ${r.status?.raw || 'unprocessed'}
                </span>
              </div>
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
                <strong style="color: #374151;">Location:</strong> ${region}, ${zone}, ${woreda}
              </p>
              <button 
                id="infowindow-btn-${r.id?.raw}"
                style="width: 100%; border: none; background-color: #1f2937; color: #ffffff; padding: 8px; border-radius: 6px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 11px; cursor: pointer; transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='#111827'"
                onmouseout="this.style.backgroundColor='#1f2937'"
              >
                View Report Details
              </button>
            </div>
          `;
          infoWindow.setContent(contentString);
          infoWindow.open(map, marker);

          window.google.maps.event.addListenerOnce(infoWindow, "domready", () => {
            const btn = document.getElementById(`infowindow-btn-${r.id?.raw}`);
            if (btn) {
              btn.addEventListener("click", () => {
                navigate(`/reports/${r.id?.raw}`);
              });
            }
          });
        }
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach((m) => bounds.extend(m.getPosition()));
      map.fitBounds(bounds);
      
      if (newMarkers.length === 1) {
        map.setZoom(8);
      }
    }
  }, [map, results]);

  return <div ref={ref} style={{ width: "100%", height: "100%", borderRadius: "12px" }} />;
};

const SearchResults = ({ results = [] }) => {
  const history = useNavigate();
  const [isGridView, setIsGridView] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showCombineReports, setShowCombineReports] = useState(false);
  const [selectedReports, setSelectedReports] = useState([]);
  const [checkBoxStates, setCheckBoxStates] = useState({});

  const combineReports = () => {
    setShowCombineReports(true);
  };

  const checkBoxChanged = (reportId, e) => {
    setCheckBoxStates({ ...checkBoxStates, [reportId]: e.target.checked });

    if (e.target.checked) {
      setSelectedReports([...selectedReports, reportId]);
    } else {
      setSelectedReports(selectedReports.filter(r => r !== reportId));
    }
  };

  const viewDetailClicked = (reportId) => {
    history(`/reports/${reportId}`);
  };

  const onCombineClosed = () => {
    setShowCombineReports(false);
    window.location.reload(false);
  };

  const clearSelections = () => {
    setSelectedReports([]);
    setCheckBoxStates({});
  };

  // Color mapper helper for severity chip
  const getSeverityColor = (severity) => {
    const s = severity?.toLowerCase();
    if (s === "high") return "error";
    if (s === "medium") return "warning";
    return "success";
  };

  return (
    <React.Fragment>
      <CombineReports data={selectedReports} open={showCombineReports} onCombineClosed={onCombineClosed} />

      {results.length > 0 && (
        <AppBar 
          position="sticky" 
          sx={{ 
            bgcolor: '#ffffff', 
            borderBottom: '1px solid #e5e7eb', 
            boxShadow: 'none',
            zIndex: 100,
            mb: 2,
            borderRadius: 3
          }}
        >
          <ThemeProvider theme={theme}>
            <Toolbar sx={{ justifyContent: 'space-between', px: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button 
                  variant="outlined" 
                  onClick={clearSelections} 
                  disabled={selectedReports.length === 0}
                  sx={{ borderRadius: "8px", fontWeight: 700 }}
                >
                  Unselect ({selectedReports.length})
                </Button>
                <Button 
                  variant="contained" 
                  color="neutral" 
                  onClick={combineReports} 
                  disabled={selectedReports.length < 2}
                  sx={{ borderRadius: "8px", fontWeight: 700 }}
                >
                  Combine Reports ({selectedReports.length})
                </Button>
              </Stack>
              <Stack direction="row" spacing={3} alignItems="center">
                <FormGroup>
                  <FormControlLabel 
                    control={<Switch checked={showMap} onChange={() => setShowMap(!showMap)} />}                     label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#4b5563' }}>Show Map</Typography>} 
                  />
                </FormGroup>
                <FormGroup>
                  <FormControlLabel 
                    control={<Switch checked={isGridView} onChange={() => setIsGridView(!isGridView)} />}                     label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#4b5563' }}>Grid Layout</Typography>} 
                  />
                </FormGroup>
              </Stack>
            </Toolbar>
          </ThemeProvider>
        </AppBar>
      )}

      {/* Interactive Incidents Map Overview Card */}
      {showMap && results.length > 0 && (
        <Box sx={{ width: "100%", height: "380px", mb: 3 }}>
          <Card 
            sx={{ 
              height: "100%", 
              p: 0.5, 
              borderRadius: 4, 
              border: '1px solid #d1d5db', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)' 
            }}
          >
            <Wrapper apiKey={"AIzaSyAXk_dX6DI6jxcUdjpvKqGBiKIKjoQoMOs"}>
              <IncidentMap results={results} />
            </Wrapper>
          </Card>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {isGridView ? (
        <Box sx={{ width: '100%' }}>
          <Grid container spacing={2.5}>
            {results.length > 0 &&
              results.map((result, index) => {
                const sevColor = getSeverityColor(result.severity?.raw);

                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card 
                      sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 16px rgba(37, 99, 235, 0.06)',
                          borderColor: '#2563eb'
                        }
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        {/* Tags / Badges Header Row */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                          <Stack direction="row" spacing={0.5} sx={{ minWidth: 0 }}>
                            {result.categories?.raw?.slice(0, 2).map((category, catIndex) => (
                              <Chip 
                                key={catIndex} 
                                label={config.categories[category]?.label.en || category} 
                                size="small" 
                                variant="outlined" 
                                color="primary"
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                              />
                            ))}
                          </Stack>
                          <Stack direction="row" spacing={0.5}>
                            <Chip 
                              label={result.severity?.raw || 'low'} 
                              size="small" 
                              color={sevColor} 
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}
                            />
                            <Chip 
                              label={result.status?.raw} 
                              size="small" 
                              variant={result.status?.raw === 'unprocessed' ? 'outlined' : 'filled'}
                              color="secondary" 
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                            />
                          </Stack>
                        </Stack>

                        <Divider sx={{ mb: 2 }} />

                        {/* Incident Title */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', mb: 1.5, lineHeight: 1.3 }}>
                          {result.title?.raw}
                        </Typography>

                        {/* Location Details */}
                        <Stack spacing={1} sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <LocationIcon sx={{ fontSize: 18, color: '#2563eb', mt: 0.2 }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                                {config.locations[result?.incidentLocation?.raw?.region]?.label.en || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {result?.incidentLocation?.raw?.zone || 'N/A'} • {result?.incidentLocation?.raw?.woreda || 'N/A'}
                              </Typography>
                            </Box>
                          </Stack>

                          {/* Date details */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, color: '#6b7280' }}>
                              {new Date(result.incidentDateTime?.raw).toDateString()} 
                              {result.incidentDateTime?.raw && ` (${EthDateTimeConverter.getEthiopianDateTimeFromMillis(new Date(result.incidentDateTime?.raw).getTime()).toDateString()} ETH)`}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>

                      <Divider sx={{ mt: 'auto' }} />

                      {/* Actions Footer Bar */}
                      <CardActions sx={{ px: 2, py: 1.5, justifyContent: 'space-between', bgcolor: '#f9fafb' }}>
                        <Button 
                          size="small" 
                          variant="contained" 
                          startIcon={<VisibilityIcon />}
                          onClick={() => viewDetailClicked(result.reportId?.raw)}
                          sx={{ borderRadius: "8px", fontWeight: 700 }}
                        >
                          Details
                        </Button>
                        <FormGroup>
                          <FormControlLabel 
                            control={
                              <Checkbox 
                                size="small" 
                                color="secondary"
                                onChange={(e) => checkBoxChanged(result.reportId?.raw, e)} 
                                checked={checkBoxStates[result.reportId?.raw] || false}
                              />
                            }
                            label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>Combine?</Typography>} 
                          />
                        </FormGroup>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
        </Box>
      ) : (
        <Box sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            {results.length > 0 &&
              results.map((result, index) => {
                const sevColor = getSeverityColor(result.severity?.raw);

                return (
                  <Grid item xs={12} key={index}>
                    <Card 
                      sx={{ 
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.06)',
                          borderColor: '#2563eb'
                        }
                      }}
                    >
                      <CardContent>
                        {/* List Row Badges Row */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                          <Stack direction="row" spacing={1}>
                            <Chip 
                              label={result?.status.raw} 
                              size="small" 
                              variant={result?.status.raw === 'unprocessed' ? 'outlined' : 'filled'}
                              color="secondary" 
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip 
                              label={result.severity?.raw || 'low'} 
                              size="small" 
                              color={sevColor} 
                              sx={{ fontWeight: 700, textTransform: 'uppercase' }}
                            />
                            {result?.categories?.raw.map((category, catIndex) => (
                              <Chip 
                                key={catIndex} 
                                label={config.categories[category]?.label.en || category} 
                                size="small" 
                                variant="outlined" 
                                color="primary" 
                                sx={{ fontWeight: 600 }}
                              />
                            ))}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {(result?.sourceReports?.raw?.length) ? <Chip icon={<LayersIcon />} size="small" label="Combined Report" variant="outlined" color="info" /> : 'Single Assessment'}
                          </Typography>
                        </Stack>

                        <Divider sx={{ mb: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={8}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1.2 }}>
                              {result.title?.raw}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineBreak: 'auto', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {result?.description?.raw || 'No incident description provided.'}
                            </Typography>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <LocationIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>
                                  {config.locations[result?.incidentLocation?.raw?.region]?.label.en || 'N/A'}, {result?.incidentLocation?.raw?.zone || 'N/A'}, {result?.incidentLocation?.raw?.woreda || 'N/A'}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <CalendarIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                                <Typography variant="caption" sx={{ fontWeight: 500, color: '#6b7280' }}>
                                  {new Date(result.incidentDateTime?.raw).toDateString()}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Grid>

                          <Grid item xs={12} md={4} sx={{ borderLeft: { md: '1px solid #e5e7eb' }, pl: { md: 3 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                              <strong>Location Other:</strong> {result?.incidentLocation?.raw?.other || 'None'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
                              <strong>Has Media:</strong> {result?.hasMedia?.raw ? 'Yes' : 'No'}
                            </Typography>

                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                              <Button 
                                size="small" 
                                variant="contained" 
                                startIcon={<VisibilityIcon />}
                                onClick={() => viewDetailClicked(result.reportId?.raw)}
                                sx={{ borderRadius: "8px", fontWeight: 700 }}
                              >
                                Details
                              </Button>
                              <FormGroup>
                                <FormControlLabel 
                                  control={
                                    <Checkbox 
                                      size="small" 
                                      color="secondary"
                                      onChange={(e) => checkBoxChanged(result.reportId?.raw, e)} 
                                      checked={checkBoxStates[result.reportId?.raw] || false}
                                    />
                                  }
                                  label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>Combine</Typography>} 
                                />
                              </FormGroup>
                            </Stack>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
        </Box>
      )}
    </React.Fragment>
  );
};

export default SearchResults;