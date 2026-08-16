/**
 * Bottom navigation bar
 */

import { getCurrentRoute } from '../utils/router.js';

export function renderNavbar() {
  const currentRoute = getCurrentRoute();

  const items = [
    { path: '/dashboard', icon: '📋', label: 'Hoy' },
    { path: '/medications', icon: '💊', label: 'Medicinas' },
    { path: '/history', icon: '📊', label: 'Historial' },
    { path: 'logout', icon: '🚪', label: 'Salir', action: true },
  ];

  return `
    <nav class="navbar" id="main-navbar">
      <div class="navbar-inner">
        ${items.map(item => item.action
          ? `<button onclick="handleLogout()" class="nav-item" id="nav-logout">
              <span class="nav-icon">${item.icon}</span>
              <span>${item.label}</span>
            </button>`
          : `<a href="#${item.path}" 
             class="nav-item ${currentRoute === item.path ? 'active' : ''}"
             id="nav-${item.path.slice(1)}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>`
        ).join('')}
      </div>
    </nav>
  `;
}
