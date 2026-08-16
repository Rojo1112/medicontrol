/**
 * Simple hash-based SPA router
 */

let currentCleanup = null;

const routes = {};

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentRoute() {
  return window.location.hash.slice(1) || '/';
}

async function handleRouteChange() {
  const path = getCurrentRoute();
  const handler = routes[path] || routes['/'];

  if (!handler) return;

  // Cleanup previous page
  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  const app = document.getElementById('app');
  const cleanup = await handler(app);

  if (typeof cleanup === 'function') {
    currentCleanup = cleanup;
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);

  // Initial route
  if (!window.location.hash) {
    window.location.hash = '/';
  } else {
    handleRouteChange();
  }
}
