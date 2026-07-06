import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';

// HashRouter on purpose: this deploys as a static Catalyst client bundle with no
// server-side rewrite rules for deep links, so hash routing avoids 404s on refresh
// for routes like /#/products.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
