import React from "react";
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
} from '@mui/material';
import {
  LocalizationProvider,
  DateTimePicker,
} from '@mui/lab'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
        {report?.mediaFiles && report.mediaFiles.length > 0 && (
          <Grid item xs={fullWidth} >
            <Accordion disabled={!report?.mediaFiles?.length} >
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