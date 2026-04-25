
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("index.tsx starting...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("index.tsx rendered successfully.");
} catch (error) {
  console.error("Error during initial render:", error);
  rootElement.innerHTML = `
    <div style="color: red; padding: 20px; font-family: sans-serif;">
      <h1>Runtime Error</h1>
      <p>The application failed to start. Please check the console for details.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}
