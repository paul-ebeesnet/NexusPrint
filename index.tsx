import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Router } from 'wouter';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Hash Location Hook for robust navigation in sandboxes/iframes
// Returns [location, navigate]
const useHashLocation = (): [string, (path: string) => void] => {
  const [loc, setLoc] = useState(() => window.location.hash.replace(/^#/, "") || "/");

  useEffect(() => {
    const handler = () => {
        setLoc(window.location.hash.replace(/^#/, "") || "/");
    };

    // Subscribe to hash changes
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [loc, navigate];
};

const Root = () => (
  <Router hook={useHashLocation}>
    <App />
  </Router>
);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);