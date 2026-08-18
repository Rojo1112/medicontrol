/**
 * Patients page — List, select and manage patients
 */

import { supabase } from '../lib/supabase.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../components/toast.js';

export async function renderPatients(container) {
  let patients = [];
  let loading = true;
  let patientToDelete = null;

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

  async function handleDeletePatient(patientId) {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      // Clean local storage if currently active
      if (localStorage.getItem('selected_patient_id') === patientId) {
        localStorage.removeItem('selected_patient_id');
        localStorage.removeItem('selected_patient_name');
      }

      showToast('Paciente eliminado ✓', 'info');
      patientToDelete = null;
      await loadPatients();
    } catch (err) {
      showToast('Error al eliminar paciente: ' + err.message, 'error');
    }
  }

  function renderDeleteModal() {
    if (!patientToDelete) return '';

    return `
      <div class="modal-overlay open" id="delete-patient-overlay">
        <div class="modal" style="max-width: 420px; text-align: center;">
          <div class="modal-header" style="justify-content: flex-end; padding-bottom: 0;">
            <button class="modal-close" id="cancel-delete-x">✕</button>
          </div>
          <div class="modal-body" style="padding-top: 0;">
            <div style="font-size: 3rem; margin-bottom: var(--space-xs);">⚠️</div>
            <h2 class="modal-title" style="font-size: 1.35rem; margin-bottom: var(--space-xs);">¿Eliminar paciente?</h2>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
              Se eliminará a <strong style="color: var(--text-primary);">${patientToDelete.name}</strong> junto con todos sus medicamentos, horarios e historial de tomas. Esta acción no se puede deshacer.
            </p>
          </div>
          <div class="modal-footer" style="justify-content: center; gap: var(--space-md); padding-top: var(--space-md);">
            <button type="button" class="btn btn--secondary" id="cancel-delete-btn">Cancelar</button>
            <button type="button" class="btn btn--danger" id="confirm-delete-btn">Eliminar Paciente</button>
          </div>
        </div>
      </div>
    `;
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
            <input type="text" id="patient-name" class="form-input" placeholder="Nombre del paciente (ej: Mamá, Juan...)" required style="flex: 1;" />
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
              <div class="glass-card patient-card" data-id="${p.id}" data-name="${p.name}" style="cursor: pointer; position: relative; transition: transform 0.2s, background 0.2s; text-align: center; padding: var(--space-xl) var(--space-lg) var(--space-lg);">
                <button class="delete-patient-btn" data-id="${p.id}" data-name="${p.name}" title="Eliminar paciente" style="
                  position: absolute;
                  top: 12px;
                  right: 12px;
                  width: 32px;
                  height: 32px;
                  border-radius: var(--radius-full);
                  border: 1px solid var(--border-color);
                  background: var(--bg-surface);
                  color: var(--text-tertiary);
                  cursor: pointer;
                  display: grid;
                  place-items: center;
                  font-size: 14px;
                  transition: all var(--transition-fast);
                  z-index: 2;
                ">
                  🗑️
                </button>
                <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto var(--space-md);">
                  ${p.name.charAt(0).toUpperCase()}
                </div>
                <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">${p.name}</h3>
                <p style="margin: var(--space-xs) 0 0; font-size: 0.875rem; color: var(--text-muted);">Ver medicamentos →</p>
              </div>
            `).join('')}
          </div>
        `}
        
        <div style="margin-top: var(--space-2xl); text-align: center;">
            <button id="logout-btn" class="btn btn--secondary">Cerrar Sesión</button>
        </div>

        ${renderDeleteModal()}
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Add patient form
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
        showToast('Error al crear el paciente: ' + error.message, 'error');
      } else {
        input.value = '';
        showToast(`Paciente "${name}" agregado ✓`, 'success');
        loadPatients();
      }
    });

    // Delete patient button click (triggers modal)
    container.querySelectorAll('.delete-patient-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        patientToDelete = {
          id: btn.dataset.id,
          name: btn.dataset.name,
        };
        render();
      });
    });

    // Delete modal cancel & confirm
    document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
      patientToDelete = null;
      render();
    });
    document.getElementById('cancel-delete-x')?.addEventListener('click', () => {
      patientToDelete = null;
      render();
    });
    document.getElementById('delete-patient-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'delete-patient-overlay') {
        patientToDelete = null;
        render();
      }
    });
    document.getElementById('confirm-delete-btn')?.addEventListener('click', () => {
      if (patientToDelete) {
        handleDeletePatient(patientToDelete.id);
      }
    });

    // Patient card selection
    container.querySelectorAll('.patient-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent navigating if clicking delete button
        if (e.target.closest('.delete-patient-btn')) return;

        const id = card.dataset.id;
        const name = card.dataset.name;
        // Guardar en localStorage para contexto global
        localStorage.setItem('selected_patient_id', id);
        localStorage.setItem('selected_patient_name', name);
        navigate('/dashboard');
      });
    });

    // Logout
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
    .delete-patient-btn:hover {
        background: var(--danger-soft) !important;
        color: var(--danger-text) !important;
        border-color: var(--danger) !important;
        transform: scale(1.1);
    }
  `;
  document.head.appendChild(style);

  await loadPatients();
}
