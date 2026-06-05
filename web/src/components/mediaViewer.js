import React from 'react';
import ReactPlayer from 'react-player';
import {
  Box, Paper, IconButton, Button, Dialog, DialogContent, DialogTitle, Typography, Stack,
} from '@mui/material';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';

const imageExtension = new RegExp(/.*?\.(?:(?:jpeg)|(?:png)|(?:gif)|(?:jpg))$/i);
const audioExtension = new RegExp(/.*?\.(?:(?:mp3)|(?:acc)|(?:wav))$/i);
const videoExtension = new RegExp(/.*?\.(?:(?:mp4)|(?:webm)|(?:ogg)|(?:mov))$/i);

const isImage = (link) => imageExtension.test(link) || (typeof link === 'string' && link.startsWith('data:image/'));
const isAudio = (link) => audioExtension.test(link) || (typeof link === 'string' && link.startsWith('data:audio/'));
const isVideo = (link) => videoExtension.test(link);

function Item(props) {
  if (isImage(props.item)) {
    return (
      <Box 
        onClick={props.onExpand}
        sx={{ 
          position: 'relative', 
          cursor: 'zoom-in',
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
            '& .hover-overlay': { opacity: 1 }
          }
        }}
      >
        <Paper sx={{ display: 'flex', justifyContent: 'center', p: 1, bgcolor: 'transparent', boxShadow: 'none' }}>
          <img key={props.key} src={props.url} alt="Media content" style={{ maxHeight: '380px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}/>          
        </Paper>
        <Box 
          className="hover-overlay"
          sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(15, 23, 42, 0.4)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.25s ease',
            gap: 1
          }}
        >
          <ZoomInIcon sx={{ fontSize: 36 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '0.05em' }}>
            Click to Expand
          </Typography>
        </Box>
      </Box>
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
  } else if (isVideo(props.item)) {
    return (
      <Box sx={{ position: 'relative', width: '100%', maxWidth: '500px', margin: 'auto' }}>
        <Paper sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', p: 1, bgcolor: 'transparent', boxShadow: 'none' }}>          
          <ReactPlayer key={props.key} url={props.url} style={{ margin: 'auto', maxWidth: '100%' }} controls={true} height="280px" width="100%" />       
          <Button 
            variant="text" 
            size="small" 
            startIcon={<FullscreenIcon />} 
            onClick={props.onExpand}
            sx={{ mt: 1, alignSelf: 'center', color: '#06b6d4', textTransform: 'none', fontWeight: 600 }}
          >
            Expand to Fullscreen
          </Button>
        </Paper>
      </Box>
    );
  }

  // Fallback for non-media files (PDF, Word, TXT, etc.)
  let fileName = "Attached File";
  let extension = "";
  try {
    const decoded = decodeURIComponent(props.item);
    const parts = decoded.split('/');
    fileName = parts[parts.length - 1];
    extension = fileName.split('.').pop().toLowerCase();
  } catch (e) {}

  const isPdf = extension === 'pdf';
  const isTxt = extension === 'txt';
  const isDoc = ['doc', 'docx'].includes(extension);
  const canPreview = isPdf || isTxt || isDoc;

  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth: '320px', textAlign: 'center', gap: 2.5, boxShadow: 'none', position: 'relative' }}>
      <Box sx={{ display: 'flex', position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(6, 182, 212, 0.08)', px: 1.5, py: 0.5, borderRadius: '20px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase' }}>
          {extension || 'FILE'}
        </Typography>
      </Box>
      <Box sx={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.05))' }}>📄</Box>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', wordBreak: 'break-all', px: 2, fontSize: '0.95rem' }}>
          {fileName}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
        <a href={props.url} download target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<DownloadIcon />} 
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#cbd5e1', color: '#475569', borderRadius: '8px', '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' } }}
          >
            Download
          </Button>
        </a>
        {canPreview && (
          <Button 
            variant="contained" 
            size="small" 
            startIcon={<FullscreenIcon />} 
            onClick={props.onExpand}
            sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' }, textTransform: 'none', fontWeight: 600, borderRadius: '8px', boxShadow: 'none' }}
          >
            Preview
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

function MediaViewer ({links}) {
  const [resolvedUrls, setResolvedUrls] = React.useState([]);
  const [activeStep, setActiveStep] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!links || links.length === 0) {
      setResolvedUrls([]);
      return;
    }
    // All URLs should already be full HTTP URLs from the backend
    // Just use them directly — no AWS Amplify Storage.get() needed
    const urls = links.map((link) => {
      if (typeof link === 'string') {
        return link;
      }
      return String(link);
    });
    setResolvedUrls(urls);
    setActiveStep(0);
  }, [links]);

  if (!resolvedUrls || resolvedUrls.length === 0) {
    return null;
  }

  const handleNext = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % resolvedUrls.length);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep - 1 + resolvedUrls.length) % resolvedUrls.length);
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {resolvedUrls.length > 1 && (
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
          <Item 
            item={links[activeStep]} 
            url={resolvedUrls[activeStep]} 
            key={activeStep} 
            onExpand={() => setOpen(true)}
          />
        </Box>

        {resolvedUrls.length > 1 && (
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

      {resolvedUrls.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 1 }}>
          {resolvedUrls.map((_, index) => (
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

      {/* Full-Screen Lightbox Modal Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: '#ffffff',
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.2)'
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pr: 4 }}>
            {links[activeStep] ? decodeURIComponent(links[activeStep]).split('/').pop() : 'Attachment Preview'}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            sx={{
              position: 'absolute',
              right: 12,
              top: 12,
              color: '#64748b',
              '&:hover': { color: '#0f172a', bgcolor: '#e2e8f0' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', bgcolor: '#0f172a' }}>
          {links[activeStep] && (
            isImage(links[activeStep]) ? (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '75vh' }}>
                <img src={resolvedUrls[activeStep]} alt="Expanded Content" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
              </Box>
            ) : isAudio(links[activeStep]) ? (
              <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', bgcolor: '#f8fafc' }}>
                <audio controls src={resolvedUrls[activeStep]} autoPlay style={{ width: '100%', maxWidth: '500px' }} />
              </Box>
            ) : isVideo(links[activeStep]) ? (
              <Box sx={{ p: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '70vh' }}>
                <ReactPlayer url={resolvedUrls[activeStep]} controls={true} playing={true} width="100%" height="100%" style={{ maxWidth: '100%' }} />
              </Box>
            ) : (
              // Document Viewer (PDF, TXT, Word)
              <Box sx={{ width: '100%', height: '80vh', display: 'flex', flexDirection: 'column', bgcolor: '#ffffff' }}>
                {links[activeStep].toLowerCase().endsWith('.pdf') || links[activeStep].toLowerCase().endsWith('.txt') ? (
                  <iframe 
                    src={resolvedUrls[activeStep]} 
                    title="Document Preview" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 'none' }}
                  />
                ) : (
                  // Word Document (doc/docx) via Google Docs Viewer
                  <iframe 
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(resolvedUrls[activeStep])}&embedded=true`} 
                    title="Document Preview" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 'none' }}
                  />
                )}
              </Box>
            )
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default MediaViewer;