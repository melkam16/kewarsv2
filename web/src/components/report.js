import React, { useContext } from "react";
import {
  Stack,
  FormControl, 
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Box,
  AccordionSummary, Accordion, AccordionDetails,
  Badge,
  Divider,
  CircularProgress,
  Paper,
  IconButton,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  LocalizationProvider,
  DateTimePicker,
} from '@mui/lab'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { 
  CloudUpload as CloudUploadIcon, 
  Delete as DeleteIcon, 
  Movie as MovieIcon, 
  Description as DescriptionIcon,
  AudioFile as AudioIcon
} from "@mui/icons-material";
import set from 'lodash.set';
import get from 'lodash.get';
import DayjsUtils from '@date-io/dayjs';
import { geoCentroid, geoContains } from 'd3-geo';
import CategorySelect from './categoriesSelect';
import LocationSelector from './LocationSelector';
import MapContainer from './mapContainer';
import Reporter from './reporter';
import MediaViewer from "./mediaViewer";
import ethiopia from './ethiopia.geo.json';
import config from '../config';
import { AuthContext } from './contexts/AuthContext';
import API_BASE from '../api/apiBase';

const fullWidth = 12;
const halfWidth = fullWidth/2;

const convertUtcIsoToLocal = (dateTime) => {
  return new Date(dateTime).toString();
}

const convertDateTimeToIso8601 = (dateTime) => {
  console.log(new Date(dateTime['$d']).toISOString());
  return new Date(dateTime['$d']).toISOString();
};

function Report({ report, readOnly, onChange, hideReportDate = false }) {
  const [edited, setEdited] = React.useState(false);
  const { token } = useContext(AuthContext);
  const [localFiles, setLocalFiles] = React.useState([]);
  const [outcome, setOutcome] = React.useState({ show: false, message: "", type: "success" });

  React.useEffect(() => {
    if (report?.mediaFiles) {
      setLocalFiles((prev) => {
        const currentUrls = prev.map(f => {
          if (f.preview && f.preview.includes('/reports/media?url=')) {
            return decodeURIComponent(f.preview.split('/reports/media?url=')[1]);
          }
          return f.preview;
        });
        const reportUrls = report.mediaFiles;
        
        const isIdentical = currentUrls.length === reportUrls.length && currentUrls.every((url, i) => url === reportUrls[i]);
        if (isIdentical) return prev;

        return reportUrls.map(url => {
          const existing = prev.find(f => {
            const rawPreview = f.preview && f.preview.includes('/reports/media?url=')
              ? decodeURIComponent(f.preview.split('/reports/media?url=')[1])
              : f.preview;
            return rawPreview === url;
          });
          if (existing) return existing;

          let name = "file";
          try {
            const cleanUrl = url.split('?')[0].split('#')[0];
            const parts = cleanUrl.split('/');
            const filenamePart = parts[parts.length - 1];
            name = decodeURIComponent(filenamePart);
          } catch (e) {}

          let type = "application/octet-stream";
          const ext = name.split('.').pop().toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = `image/${ext}`;
          else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) type = `video/${ext}`;
          else if (['mp3', 'wav', 'ogg'].includes(ext)) type = `audio/${ext}`;
          else if (ext === 'pdf') type = 'application/pdf';

          const previewUrl = (typeof url === 'string' && url.startsWith('https://') && url.includes('.blob.vercel-storage.com'))
            ? `${API_BASE}/reports/media?url=${encodeURIComponent(url)}`
            : url;

          return {
            name,
            type,
            size: "Attached file",
            preview: previewUrl,
            loading: false
          };
        });
      });
    } else {
      setLocalFiles([]);
    }
  }, [report?.mediaFiles]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      const localPreviewUrl = URL.createObjectURL(file);
      
      setLocalFiles((prev) => [
        ...prev,
        {
          name: file.name,
          type: file.type,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          preview: localPreviewUrl,
          loading: true
        }
      ]);

      try {
        const res = await fetch(`${API_BASE}/reports/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": file.type,
            "X-File-Name": encodeURIComponent(file.name)
          },
          body: file
        });

        if (!res.ok) {
          throw new Error(`Upload failed with status ${res.status}`);
        }

        const data = await res.json();
        const blobUrl = data.url;

        setLocalFiles((prev) => {
          const updated = [...prev];
          const matchIdx = updated.findIndex(f => f.preview === localPreviewUrl);
          if (matchIdx !== -1) {
            updated[matchIdx] = {
              ...updated[matchIdx],
              preview: (blobUrl && blobUrl.startsWith('https://') && blobUrl.includes('.blob.vercel-storage.com'))
                ? `${API_BASE}/reports/media?url=${encodeURIComponent(blobUrl)}`
                : blobUrl,
              loading: false
            };
          }
          return updated;
        });

        const updatedMedia = [...(report.mediaFiles || []), blobUrl];
        fieldChanged({ target: { name: 'mediaFiles', value: updatedMedia } });
      } catch (err) {
        console.error("File upload failed:", err);
        setLocalFiles((prev) => prev.filter(f => f.preview !== localPreviewUrl));
        setOutcome({
          show: true,
          message: `Failed to upload file ${file.name}: ${err.message}`,
          type: "error"
        });
      }
    }
  };

  const removeFile = (index) => {
    const updatedMedia = (report.mediaFiles || []).filter((_, i) => i !== index);
    fieldChanged({ target: { name: 'mediaFiles', value: updatedMedia } });
  };

  const fieldChanged = ({target}) => {
    const { name, value } = target;

    //const currentValue = get(report, name);  
    const newReport = Object.assign({}, report);
    if(name === 'incidentGps') {      
      const foundLocations = ethiopia.features.filter((feature) => geoContains(feature, [parseFloat(value?.lon), parseFloat(value?.lat)]));      
      if (foundLocations.length > 1) {
        // what should i do here?
        newReport.incidentLocation = {region: '', zone: '', woreda: ''};
      } else if (foundLocations?.length) {
        set(newReport, 'incidentLocation', { 
          region: foundLocations[0].properties.REGIONNAME, 
          zone: foundLocations[0].properties.ZONENAME, 
          woreda: foundLocations[0].properties.WOREDANAME
        });
        newReport.incidentLocationInferred = true;                      
      }
      newReport.isGpsCalculated = false;
    }

    if(name === 'incidentLocation') {
      const foundLocations = ethiopia.features.filter((feature) => 
        feature.properties.REGIONNAME === value.region 
          && feature.properties.ZONENAME === value.zone 
          && feature.properties.WOREDANAME === value.woreda 
      );

      if (foundLocations.length > 1) {
        // what should i do here?
        newReport.incidentGps = {};
      } else if (foundLocations?.length) {
        const [lon, lat] = geoCentroid(foundLocations[0]);
        //console.log(lon, lat);
        set(newReport, 'incidentGps', { lat, lon });
        newReport.isGpsCalculated = true;  
      }
      newReport.incidentLocationInferred = false;
    }

    set(newReport, name, value); // update the value    
    setEdited(true);
    onChange(newReport);
  }

  const locationSelectionChanged = (e) => {
    fieldChanged(e); 
    //fieldChanged({ target: { name: 'incidentLocationInferred', value: false}});
  }
  
  const gpsChanged = (e) => {
    fieldChanged(e);
  }
  
  return (
    <React.Fragment>
      {report ? (
      <Grid container rowSpacing={2} columnSpacing={{ xs: 1 }} style={{width: '98%', paddingLeft: '2%'}}>
        <Grid item xs={fullWidth} md={halfWidth}>          
            <Reporter reporterId={report?.reporter?.sub} eyewitness={report?.eyewitness}/>          
        </Grid>
        <Grid item xs={fullWidth} md={halfWidth}>
          <Stack direction="column" spacing={1}>
            <CategorySelect readOnly={readOnly} name="categories" selectedCategories={report?.categories || []} allCategories={config.categories} 
            onChange={fieldChanged} /> 
            <TextField fullWidth name="title" id="title" label="Title" variant="outlined" disabled={readOnly}
            value={report?.title || ''} onChange={fieldChanged}/>
            <LocalizationProvider dateAdapter={DayjsUtils}>                           
              <DateTimePicker
                readOnly={readOnly}
                fullWidth
                label="Incident Date and Time"
                name="incidentDateTime"
                value={convertUtcIsoToLocal(report.incidentDateTime)}
                onChange={(newValue) => fieldChanged({ target: { name: 'incidentDateTime', value: convertDateTimeToIso8601(newValue) }})}
                renderInput={(params) => <TextField fullWidth {...params} />}
              />
              {!hideReportDate && <DateTimePicker
                      fullWidth
                      label="Report Date and Time"
                      name="reportDateTime"
                      value={convertUtcIsoToLocal(report.reportDateTime)}
                      readOnly={true}
                      onChange={(newValue) => fieldChanged({ target: { name: 'reportDateTime', value: convertDateTimeToIso8601(newValue) }})}
                      renderInput={(params) => <TextField fullWidth {...params} />}
              />}
            </LocalizationProvider>
          </Stack>
        </Grid>
        <Grid item xs={fullWidth} >
          <TextField fullWidth disabled={readOnly} fullWidth name="description" id="outlined-multiline-flexible" label="Description" 
            variant="outlined" multiline autoComplete='off'
            value={report?.description || ''}
            onChange={fieldChanged} rows={4} />
        </Grid>
        <Grid item xs={fullWidth}>
          <Accordion 
            sx={{ 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px !important', 
              overflow: 'hidden',
              '&:before': { display: 'none' },
              boxShadow: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { borderColor: '#06b6d4' }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="translation-content"
              id="translation-header"
              sx={{ 
                bgcolor: 'rgba(6, 182, 212, 0.03)',
                '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.06)' }
              }}
            >
              <Badge 
                badgeContent={(report?.titleEn || report?.descriptionEn) ? "✓" : "0"} 
                color={(report?.titleEn || report?.descriptionEn) ? "success" : "default"}
                sx={{ mr: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    component="span" 
                    sx={{ 
                      fontSize: '1.1rem', 
                      display: 'flex', 
                      alignItems: 'center',
                      color: '#06b6d4'
                    }}
                  >
                    🌐
                  </Box>
                  <Box fontWeight='fontWeightBold' sx={{ color: '#0f172a' }}>
                    English Translation
                  </Box>
                </Box>
              </Badge>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5 }}>
              <Stack direction="column" spacing={2}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(6, 182, 212, 0.04)', 
                  border: '1px solid rgba(6, 182, 212, 0.12)',
                  mb: 1
                }}>
                  <Box sx={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                    Provide the English translation of the title and description. This will be displayed on the public dashboard when users switch to English.
                  </Box>
                </Box>
                <TextField 
                  fullWidth 
                  name="titleEn" 
                  id="title-en" 
                  label="Title (English Translation)" 
                  variant="outlined" 
                  disabled={readOnly}
                  value={report?.titleEn || ''} 
                  onChange={fieldChanged}
                  placeholder="Enter English translation of the title..."
                />
                <TextField 
                  fullWidth 
                  disabled={readOnly} 
                  name="descriptionEn" 
                  id="description-en" 
                  label="Description (English Translation)" 
                  variant="outlined" 
                  multiline 
                  autoComplete='off'
                  value={report?.descriptionEn || ''}
                  onChange={fieldChanged} 
                  rows={4} 
                  placeholder="Enter English translation of the description..."
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>
        <Grid item xs={fullWidth} >
          <MapContainer point={report?.incidentGps} initialZoom={6}
            onChange={gpsChanged} readOnly={readOnly} name="incidentGps"/>
        </Grid>        
        <Grid item xs={fullWidth} >
          <Stack direction="column" spacing={1}>                     
            <Stack direction="row" spacing={2}>
                <LocationSelector currentLocation={report?.incidentLocation} 
                  name="incidentLocation" onChange={locationSelectionChanged} readOnly={readOnly}/>
                {/* <FormGroup>
                  <Tooltip title="Inferred from GPS data">
                    <FormControlLabel control={<Checkbox readOnly={true} checked={report.incidentLocationInferred} />} label="Inferred" />
                  </Tooltip>
                </FormGroup>*/}
            </Stack>          
            <Stack direction="column" spacing={1}>
                <TextField fullWidth name="incidentLocation.other" id="title" label="Additional Location Info" variant="outlined" disabled={readOnly}
                      value={report?.incidentLocation?.other || ''} onChange={fieldChanged}/>
                {/* {report.incidentGps && 
                <Stack direction="row" spacing={2}>
                  <TextField name="incidentGps.lon" id="title" label="Longitude" variant="outlined" readOnly={readOnly}
                      value={report?.incidentGps?.lon || ''} onChange={fieldChanged} error={edited && !report?.incidentGps?.lon}/>
                  <TextField name="incidentGps.lat" id="title" label="Latitude" variant="outlined" readOnly={readOnly}
                      value={report?.incidentGps?.lat || ''} onChange={fieldChanged} error={edited && !report?.incidentGps?.lat}/>
                  <FormGroup>
                    <Tooltip title="Calculated from region, zone and woreda information">
                      <FormControlLabel control={<Checkbox readOnly={true} checked={report.gpsCalculated} />} label="Calculated" />
                    </Tooltip>
                  </FormGroup>
                </Stack>} */}
            </Stack>
          </Stack>     
        </Grid>   
        {readOnly ? (
          report?.mediaFiles && report.mediaFiles.length > 0 && (
            <Grid item xs={fullWidth}>
              <Accordion disabled={!report?.mediaFiles?.length}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                >
                  <Badge badgeContent={report?.mediaFiles?.length} color="primary" showZero>
                    <Box fontWeight='fontWeightBold'>Media Files</Box>
                  </Badge>
                </AccordionSummary>
                <AccordionDetails>
                  <MediaViewer links={report.mediaFiles} />
                </AccordionDetails>
              </Accordion>
            </Grid>
          )
        ) : (
          <Grid item xs={fullWidth}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                Rich Media & Document Attachments
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Attach evidence files like eyewitness photos, drone footage, audio records, or official PDF briefings.
              </Typography>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                mt: 1,
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
                <Box sx={{ p: 1 }}>
                  <CloudUploadIcon sx={{ fontSize: 44, color: '#06b6d4', mb: 1, filter: 'drop-shadow(0 4px 12px rgba(6, 182, 212, 0.35))' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
                    Drag & Drop or Click to Attach Files
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Supports Images, Videos, Documents, and Audio
                  </Typography>
                </Box>
              </label>
            </Paper>

            {localFiles.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1.5 }}>
                  Attached Files ({localFiles.length})
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
                            p: 1.5,
                            borderRadius: 3,
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            bgcolor: '#f8fafc',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: '#cbd5e1',
                              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
                            }
                          }}
                        >
                          {isImage ? (
                            <Box sx={{ width: 40, height: 40, borderRadius: 2, overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                              <img src={file.preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                          ) : (
                            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(15, 23, 42, 0.05)', color: '#0f172a', flexShrink: 0 }}>
                              {isVideo ? <MovieIcon /> : isAudio ? <AudioIcon /> : <DescriptionIcon />}
                            </Box>
                          )}

                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            {!file.loading ? (
                              <a href={file.preview} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    color: '#06b6d4', 
                                    textOverflow: 'ellipsis', 
                                    overflow: 'hidden', 
                                    whiteSpace: 'nowrap', 
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    '&:hover': { textDecoration: 'underline' }
                                  }}
                                >
                                  {file.name}
                                </Typography>
                              </a>
                            ) : (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                {file.name}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {file.size}
                            </Typography>
                          </Box>

                          {file.loading ? (
                            <CircularProgress size={20} sx={{ color: '#06b6d4', mx: 1 }} />
                          ) : (
                            <IconButton
                              onClick={() => removeFile(idx)}
                              size="small"
                              sx={{
                                color: '#ef4444',
                                bgcolor: 'rgba(239, 68, 68, 0.05)',
                                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.15)' }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
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
          </Grid>
        )}
        <Grid item xs={fullWidth}><Divider/></Grid>
        <Grid item xs={fullWidth} >
          <TextField fullWidth id="outlined-multiline-flexible" label="Analyst Notes" 
            disabled={readOnly}
            variant="outlined" multiline autoComplete='off'
            name="notes"
            value={report?.notes || ''}
            onChange={fieldChanged} rows={4} />
        </Grid>
        <Grid item xs={fullWidth} >
          <FormControl fullWidth>
            <InputLabel id="severity-select-label">Incident Severity</InputLabel>
            <Select
              readOnly={readOnly}
              labelId="severity-select-label"
              id="severity"
              value={report?.severity || ''}
              label="Incident Severity"
              name='severity'
              onChange={fieldChanged}
              error={!report?.severity}
            >
              <MenuItem value="">Select a report severity level</MenuItem>
              <MenuItem value={"low"}>Low</MenuItem>
              <MenuItem value={"medium"}>Medium</MenuItem>
              <MenuItem value={"high"}>High</MenuItem>
            </Select>
          </FormControl>
        </Grid>        
      </Grid>) : <Grid></Grid> }
      </React.Fragment>
  );
}

export default Report;