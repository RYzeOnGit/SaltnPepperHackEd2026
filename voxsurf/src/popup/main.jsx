import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import '../styles.css';

const root = ReactDOM.createRoot(document.getElementById('popup-root'));
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
