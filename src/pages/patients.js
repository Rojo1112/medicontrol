/**
 * Patients page — List and select patients
 */

import { supabase } from '../lib/supabase.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';

export async function renderPatients(container) {
  let patients = [];
  let loading = true;

  async function loadPatients() {
    loading = true;
    render();

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      patients = data;
    }
    
    loading = false;
    render();
  }

  function render() {
    container.innerHTML = `
      <div class="page-container">
        <header style="margin-bottom: var(--space-lg); text-align: center;">
          <div style="font-size: 3rem; margin-bottom: var(--space-sm);">👥</div>
          <h1 class="page-title animate-in">Pacientes</h1>
          <p class="page-subtitle animate-in animate-in-delay-1">Selecciona a quién vas a cuidar hoy</p>
        </header>

        <!-- Formulario para agregar paciente -->
        <div class="glass-card animate-in animate-in-delay-1" style="margin-bottom: var(--space-xl);">
          <form id="add-patient-form" style="display: flex; gap: var(--space-sm);">
            <input type="text" id="patient-name" class="form-input" placeholder="Nombre del paciente" required style="flex: 1;" />
            <button type="submit" class="btn btn--primary">Agregar</button>
          </form>
        </div>

        <!-- Lista de pacientes -->
        ${loading ? `
          <div style="display:grid; place-items:center; padding: var(--space-3xl);">
            <div class="spinner" style="width:36px; height:36px; color:var(--accent);"></div>
          </div>
        ` : patients.length === 0 ? `
          <div class="empty-state animate-in animate-in-delay-2">
            <span class="empty-state-icon">👤</span>
            <h2 class="empty-state-title">Aún no hay pacientes</h2>
            <p class="empty-state-text">Agrega el primer paciente en el formulario de arriba.</p>
          </div>
        ` : `
          <div style="display: grid; gap: var(--space-md); grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));" class="animate-in animate-in-delay-2">
            ${patients.map(p => `
              <div class="glass-card patient-card" data-id="${p.id}" data-name="${p.name}" style="cursor: pointer; transition: transform 0.2s, background 0.2s; text-align: center; padding: var(--space-xl);">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto var(--space-md);">
                  ${p.name.charAt(0).toUpperCase()}
                </div>
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">${p.name}</h3>
                <p style="margin: var(--space-xs) 0 0; font-size: 0.875rem; color: var(--text-muted);">Ver medicamentos</p>
              </div>
            `).join('')}
          </div>
        `}
        
        <div style="margin-top: var(--space-2xl); text-align: center;">
            <button id="logout-btn" class="btn btn--secondary">Cerrar Sesión</button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('add-patient-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('patient-name');
      const name = input.value.trim();
      if (!name) return;

      const btn = e.target.querySelector('button');
      const oldText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px;"></span>';
      btn.disabled = true;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('patients')
        .insert({ name, created_by: user?.id });

      btn.innerHTML = oldText;
      btn.disabled = false;

      if (error) {
        showToast('Error al crear el paciente', 'error');
      } else {
        input.value = '';
        showToast(`Paciente ${name} agregado`, 'success');
        loadPatients();
      }
    });

    container.querySelectorAll('.patient-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const name = card.dataset.name;
        // Guardar en localStorage para contexto global
        localStorage.setItem('selected_patient_id', id);
        localStorage.setItem('selected_patient_name', name);
        navigate('/dashboard');
      });
    });

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('selected_patient_id');
        localStorage.removeItem('selected_patient_name');
        showToast('Sesión cerrada', 'info');
        navigate('/');
    });
  }

  // Inject hover styles dynamically
  const style = document.createElement('style');
  style.innerHTML = `
    .patient-card:hover {
        transform: translateY(-4px);
        background: hsla(var(--glass-bg-base) / 0.8);
        box-shadow: 0 12px 24px -10px hsla(0 0% 0% / 0.3);
    }
  `;
  document.head.appendChild(style);

  await loadPatients();
}
