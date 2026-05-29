import React from "react";
import {
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import { TabPanel, TabContext } from '@mui/lab';
import set from 'lodash.set';
import get from 'lodash.get';
import { Auth, API } from 'aws-amplify';

import Report from './report';

const fullWidth = 12;

function CombinedReport({ report, onChange, readOnly }) {
  // const [edited, setEdited] = React.useState(false);
  const [childReports, setChildReports] = React.useState();
  const [tab, setTab] = React.useState(report.reportId);

  const getChildReports = async () => {        
    try {
      const init = { 
        headers: { 
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,          
        },
      };
      
      const response = await API.get("ewsapi", `/reports/?ids=${report.sourceReports.join(',')}`, init);      
      setChildReports(response);      
    } catch(err) {
      console.log(err?.response?.data || err);     
    }
  }

  const handleChange = (e, value) => {
    setTab(value);
  };

  React.useEffect(() => {
    let active = true;
    async function init() {
      if (active && !childReports) {
        await getChildReports();
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [childReports]);
  
  return (
    <React.Fragment>
      {report && 
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleChange} aria-label="combined report" variant="scrollable"
            scrollButtons="auto">
          <Tab label="Parent Report" value={report.reportId} />
          {
            childReports && childReports.map((childReport, i) => (
              <Tab label={`Combined Report ${i + 1}`} value={childReport.reportId} key={childReport.reportId}/>
          ))}
        </Tabs>
      </Box> 
      <TabPanel value={report.reportId} index={0}>
        <Report report={report} readOnly={readOnly} onChange={onChange}/>
      </TabPanel>
      {
        childReports && childReports.map((childReport, i) => (
          <TabPanel value={childReport.reportId} index={i + 1} key={childReport.reportId}>
            <Report report={childReport} readOnly={true} onChange={() => console.log(`Error: Readonly mode report changed.`)} />
          </TabPanel>
        ))
      }
      </TabContext>}
    </React.Fragment>
  );
}

export default CombinedReport;