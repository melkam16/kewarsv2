import * as React from 'react';
import { 
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle 
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';


export default function ConfirmLoadDraft({ onCancel , onConfirm, show }) {
  //const [open, setOpen] = React.useState(show);

  const handleCancel = () => {
    onCancel();
    //setOpen(false);
  };

  const handleConfirm = () => {
    onConfirm();
    //setOpen(false);
  };

  return (
      <Dialog
        open={show}
        onClose={handleCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" >
          {"Load the draft you saved before?"}
          <IconButton
            aria-label="close"
            onClick={handleCancel}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            We have detected that you saved a draft for this report. Do you want to load it?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirm} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
  );
}
