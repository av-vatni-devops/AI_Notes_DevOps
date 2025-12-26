// client/my-project/src/config.js

// Final rules:
// - If VITE_API_URL is set → always use it (CI, special envs).
// - If running on Vite dev/preview (ports 5173/4173) → talk to localhost:5000 (dev backend).
// - Otherwise (Docker/Kubernetes/any other prod host) → use relative /api (backend via Nginx).

function defaultApiUrl() {
    if (typeof window === 'undefined') {
      // SSR / build time fallback
      return 'http://localhost:5000';
    }
  
    const port = window.location.port;
  
    // Local dev / preview → backend on :5000
    if (port === '5173' || port === '4173') {
      return 'http://localhost:5000';
    }
  
    // Docker/Kubernetes/any other prod host → same-origin /api
    return '';
  }
  
  const config = {
    apiUrl: import.meta.env.VITE_API_URL || defaultApiUrl(),
  };
  
  export default config;