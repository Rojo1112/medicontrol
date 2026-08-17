/**
 * MediControl — Main entry point
 */

import './style.css';
import { supabase } from './lib/supabase.js';
import { registerRoute, initRouter, navigate } from './utils/router.js';
import { renderAuth } from './pages/auth.js';
import { renderPatients } from './pages/patients.js';
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

// Patient context guard wrapper
function withPatient(pageHandler) {
  return async (container) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
      return;
    }
    const patientId = localStorage.getItem('selected_patient_id');
    if (!patientId) {
      navigate('/patients');
      return;
    }
    return pageHandler(container);
  };
}

// Register routes
registerRoute('/', async (container) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    navigate('/patients');
    return;
  }
  return renderAuth(container);
});

registerRoute('/patients', withAuth(renderPatients));
registerRoute('/dashboard', withPatient(renderDashboard));
registerRoute('/medications', withPatient(renderMedications));
registerRoute('/history', withPatient(renderHistory));

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Solo navegamos a patients si estamos en la raíz (login)
    // para evitar interrumpir recargas de página
    if (window.location.hash === '' || window.location.hash === '#/') {
      navigate('/patients');
    }
  } else if (event === 'SIGNED_OUT') {
    localStorage.removeItem('selected_patient_id');
    localStorage.removeItem('selected_patient_name');
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
