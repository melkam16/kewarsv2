import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../api/axios';

const Register = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('analyst');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await axios.post('/register', { name, email, password, role });
            setSuccess('Registration successful! You can now login.');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '50px auto' }}>
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
                <input
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: 10 }}
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: 10 }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: 10 }}
                />
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: '100%', marginBottom: 10 }}
                >
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" style={{ width: '100%' }}>Register</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}
        </div>
    );
};

export default Register;