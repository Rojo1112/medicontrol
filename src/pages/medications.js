/**
 * Medications page — CRUD + schedule management
 */

import { supabase } from '../lib/supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { MED_COLORS, getDefaultColor } from '../utils/colors.js';
import { getDayName, formatTime12, DAY_NAMES } from '../utils/dates.js';

export async function renderMedications(container) {
  let medications = [];
  let schedules = {};
  let editingMed = null;
  let showModal = false;
  let showScheduleModal = false;
  let scheduleMedId = null;
  let showDeleteConfirm = null;
  let loading = true;

  // Form state
  let formData = {
    name: '',
    description: '',
    how_to_take: '',
    dose: '',
    color: getDefaultColor(),
  };

  let scheduleForm = {
    days: [],
    time: '08:00',
  };

  async function loadData() {
    loading = true;
    render();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: meds } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false });

    medications = meds || [];

    // Load schedules for each medication
    const medIds = medications.map(m => m.id);
    if (medIds.length > 0) {
      const { data: scheds } = await supabase
        .from('medication_schedules')
        .select('*')
        .in('medication_id', medIds)
        .order('day_of_week')
        .order('time_of_day');

      schedules = {};
      (scheds || []).forEach(s => {
        if (!schedules[s.medication_id]) schedules[s.medication_id] = [];
        schedules[s.medication_id].push(s);
      });
    }

    loading = false;
    render();
  }

  function openAddModal() {
    editingMed = null;
    formData = {
      name: '',
      description: '',
      how_to_take: '',
      dose: '',
      color: getDefaultColor(),
    };
    showModal = true;
    render();
  }

  function openEditModal(med) {
    editingMed = med;
    formData = {
      name: med.name,
      description: med.description || '',
      how_to_take: med.how_to_take || '',
      dose: med.dose || '',
      color: med.color || getDefaultColor(),
    };
    showModal = true;
    render();
  }

  function openScheduleModal(medId) {
    scheduleMedId = medId;
    scheduleForm = { days: [], time: '08:00' };
    showScheduleModal = true;
    render();
  }

  async function handleSaveMed(e) {
    e.preventDefault();

    const name = document.getElementById('med-name')?.value?.trim();
    if (!name) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      name,
      description: document.getElementById('med-desc')?.value?.trim() || '',
      how_to_take: document.getElementById('med-how')?.value?.trim() || '',
      dose: document.getElementById('med-dose')?.value?.trim() || '',
      color: formData.color,
      user_id: user.id,
    };

    try {
      if (editingMed) {
        const { error } = await supabase
          .from('medications')
          .update(payload)
          .eq('id', editingMed.id);
        if (error) throw error;
        showToast('Medicamento actualizado ✓', 'success');
      } else {
        const { error } = await supabase
          .from('medications')
          .insert(payload);
        if (error) throw error;
        showToast('Medicamento agregado ✓', 'success');
      }

      showModal = false;
      await loadData();
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  async function handleDeleteMed(medId) {
    try {
      // Soft delete — set active to false
      const { error } = await supabase
        .from('medications')
        .update({ active: false })
        .eq('id', medId);
      if (error) throw error;
      showToast('Medicamento eliminado', 'info');
      showDeleteConfirm = null;
      await loadData();
    } catch (err) {
      showToast('Error al eliminar: ' + err.message, 'error');
    }
  }

  async function handleAddSchedule(e) {
    e.preventDefault();

    const time = document.getElementById('sched-time')?.value;
    if (!time || scheduleForm.days.length === 0) {
      showToast('Selecciona al menos un día y una hora', 'error');
      return;
    }

    try {
      const inserts = scheduleForm.days.map(day => ({
        medication_id: scheduleMedId,
        day_of_week: day,
        time_of_day: time,
      }));

      const { error } = await supabase
        .from('medication_schedules')
        .insert(inserts);
      if (error) throw error;

      showToast('Horario agregado ✓', 'success');
      showScheduleModal = false;
      await loadData();
    } catch (err) {
      showToast('Error al guardar horario: ' + err.message, 'error');
    }
  }

  async function handleDeleteSchedule(scheduleId) {
    try {
      const { error } = await supabase
        .from('medication_schedules')
        .delete()
        .eq('id', scheduleId);
      if (error) throw error;
      showToast('Horario eliminado', 'info');
      await loadData();
    } catch (err) {
      showToast('Error al eliminar horario', 'error');
    }
  }

  function renderColorPicker() {
    return `
      <div class="form-group">
        <label class="form-label">Color identificativo</label>
        <div class="color-picker-grid">
          ${MED_COLORS.map(c => `
            <button type="button" class="color-swatch ${formData.color === c.hex ? 'selected' : ''}"
                    style="background: ${c.hex}; color: ${c.hex};"
                    data-color="${c.hex}"
                    title="${c.name}"></button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderMedModal() {
    if (!showModal) return '';

    return `
      <div class="modal-overlay open" id="med-modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${editingMed ? 'Editar Medicamento' : 'Nuevo Medicamento'}</h2>
            <button class="modal-close" id="close-med-modal">✕</button>
          </div>
          <form id="med-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label" for="med-name">Nombre del medicamento *</label>
                <input class="form-input" type="text" id="med-name" 
                       placeholder="Ej: Ibuprofeno, Metformina..." 
                       value="${formData.name}" required />
              </div>

              <div class="form-row form-row--2">
                <div class="form-group">
                  <label class="form-label" for="med-dose">Dosis / Cantidad</label>
                  <input class="form-input" type="text" id="med-dose" 
                         placeholder="Ej: 1 pastilla, 5ml..."
                         value="${formData.dose}" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="med-how">Vía de administración</label>
                  <select class="form-select" id="med-how">
                    <option value="" ${!formData.how_to_take ? 'selected' : ''}>Seleccionar...</option>
                    <option value="Vía oral" ${formData.how_to_take === 'Vía oral' ? 'selected' : ''}>Vía oral</option>
                    <option value="Sublingual" ${formData.how_to_take === 'Sublingual' ? 'selected' : ''}>Sublingual</option>
                    <option value="Inyección" ${formData.how_to_take === 'Inyección' ? 'selected' : ''}>Inyección</option>
                    <option value="Tópica" ${formData.how_to_take === 'Tópica' ? 'selected' : ''}>Tópica (crema/gel)</option>
                    <option value="Inhalación" ${formData.how_to_take === 'Inhalación' ? 'selected' : ''}>Inhalación</option>
                    <option value="Gotas" ${formData.how_to_take === 'Gotas' ? 'selected' : ''}>Gotas</option>
                    <option value="Parche" ${formData.how_to_take === 'Parche' ? 'selected' : ''}>Parche</option>
                    <option value="Otra" ${formData.how_to_take === 'Otra' ? 'selected' : ''}>Otra</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="med-desc">Descripción / Notas</label>
                <textarea class="form-input form-input--textarea" id="med-desc" 
                          placeholder="¿Para qué es? Efectos secundarios, notas...">${formData.description}</textarea>
              </div>

              ${renderColorPicker()}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn--secondary" id="cancel-med-modal">Cancelar</button>
              <button type="submit" class="btn btn--primary">${editingMed ? 'Guardar Cambios' : 'Agregar'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderScheduleModal() {
    if (!showScheduleModal) return '';

    return `
      <div class="modal-overlay open" id="sched-modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">Agregar Horario</h2>
            <button class="modal-close" id="close-sched-modal">✕</button>
          </div>
          <form id="sched-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Días de la semana</label>
                <div class="day-selector">
                  ${DAY_NAMES.map((name, i) => `
                    <button type="button" class="day-btn ${scheduleForm.days.includes(i) ? 'active' : ''}" 
                            data-day="${i}">${name}</button>
                  `).join('')}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="sched-time">Hora</label>
                <input class="form-input" type="time" id="sched-time" 
                       value="${scheduleForm.time}" required />
              </div>

              <div style="display:flex; gap: var(--space-xs); flex-wrap: wrap; margin-top: var(--space-xs);">
                ${[
                  { label: 'Todos los días', days: [0,1,2,3,4,5,6] },
                  { label: 'Lun-Vie', days: [1,2,3,4,5] },
                  { label: 'Fines de semana', days: [0,6] },
                ].map(preset => `
                  <button type="button" class="btn btn--sm btn--secondary sched-preset" 
                          data-preset='${JSON.stringify(preset.days)}'>${preset.label}</button>
                `).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn--secondary" id="cancel-sched-modal">Cancelar</button>
              <button type="submit" class="btn btn--primary">Agregar Horario</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderDeleteConfirm() {
    if (!showDeleteConfirm) return '';

    return `
      <div class="confirm-overlay open" id="delete-confirm-overlay">
        <div class="confirm-box">
          <div class="confirm-icon">⚠️</div>
          <h3 class="confirm-title">¿Eliminar medicamento?</h3>
          <p class="confirm-text">Se eliminará "${showDeleteConfirm.name}" y todos sus horarios. Esta acción no se puede deshacer.</p>
          <div class="confirm-actions">
            <button class="btn btn--secondary" id="cancel-delete">Cancelar</button>
            <button class="btn btn--danger" id="confirm-delete">Eliminar</button>
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    container.innerHTML = `
      <div class="page-container">
        <header style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--space-lg);">
          <div>
            <h1 class="page-title animate-in">Mis Medicinas</h1>
            <p class="page-subtitle animate-in animate-in-delay-1">${medications.length} medicamento${medications.length !== 1 ? 's' : ''} activo${medications.length !== 1 ? 's' : ''}</p>
          </div>
        </header>

        ${loading ? `
          <div style="display:grid; place-items:center; padding: var(--space-3xl);">
            <div class="spinner" style="width:36px; height:36px; color:var(--accent);"></div>
          </div>
        ` : medications.length === 0 ? `
          <div class="empty-state animate-in animate-in-delay-2">
            <span class="empty-state-icon">💊</span>
            <h2 class="empty-state-title">Sin medicamentos</h2>
            <p class="empty-state-text">Agrega tu primer medicamento para comenzar a llevar el control de tus tomas.</p>
            <button class="btn btn--primary" id="add-med-empty">＋ Agregar Medicamento</button>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:var(--space-md);">
            ${medications.map((med, i) => {
              const medSchedules = schedules[med.id] || [];
              return `
                <div class="glass-card med-card animate-in" style="animation-delay:${i * 60}ms;">
                  <div style="position:absolute; top:0; left:0; right:0; height:3px; background:${med.color};"></div>
                  <div class="med-card-header">
                    <div class="med-card-info">
                      <div class="med-card-name">
                        <span class="med-card-dot" style="background:${med.color}; color:${med.color};"></span>
                        ${med.name}
                      </div>
                      ${med.description ? `<p class="med-card-desc">${med.description}</p>` : ''}
                      <div class="med-card-meta">
                        ${med.dose ? `<span class="badge badge--info">💊 ${med.dose}</span>` : ''}
                        ${med.how_to_take ? `<span class="badge badge--info">📋 ${med.how_to_take}</span>` : ''}
                      </div>
                    </div>
                    <div class="med-card-actions">
                      <button class="btn btn--icon btn--ghost edit-med-btn" data-id="${med.id}" title="Editar">✏️</button>
                      <button class="btn btn--icon btn--ghost delete-med-btn" data-id="${med.id}" title="Eliminar">🗑️</button>
                    </div>
                  </div>

                  <div class="med-card-schedule">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                      <span class="med-card-schedule-title">📅 Horarios programados</span>
                      <button class="btn btn--sm btn--secondary add-sched-btn" data-id="${med.id}">＋ Horario</button>
                    </div>
                    ${medSchedules.length === 0 ? `
                      <p style="font-size:var(--font-size-xs); color:var(--text-tertiary); margin-top:var(--space-sm);">
                        Sin horarios programados. Agrega uno para controlar tus tomas.
                      </p>
                    ` : `
                      <div class="schedule-grid" style="margin-top:var(--space-sm);">
                        ${medSchedules.map(s => `
                          <span class="schedule-chip">
                            ${getDayName(s.day_of_week)} ${formatTime12(s.time_of_day)}
                            <button class="schedule-chip-remove del-sched-btn" data-sched-id="${s.id}">✕</button>
                          </span>
                        `).join('')}
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <button class="fab" id="add-med-fab" title="Agregar medicamento">＋</button>

      ${renderNavbar()}
      ${renderMedModal()}
      ${renderScheduleModal()}
      ${renderDeleteConfirm()}
    `;

    bindEvents();
  }

  function bindEvents() {
    // FAB & empty state add button
    document.getElementById('add-med-fab')?.addEventListener('click', openAddModal);
    document.getElementById('add-med-empty')?.addEventListener('click', openAddModal);

    // Edit buttons
    container.querySelectorAll('.edit-med-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const med = medications.find(m => m.id === btn.dataset.id);
        if (med) openEditModal(med);
      });
    });

    // Delete buttons
    container.querySelectorAll('.delete-med-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const med = medications.find(m => m.id === btn.dataset.id);
        if (med) {
          showDeleteConfirm = med;
          render();
        }
      });
    });

    // Add schedule buttons
    container.querySelectorAll('.add-sched-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openScheduleModal(btn.dataset.id);
      });
    });

    // Delete schedule buttons
    container.querySelectorAll('.del-sched-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteSchedule(btn.dataset.schedId);
      });
    });

    // Med modal events
    document.getElementById('close-med-modal')?.addEventListener('click', () => {
      showModal = false;
      render();
    });
    document.getElementById('cancel-med-modal')?.addEventListener('click', () => {
      showModal = false;
      render();
    });
    document.getElementById('med-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'med-modal-overlay') {
        showModal = false;
        render();
      }
    });
    document.getElementById('med-form')?.addEventListener('submit', handleSaveMed);

    // Color swatch clicks
    container.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        formData.color = swatch.dataset.color;
        // Update selection visually
        container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
    });

    // Schedule modal events
    document.getElementById('close-sched-modal')?.addEventListener('click', () => {
      showScheduleModal = false;
      render();
    });
    document.getElementById('cancel-sched-modal')?.addEventListener('click', () => {
      showScheduleModal = false;
      render();
    });
    document.getElementById('sched-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'sched-modal-overlay') {
        showScheduleModal = false;
        render();
      }
    });
    document.getElementById('sched-form')?.addEventListener('submit', handleAddSchedule);

    // Day selector buttons
    container.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.day);
        const idx = scheduleForm.days.indexOf(day);
        if (idx >= 0) {
          scheduleForm.days.splice(idx, 1);
          btn.classList.remove('active');
        } else {
          scheduleForm.days.push(day);
          btn.classList.add('active');
        }
      });
    });

    // Schedule presets
    container.querySelectorAll('.sched-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        scheduleForm.days = JSON.parse(btn.dataset.preset);
        container.querySelectorAll('.day-btn').forEach(db => {
          const day = parseInt(db.dataset.day);
          db.classList.toggle('active', scheduleForm.days.includes(day));
        });
      });
    });

    // Delete confirm
    document.getElementById('cancel-delete')?.addEventListener('click', () => {
      showDeleteConfirm = null;
      render();
    });
    document.getElementById('confirm-delete')?.addEventListener('click', () => {
      if (showDeleteConfirm) handleDeleteMed(showDeleteConfirm.id);
    });
    document.getElementById('delete-confirm-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'delete-confirm-overlay') {
        showDeleteConfirm = null;
        render();
      }
    });
  }

  await loadData();
}
