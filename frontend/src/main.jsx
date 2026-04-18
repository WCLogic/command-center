import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

// Frame-bust guard. The CSP frame-ancestors directive is header-only and
// gh-pages does not expose custom response headers, so we check at runtime.
// If the dashboard is loaded inside an iframe, refuse to render and redirect
// the top window. Defense against click-jacking of the write buttons.
if (typeof window !== 'undefined' && window.top !== window.self) {
  try { window.top.location = window.self.location.href; }
  catch { /* cross-origin top — fall through to empty render */ }
} else {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter basename="/command-center">
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
// deploy test Tue Apr 14 12:03:10 EDT 2026

