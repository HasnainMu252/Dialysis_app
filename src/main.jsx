import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><App/><Toaster position="top-right"/></React.StrictMode>);
