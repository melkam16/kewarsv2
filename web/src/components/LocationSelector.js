import React from 'react';
import {
  InputLabel,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material'

import config from '../config';

const { locations: locationMap } = config;

function LocationSelector({ currentLocation, 
  onChange: parentOnChange, 
  readOnly,
  name,
 }) {
  const [location, setLocation] = React.useState(currentLocation);

  const onChange = ({target}) => {
    const { name: field, value } = target;
    const newLocation = {...location, [field]: value};
    setLocation(newLocation);
    console.log(`${name} ${newLocation}`)
    parentOnChange({ target: { name, value: newLocation }});
  };

  React.useEffect(() => {
    setLocation(currentLocation);
  }, [currentLocation]);

  return (
    <React.Fragment>
      <FormControl fullWidth>
        <InputLabel id="region-label">Region</InputLabel>
        <Select
          labelId="region-label"
          id="region-select"
          name="region"
          value={location?.region || ''}
          label="Region"
          onChange={onChange}
          error={!location?.region}
          readOnly={readOnly}
        >
          <MenuItem key="empty" value="">Select Region</MenuItem>
          {Object.keys(locationMap).map(key => (<MenuItem key={key} value={key}>{locationMap[key].label.en}</MenuItem>))}
          
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="zone-label">Zone</InputLabel>
        <Select
          labelId="zone-label"
          id="zone-select"
          name="zone"
          value={location?.zone || ''}
          label="Zone"
          onChange={onChange}
          error={!location?.zone || !locationMap[location?.region].zones[location?.zone] }
          readOnly={readOnly}
        >
          <MenuItem key="empty" value="">Select Zone</MenuItem>
          {locationMap[location?.region] &&
            Object.keys(locationMap[location?.region].zones).map(key => (<MenuItem key={key} value={key}>{locationMap[location?.region].zones[key].label.en}</MenuItem>))}
          
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="woreda-label">Woreda</InputLabel>
        <Select
          labelId="woreda-label"
          id="woreda-select"
          name="woreda"
          value={location?.woreda || ''}
          label="Woreda"
          onChange={onChange}
          error={!location?.woreda || !(locationMap[location?.region].zones[location?.zone] && locationMap[location?.region].zones[location?.zone].woredas[location?.woreda])}
          readOnly={readOnly}
        >
          <MenuItem key="empty" value="">Select Woreda</MenuItem>
          {locationMap[location?.region] && locationMap[location?.region].zones[location?.zone] && 
            Object.keys(locationMap[location?.region].zones[location?.zone].woredas).map(key => (<MenuItem key={key} value={key}>{locationMap[location?.region].zones[location?.zone].woredas[key].label.en}</MenuItem>))}          
        </Select>
      </FormControl>  
    </React.Fragment>
  );
}

export default LocationSelector;