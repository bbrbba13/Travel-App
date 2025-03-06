import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import PackingApp from './travel-packing-app';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <PackingApp />
  </React.StrictMode>
);
