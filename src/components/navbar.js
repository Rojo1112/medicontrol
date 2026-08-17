/**
 * Bottom navigation bar
 */

import { getCurrentRoute } from '../utils/router.js';

export function renderNavbar() {
  const currentPath = window.location.hash.replace('#', '') || '/';
  const patientName = localStorage.getItem('selected_patient_name') || 'Paciente';
  
  return `
    <nav class="navbar glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-sm); font-size:0.875rem; color:var(--text-muted);">
        <span>👤 ${patientName}</span>
        <a href="#/patients" style="color:var(--accent); text-decoration:none; font-weight:500;">Cambiar</a>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <a href="#/dashboard" class="nav-item ${currentPath === '/dashboard' ? 'active' : ''}">
          <span class="nav-icon">📅</span>
          <span>Hoy</span>
        </a>
        <a href="#/medications" class="nav-item ${currentPath === '/medications' ? 'active' : ''}">
          <span class="nav-icon">💊</span>
          <span>Medicinas</span>
        </a>
        <a href="#/history" class="nav-item ${currentPath === '/history' ? 'active' : ''}">
          <span class="nav-icon">📋</span>
          <span>Historial</span>
        </a>
        <button class="nav-item" style="border:none; background:transparent; cursor:pointer;" onclick="window.handleLogout()">
          <span class="nav-icon">🚪</span>
          <span>Salir</span>
        </button>
      </div>
    </nav>
  `;
}
