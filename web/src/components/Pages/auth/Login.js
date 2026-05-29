import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import KeyIcon from '@mui/icons-material/Key';
import PublicIcon from '@mui/icons-material/Language';
import axios from '../../../api/axios';
import { AuthContext } from '../../contexts/AuthContext';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/login', { email, password });
            login(response.data.token); // update context and store token
            navigate('/'); // redirect to dashboard
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = () => {
        setEmail('admin@kewars.org');
        setPassword('adminpassword123');
        setError('');
        setLoading(true);
        axios.post('/login', { email: 'admin@kewars.org', password: 'adminpassword123' })
          .then((response) => {
             login(response.data.token);
             navigate('/');
          })
          .catch((err) => {
             setError(err.response?.data?.error || 'Quick login failed.');
             setLoading(false);
          });
    };

    return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
            padding: 2,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle decorative background shapes */}
          <Box
            sx={{
              position: 'absolute',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, transparent 70%)',
              top: '-10%',
              left: '-5%',
              zIndex: 0,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(153, 27, 27, 0.04) 0%, transparent 70%)',
              bottom: '-5%',
              right: '-5%',
              zIndex: 0,
            }}
          />

          <Card
            sx={{
              maxWidth: 440,
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
              zIndex: 1,
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Professional Shield Logo */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    background: '#1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(31, 41, 55, 0.2)',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="#2563eb" opacity="0.9" />
                    <path d="M10 15.5L7.5 13L8.91 11.59L10 12.67L14.59 8.09L16 9.5L10 15.5Z" fill="#ffffff" />
                  </svg>
                </Box>
              </Box>

              <Typography variant="h5" align="center" sx={{ color: '#111827', fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
                KEWARS Portal
              </Typography>
              <Typography variant="body2" align="center" sx={{ color: '#6b7280', mb: 4 }}>
                Sign in to the Early Warning & Response System
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2, bgcolor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      color: '#111827',
                      backgroundColor: '#f9fafb',
                      borderRadius: '10px',
                      '& fieldset': {
                        borderColor: '#d1d5db',
                      },
                      '&:hover fieldset': {
                        borderColor: '#9ca3af',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: '#9ca3af' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      color: '#111827',
                      backgroundColor: '#f9fafb',
                      borderRadius: '10px',
                      '& fieldset': {
                        borderColor: '#d1d5db',
                      },
                      '&:hover fieldset': {
                        borderColor: '#9ca3af',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: '#9ca3af' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#9ca3af' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    bgcolor: '#1f2937',
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: '#111827',
                      boxShadow: '0 4px 16px rgba(31, 41, 55, 0.25)',
                    },
                    textTransform: 'none',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <Box sx={{ mt: 4, mb: 2 }}>
                <Divider sx={{ '&::before, &::after': { borderColor: '#e5e7eb' } }}>
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 600 }}>
                    DEMO ACCESS
                  </Typography>
                </Divider>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleQuickLogin}
                disabled={loading}
                startIcon={<KeyIcon />}
                sx={{
                  py: 1.2,
                  borderRadius: '10px',
                  borderColor: '#2563eb',
                  color: '#2563eb',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#1d4ed8',
                    backgroundColor: 'rgba(37, 99, 235, 0.06)',
                    color: '#1d4ed8',
                  },
                }}
              >
                Quick Login as Admin
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate("/public")}
                disabled={loading}
                startIcon={<PublicIcon />}
                sx={{
                  py: 1.2,
                  mt: 2,
                  borderRadius: '10px',
                  borderColor: '#d1d5db',
                  color: '#6b7280',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#9ca3af',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                  },
                }}
              >
                Go to Public Portal
              </Button>
            </CardContent>
          </Card>
        </Box>
    );
};

export default Login;