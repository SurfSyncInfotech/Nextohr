import React from 'react';
import ReactDOM from 'react-dom/client';
import 'iconify-icon'; // registers the <iconify-icon> web component
import App from './App.jsx';
import './styles/landing.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
