import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Crash Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b132b',
          color: '#ffffff',
          padding: '20px',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <img src="/badge.png" alt="Police Badge" style={{ width: '60px', height: '60px', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            अयोध्या पुलिस ड्यूटी कार्ड पोर्टल
          </h2>
          <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px', maxWidth: '360px' }}>
            पोर्टल लोड करने में कोई अस्थायी समस्या आई है। कृपया डेटा साफ़ करके पुनः लोड करें।
          </p>
          {this.state.error && (
            <div style={{ margin: '0 0 20px 0', padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', maxWidth: '400px', fontSize: '11px', color: '#fca5a5', textAlign: 'left', wordBreak: 'break-word' }}>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              backgroundColor: '#f59e0b',
              color: '#020617',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            पोर्टल पुनः लोड करें
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { LanguageProvider } from './context/LanguageContext.jsx';

// Ensure dark class is removed if leftover
try {
  document.documentElement.classList.remove('dark');
  localStorage.removeItem('duty_portal_theme');
} catch (e) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
