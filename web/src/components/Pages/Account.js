import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Box,
  Snackbar, 
  Tabs,
  Tab,
  Paper,
  Button,
  Stack,
  Chip,
  Alert,
} from '@mui/material';


function Account() {
  const history = useNavigate();
  const [tab, setTab] = useState("1");
  const [loading, setLoading] = useState(false);
  const [showsnackbar, setShowSnackBar] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    async function initialData() {
      if (active && !stats) {
        await getStats();
      }
    }
    initialData();
    return () => {
      active = false;
    };
  });


  return (
    <Paper height="100vh">
      <h2>Account Settings</h2>

      

    </Paper>    
  );
}

export default Account;