import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/global.css'; // Import global.css
import { ThemeProvider } from './context/ThemeContext.tsx'; // Giữ nguyên ThemeProvider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider> {/* Giữ ThemeProvider */}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);