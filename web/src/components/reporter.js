import React from 'react';
import { Auth, API } from 'aws-amplify';
import {
  Card, CardContent, Stack, Box, Badge, Tooltip, Divider, CardHeader, IconButton
} from '@mui/material';
import RemoveRedEye from '@mui/icons-material/RemoveRedEye';
import RemoveRedEyeOutlined from '@mui/icons-material/RemoveRedEyeOutlined';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';

function Reporter({ reporterId, eyewitness }) {
  const [reporterData, setReporterData] = React.useState();
  const [showEmail, setShowEmail] = React.useState(false);
  const [showPhone, setShowPhone] = React.useState(false);

  const getReporterInfo = async () => {          
    try {
      const init = { 
        headers: { 
          Authorization: `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`,          
        },
      };
      
      const response = await API.get("ewsapi", `/users/${reporterId}/stats`, init);      
      setReporterData(response);      
    } catch(err) {
      console.log(err?.response?.data || err);      
    }
  }

  const viewPrivateData = () => {

  }

  React.useEffect(() => {
    let active = true;
    async function init() {
      if (active && reporterId) {
        await getReporterInfo();
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [reporterId]);

  return (
    <Card variant="outlined">
      <CardHeader title={`Reporter`} />      
      <CardContent>
        <Stack direction="column" >
          <Box><strong>ID:</strong> {reporterId}</Box>          
          <Box><strong>Eyewitness:</strong> {eyewitness? 'Yes' : 'No'}</Box>
          <Box><strong>Email:</strong> {showEmail? reporterData?.email : '**********'}
              <IconButton onClick={() => setShowEmail(!showEmail) } size="small" color="primary">{showEmail? <RemoveRedEyeOutlined/> : <RemoveRedEye/>}</IconButton></Box>
          <Box><strong>Phone Number:</strong> {showPhone? reporterData?.phoneNumber : '**********'}
              <IconButton onClick={() => setShowPhone(!showPhone) } size="small" color="primary">{showPhone? <RemoveRedEyeOutlined/> : <RemoveRedEye/>}</IconButton></Box>
          <Box><strong>Joined:</strong> {reporterData?.joinDate}</Box>
          <Divider style={{padding: '5px', marginBottom: '5px'}}/>
          <Box style={{margin: 'auto', marginTop: '10px'}}>
            <Stack direction="row" spacing={8}>
              <Tooltip title="Submitted reports">
                <Badge badgeContent={reporterData?.unprocessed || 0} color="primary" max={999} showZero>
                  <ContentPasteIcon />
                </Badge>
              </Tooltip>
              <Tooltip title="Submitted reports that were published">
                <Badge badgeContent={reporterData?.published || 0} color="success" max={999} showZero>
                  <ContentPasteIcon />
                </Badge>
              </Tooltip>
              <Tooltip title="Submitted reports that were rejected">
                <Badge badgeContent={reporterData?.rejected || 0} color="error" max={999} showZero>
                  <ContentPasteIcon />
                </Badge>
              </Tooltip>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default Reporter;