/**
 * MediControl — Main entry point
 */

import './style.css';
import { supabase } from './lib/supabase.js';
import { registerRoute, initRouter, navigate } from './utils/router.js';
import { renderAuth } from './pages/auth.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderMedications } from './pages/medications.js';
import { renderHistory } from './pages/history.js';
import { showToast } from './components/toast.js';

// Show loading screen while checking auth
const app = document.getElementById('app');
app.innerHTML = `
  <div class="loading-page">
    <div style="text-align:center;">
      <span style="font-size:48px; display:block; margin-bottom:1rem;">💊</span>
      <div class="spinner" style="width:36px; height:36px; color:var(--accent); margin:0 auto;"></div>
    </div>
  </div>
`;

// Auth guard wrapper
function withAuth(pageHandler) {
  return async (container) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
      return;
    }
    return pageHandler(container);
  };
}

// Register routes
registerRoute('/', async (container) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    navigate('/dashboard');
    return;
  }
  return renderAuth(container);
});

registerRoute('/dashboard', withAuth(renderDashboard));
registerRoute('/medications', withAuth(renderMedications));
registerRoute('/history', withAuth(renderHistory));

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    navigate('/dashboard');
  } else if (event === 'SIGNED_OUT') {
    navigate('/');
  }
});

// Add logout functionality accessible from navbar
window.handleLogout = async () => {
  await supabase.auth.signOut();
  showToast('Sesión cerrada', 'info');
  navigate('/');
};

// Initialize router
initRouter();
