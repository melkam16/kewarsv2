import React, { useState } from 'react';
import { DialogActions } from '@mui/material'
import { TabContext, TabPanel } from '@mui/lab';
import { v4 as uuidv4 } from 'uuid';
import {
  Tabs,
  Tab,
  Dialog,
  Button,
  Stack,
  AppBar,
  Snackbar,
  Alert,
} from '@mui/material';
import { Auth, API } from 'aws-amplify';

import Report from '../report';
import { AuthContext } from '../contexts/AuthContext';
import { ReportStatus } from '../../config';

function CombineReports({ data, onCombineClosed, open }) {
  const { user } = React.useContext(AuthContext);
  const [combinedReport, setCombinedReport] = React.useState({ reportId: uuidv4(), reporter: user });
  const [tab, setTab] = React.useState(combinedReport.reportId);
  const [reports, setReports] = React.useState();
  const [outcome, setOutcome] = React.useState({ show: false, message: '', type: 'success' });
  const [isValid, setIsValid] = React.useState(false);

  const handleTabChange = (e, value) => {
    console.log(value);
    setTab(value);
  };

  const getReports = async () => {
    try {
      const init = {
        headers: {
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
        },
      };

      const response = await API.get("ewsapi", `/reports/?ids=${data.join(',')}`, init);
      const childReports = response.reduce((map, item) => {
        map[item.reportId] = item;
        return map;
      }, {});

      setReports(childReports);
    } catch (err) {
      console.log(err?.response?.data || err);
    }
  }

  const reportHasErrors = (report) => {
    let errors = [];

    if (!report.categories?.length > 0) { // TODO: also validate categories are known values
      errors.push('Report has no categories.');
    }

    if (!report.incidentLocation?.region
      || !report.incidentLocation?.zone
      || !report.incidentLocation?.woreda) {
      errors.push('Report missing incident location information.')
    }

    if (!report.incidentGps?.lon
      || !report.incidentGps?.lat) {
      errors.push('Report missing incident gps location information.')
    }

    if (!report.incidentDateTime) {
      errors.push('Report missing incident date and time.');
    }

    if (!report.severity || report.severity === '') {
      errors.push('Report missing severity.');
    }

    console.log(errors);
    return errors.length && errors; // Return errors if there are any
  }

  /**
  * merge in changes to the combined report
   */
  const onChangeCombined = (report) => {
    console.log(combinedReport, report);
    const newCombinedReport = { ...combinedReport, ...report };

    setCombinedReport(newCombinedReport);
    reportHasErrors(newCombinedReport) ? setIsValid(false) : setIsValid(true);
  };

  const createNewCombinedReport = async (status) => {
    try {
      const init = {
        headers: {
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,
          'Content-Type': 'application/json',
        },
        body: {
          report: combinedReport,
          children: data,
        }
      };

      const response = await API.post("ewsapi", `/reports/combine-reports`, init);
      setOutcome({ show: true, message: `Successfully created combined repot`, type: 'success' });
      onCombineClosed();
    } catch (err) {
      console.log(err?.response?.data || err);
      setOutcome({ show: true, message: `Error occured when creating combined report. ${err?.response?.data || err.msg}`, type: 'error' });
    }
  }

  React.useEffect(() => {
    let active = true;
    async function init() {
      if (active && !reports && data?.length && open) {
        await getReports();
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [reports, data, open]);

  return (
    <Dialog fullScreen onClose={onCombineClosed} open={open}>
      <TabContext value={tab}>
        <AppBar position="static">
          <Tabs
            value={tab}
            onChange={handleTabChange}
            aria-label="basic tabs example"
            indicatorColor="secondary"
            textColor="inherit">
            <Tab key={combinedReport.reportId} label='New Combined Report' value={combinedReport.reportId} />
            {reports && (
              data.map((reportId) => (
                <Tab key={reportId} label={reportId} value={reportId} />
              ))
            )}
          </Tabs>
        </AppBar>
        <TabPanel key={combinedReport.reportId} value={combinedReport.reportId} index={0}>
          <Report key={combinedReport.reportId} report={combinedReport} readOnly={false} onChange={onChangeCombined} hideReportDate={true} />
        </TabPanel>
        {reports && data.map((reportId, i) => (
          <TabPanel key={reportId} value={reportId} index={i + 1}>
            <Report key={reportId} report={reports[reportId] || {}} reportId={reportId} readOnly={true} />
          </TabPanel>
        ))}
      </TabContext>
      <DialogActions style={{ margin: 'auto' }}>
        <Stack direction="row" spacing={6} justifyContent="center">
          <Button variant='text' onClick={onCombineClosed}>Cancel</Button>
          <Button disabled={!isValid} variant='contained' onClick={() => createNewCombinedReport(ReportStatus.unprocessed)}>Create Combined Report</Button>
          {/* <Button disabled={!isValid} variant='contained' onClick={() => createNewCombinedReport(ReportStatus.published)}>Publish Combined Report</Button> */}
        </Stack>
        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          open={outcome.show}
          autoHideDuration={6000}
          onClose={() => setOutcome({ show: false, message: '', type: 'success' })}>
          <Alert onClose={() => setOutcome({ show: false, message: '', type: 'success' })}
            severity={outcome.type} sx={{ width: '100%' }}>
            {outcome.message}
          </Alert>
        </Snackbar>
      </DialogActions>
    </Dialog>

  );
}

export default CombineReports;