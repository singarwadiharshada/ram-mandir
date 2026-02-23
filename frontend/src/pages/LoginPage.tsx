import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login({ username, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Show verification step (from screenshot)
      setShowVerification(true);
    } catch (err: any) {
      setError(err.error || 'लॉगिन अयशस्वी');
      setLoading(false);
    }
  };

 const handleVerify = () => {
  // Simple fixed code
  if (verificationCode === '123456' || verificationCode === '1922') {
    navigate('/admin/donations');
  } else {
    setError('अवैध कोड');
  }
};

  if (showVerification) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="temple-header">
            <h1>श्री राम मंदिर, शाहूपुरी, कोल्हापूर</h1>
          </div>

          <div className="verification-box">
            <h1>H</h1>
            <p>Verify that it's you</p>
            <input
              type="text"
              placeholder="एंटर कोड"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
            {error && <div className="error-message">{error}</div>}
            <button onClick={handleVerify} className="btn-primary">
              सत्यापित करा
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="temple-header">
          <h1>श्री राम मंदिर, शाहूपुरी, कोल्हापूर</h1>
          
        </div>

        <h3>प्रशासक लॉगिन</h3>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>वापरकर्ता नाव</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="superadmin"
              required
            />
          </div>

          <div className="form-group">
            <label>पासवर्ड</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'लॉगिन करत आहे...' : 'लॉगिन'}
          </button>
        </form>

        <div className="contact-info">
          <p>संपर्क: 8956747400, 9552297302</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;