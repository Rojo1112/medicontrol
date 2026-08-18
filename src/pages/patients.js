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

      showToast('Paciente borrado exitosamente ✓', 'info');
      patientToDelete = null;
      await loadPatients();
    } catch (err) {
      showToast('Error al borrar paciente: ' + err.message, 'error');
    }
  }

  function renderDeleteModal() {
    if (!patientToDelete) return '';

    return `
      <div class="modal-overlay open" id="delete-patient-overlay">
        <div class="modal" style="max-width: 420px; text-align: center; border: 1px solid hsla(0 80% 60% / 0.3);">
          <div class="modal-header" style="justify-content: flex-end; padding-bottom: 0;">
            <button class="modal-close" id="cancel-delete-x">✕</button>
          </div>
          <div class="modal-body" style="padding-top: 0;">
            <div style="font-size: 3.5rem; margin-bottom: var(--space-xs);">⚠️</div>
            <h2 class="modal-title" style="font-size: 1.35rem; margin-bottom: var(--space-xs); color: var(--danger-text);">¿Borrar paciente?</h2>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
              ¿Estás seguro de que deseas borrar a <strong style="color: var(--text-primary); font-size: 1.05rem;">"${patientToDelete.name}"</strong>?
            </p>
            <p style="color: var(--text-muted); font-size: 0.825rem; margin-top: var(--space-xs);">
              Se borrarán automáticamente todos sus medicamentos, horarios y registros asociados.
            </p>
          </div>
          <div class="modal-footer" style="justify-content: center; gap: var(--space-md); padding-top: var(--space-md);">
            <button type="button" class="btn btn--secondary" id="cancel-delete-btn">Cancelar</button>
            <button type="button" class="btn btn--danger" id="confirm-delete-btn">Sí, Borrar Paciente</button>
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    const activePatientId = localStorage.getItem('selected_patient_id');

    container.innerHTML = `
      <div class="page-container">
        <header style="margin-bottom: var(--space-lg); text-align: center;">
          <div style="font-size: 3rem; margin-bottom: var(--space-sm);">👥</div>
          <h1 class="page-title animate-in">Gestión de Pacientes</h1>
          <p class="page-subtitle animate-in animate-in-delay-1">Selecciona, agrega o borra pacientes</p>
        </header>

        <!-- Formulario para agregar paciente -->
        <div class="glass-card animate-in animate-in-delay-1" style="margin-bottom: var(--space-xl);">
          <form id="add-patient-form" style="display: flex; gap: var(--space-sm);">
            <input type="text" id="patient-name" class="form-input" placeholder="Nombre del nuevo paciente (ej: Mamá, Juan...)" required style="flex: 1;" />
            <button type="submit" class="btn btn--primary">＋ Agregar</button>
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
            <p class="empty-state-text">Agrega tu primer paciente en el formulario de arriba.</p>
          </div>
        ` : `
          <div style="display: grid; gap: var(--space-md); grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));" class="animate-in animate-in-delay-2">
            ${patients.map(p => {
              const isSelected = p.id === activePatientId;
              return `
                <div class="glass-card patient-card ${isSelected ? 'selected-patient' : ''}" style="display: flex; flex-direction: column; justify-content: space-between; text-align: center; padding: var(--space-lg); ${isSelected ? 'border-color: var(--accent); box-shadow: var(--shadow-glow);' : ''}">
                  <div>
                    ${isSelected ? `<span class="badge badge--success" style="margin-bottom: var(--space-sm);">✓ Activo</span>` : ''}
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; margin: 0 auto var(--space-sm);">
                      ${p.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600;">${p.name}</h3>
                  </div>

                  <div style="display: flex; gap: var(--space-xs); margin-top: var(--space-md); justify-content: center;">
                    <button class="btn btn--primary select-patient-btn" data-id="${p.id}" data-name="${p.name}" style="flex: 1; font-size: 0.875rem; padding: var(--space-xs) var(--space-sm);">
                      ${isSelected ? 'Ver Hoy →' : 'Seleccionar'}
                    </button>
                    <button class="btn btn--secondary delete-patient-btn" data-id="${p.id}" data-name="${p.name}" title="Borrar paciente" style="color: var(--danger-text); border-color: hsla(0 80% 60% / 0.3); padding: var(--space-xs) var(--space-sm); font-size: 0.875rem;">
                      🗑️ Borrar
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
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
    container.querySelectorAll('.select-patient-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
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

  await loadPatients();
}
