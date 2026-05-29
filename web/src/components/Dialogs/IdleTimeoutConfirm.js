import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Typography,
  Divider,
  Button as Btn
} from '@mui/material';
import Countdown from 'react-countdown';

const maxWait = 10000;
function IdleTimeoutConfirm ({ open, resume, cancel, expired }) {
  const [timedOut, setIsTimedOut] = React.useState(false);
  
  const renderer = ({seconds, completed}) => {
    if (completed) {
      setIsTimedOut(true);
    }

    return <React.Fragment>{seconds}</React.Fragment>;
  };

  const onClose = () => {
    setIsTimedOut(false);
  }

  return (
    <React.Fragment>
      {open && <Dialog open={open} onClose={onClose}>
        <DialogTitle fontWeight="fontWeightBold">You have been inactive!</DialogTitle>
        <Divider/>
        <DialogContent>
          <Typography>Would you like to keep working?</Typography>
        </DialogContent>
        <Divider/>
        <DialogActions>
          <Btn variant="text" autoFocus onClick={cancel}>
            No
          </Btn>
          <Btn variant="contained" onClick={resume} disabled={timedOut}>
            Resume (<Countdown onComplete={expired} date={Date.now() + maxWait} renderer={renderer}/>)</Btn>
        </DialogActions>
      </Dialog>}
    </React.Fragment>
  );
}

export default IdleTimeoutConfirm;