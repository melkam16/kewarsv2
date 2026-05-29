import React from 'react';
import { Wrapper } from "@googlemaps/react-wrapper";
import { createCustomEqual } from "fast-equals";
import {
  FormGroup, FormControlLabel, Switch, Box, Stack, TextField,
} from '@mui/material';

const render = (status) => {
  return <h1>{status}</h1>;
};

import data from './ethiopia.geo.json';

const deepCompareEqualsForMaps = createCustomEqual(
  (deepEqual) => (a, b) => {
    if (
      a instanceof window.google.maps.LatLng || b instanceof window.google.maps.LatLng
    ) {
      return new window.google.maps.LatLng(a).equals(new window.google.maps.LatLng(b));
    }

    // TODO extend to other types

    // use fast-equals for other objects
    return deepEqual(a, b);
  }
);

function useDeepCompareMemoize(value) {
  const ref = React.useRef();

  if (!deepCompareEqualsForMaps(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
}

function useDeepCompareEffectForMaps(
  callback,
  dependencies
) {
  React.useEffect(callback, dependencies.map(useDeepCompareMemoize));
}

const Marker = (options) => {
  const [marker, setMarker] = React.useState();

  React.useEffect(() => {
    if (!marker) {
      setMarker(new window.google.maps.Marker());
    }

    // remove marker from map on unmount
    return () => {
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [marker]);

  React.useEffect(() => {
    if (marker) {
      marker.setOptions(options);
    }
  }, [marker, options]);

  return null;
};

const Map = ({
  onClick,
  onIdle,
  children,
  style,
  ...options
}) => {
  const ref = React.useRef(null);
  const [map, setMap] = React.useState();

  React.useEffect(() => {
    if (ref.current && !map) {      
      setMap(new window.google.maps.Map(ref.current, {}));
    }
  }, [ref, map]);

  // because React does not do deep comparisons, a custom hook is used
  // see discussion in https://github.com/googlemaps/js-samples/issues/946
  useDeepCompareEffectForMaps(() => {
    if (map) {
      map.setOptions(options);
      // map.data.addGeoJson(data);
      // map.data.setStyle({
      //   fillColor: 'green',
      //   strokeColor: 'black',
      //   fillOpacity: 0,
      //   strokeWeight: 0.1,
      // })
    }
  }, [map, options]);

  React.useEffect(() => {
    if (map) {
      ["click", "idle"].forEach((eventName) =>
        window.google.maps.event.clearListeners(map, eventName)
      );

      if (onClick) {
        map.addListener("click", onClick);
      }

      if (onIdle) {
        map.addListener("idle", () => onIdle(map));
      }
    }
  }, [map, onClick, onIdle]);

  return (
    <>
      <div ref={ref} style={style} />
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // set the map prop on the child component
          return React.cloneElement(child, { map });
        }
      })}
    </>
  );
};

const ADDIS_ABABA = { lat: 9.005401 , lng: 38.763611 };
const fromLatLonToLatLng = (point) => ({lat: parseFloat(point?.lat) || ADDIS_ABABA.lat
  , lng: parseFloat(point?.lon) || ADDIS_ABABA.lng });
const fromLatLngToLatLon = (point) => ({lat: `${point.lat()}`, lon: `${point.lng()}` });

function MapContainer({point, name, onChange, readOnly = false, initialZoom}) {
  const [click, setClick] = React.useState(fromLatLonToLatLng(point));
  const [zoom, setZoom] = React.useState(initialZoom); // initial zoom
  const [center, setCenter] = React.useState(fromLatLonToLatLng(point));
  const [enableClick, setEnableClick] = React.useState(false);

  const onClick = (e) => {
    if (enableClick ) {
      setClick(e.latLng);
      setCenter(e.latlng);
      onChange({target: { name, value: fromLatLngToLatLon(e.latLng) }})
    }
  };

  const onIdle = (m) => {
    //console.log("onIdle");
    setZoom(m.getZoom());
    setCenter(m.getCenter()?.toJSON());
  };

  const form = (
    <Box>
      <Stack direction="column" spacing={1}>
        <FormGroup>
          <FormControlLabel control={<Switch disabled={readOnly} onChange={() => setEnableClick(!enableClick)} />} label='Change GPS' />
        </FormGroup>
        <TextField name="incidentGps.lon" id="lo" label="Longitude" variant="outlined" readOnly={true}
            value={point?.lon || ''} error={!point}/>
        <TextField name="incidentGps.lat" id="lat" label="Latitude" variant="outlined" readOnly={true}
            value={point?.lat || ''} error={!point}/>
        {enableClick &&
        <> 
          <h3>Drag and zoom.<br/> Click on desired location.</h3></>}
          {/* <Button disabled={deepCompareEqualsForMaps(fromLatLonToLatLng(point), click)} 
            variant="contained" 
            onClick={() => onClick({ latLng: fromLatLonToLatLng(point) })}>Reset Chage</Button></>} */}
      </Stack>
    </Box>
  );

  React.useEffect(() => {
    setClick(fromLatLonToLatLng(point));
  }, [point]);

  return (
    <Stack direction="row" justifyContent="center" spacing={2} style={{height: '350px'}}>
      <Wrapper apiKey={"AIzaSyAXk_dX6DI6jxcUdjpvKqGBiKIKjoQoMOs"} render={render}>
        <Map
          center={center}
          onClick={onClick}
          onIdle={onIdle}
          zoom={zoom}
          style={{ flexGrow: "1", height: "100%" }}
        >
        
          <Marker position={click} />
        
        </Map>
      </Wrapper>
    {/* Basic form for controlling center and zoom of map. */}
    {form}
    </Stack>
  );
}
 
export default MapContainer;