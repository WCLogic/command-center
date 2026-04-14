import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/command-center">
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
// deploy test Tue Apr 14 12:03:10 EDT 2026
