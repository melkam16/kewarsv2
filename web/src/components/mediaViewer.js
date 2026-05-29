import React from 'react';
import { Storage } from 'aws-amplify';
import ReactPlayer from 'react-player';
import {
  Box, Paper, IconButton,
} from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

Storage.configure({
  customPrefix: {
    public: '', private: '', protected: '',
  }
});

const imageExtension = new RegExp(/.*?\.(?:(?:jpeg)|(?:png)|(?:gif)|(?:jpg))$/);
const audioExtension = new RegExp(/.*?\.(?:(?:mp3)|(?:acc)|(?:wav))$/);

const isImage = (link) => imageExtension.test(link) || (typeof link === 'string' && link.startsWith('data:image/'));
const isAudio = (link) => audioExtension.test(link) || (typeof link === 'string' && link.startsWith('data:audio/'));

function Item(props) {
  if (isImage(props.item)) {
    return (
      <Paper sx={{ display: 'flex', justifyContent: 'center', p: 1, bgcolor: 'transparent', boxShadow: 'none' }}>
        <img key={props.key} src={props.url} alt="Media content" style={{ maxHeight: '380px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}/>          
      </Paper>
    );
  } else if (isAudio(props.item)) {
    return (
      <Paper sx={{ display: 'flex', justifyContent: 'center', p: 1, bgcolor: 'transparent', boxShadow: 'none' }}>
        <audio key={props.key} controls src={props.url} style={{ margin: 'auto', width: '100%', maxWidth: '400px' }}>
          Your browser does not support the
          <code>audio</code> element.
        </audio>          
      </Paper>
    );
  }

  return (
    <Paper sx={{ display: 'flex', justifyContent: 'center', p: 1, bgcolor: 'transparent', boxShadow: 'none' }}>          
      <ReactPlayer key={props.key} url={props.url} style={{ margin: 'auto', maxWidth: '100%' }} controls={true} height="300px" width="100%" />       
    </Paper>
  );
}

function MediaViewer ({links}) {
  const [signedUrls, setSignedUrls] = React.useState([]);
  const [activeStep, setActiveStep] = React.useState(0);

  const getSignedUrls = async () => {        
    try {
      const urlPromises = links?.map((link) => {
        if (typeof link === 'string' && (link.startsWith('data:') || link.startsWith('blob:'))) {
          return link;
        }
        const media = link.replace(/^\//, '');
        return Storage.get(`${media}`).catch(() => link);
      });

      const a = await Promise.all(urlPromises);
      setSignedUrls(a);
    } catch(err) {
      console.log(err);      
    }
  }

  React.useEffect(() => {
    getSignedUrls();
    setActiveStep(0);
  }, [links]);

  if (!signedUrls || signedUrls.length === 0) {
    return null;
  }

  const handleNext = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % signedUrls.length);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep - 1 + signedUrls.length) % signedUrls.length);
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {signedUrls.length > 1 && (
          <IconButton 
            onClick={handleBack} 
            sx={{ 
              color: '#06b6d4', 
              bgcolor: 'rgba(15, 23, 42, 0.6)', 
              '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.2)' },
              position: 'absolute',
              left: 8,
              zIndex: 10
            }}
          >
            <KeyboardArrowLeft />
          </IconButton>
        )}
        
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Item item={links[activeStep]} url={signedUrls[activeStep]} key={activeStep} />
        </Box>

        {signedUrls.length > 1 && (
          <IconButton 
            onClick={handleNext} 
            sx={{ 
              color: '#06b6d4', 
              bgcolor: 'rgba(15, 23, 42, 0.6)', 
              '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.2)' },
              position: 'absolute',
              right: 8,
              zIndex: 10
            }}
          >
            <KeyboardArrowRight />
          </IconButton>
        )}
      </Box>

      {signedUrls.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 1 }}>
          {signedUrls.map((_, index) => (
            <Box
              key={index}
              onClick={() => setActiveStep(index)}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: activeStep === index ? '#06b6d4' : 'rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease, transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.2)',
                  bgcolor: '#06b6d4'
                }
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default MediaViewer;