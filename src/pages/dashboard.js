/**
 * Dashboard page — Daily medication timeline
 */

import { supabase } from '../lib/supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import {
  formatDate, formatDateISO, formatTime12, getToday,
  getDayOfWeek, addDays, isToday, getDayName
} from '../utils/dates.js';

export async function renderDashboard(container) {
  let currentDate = getToday();
  let entries = [];
  let medications = {};
  let loadingState = true;

  async function loadData() {
    loadingState = true;
    render();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const patientId = localStorage.getItem('selected_patient_id');
    if (!patientId) return;

    // Get all active medications for the user
    const { data: meds } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', patientId)
      .eq('active', true);

    medications = {};
    (meds || []).forEach(m => { medications[m.id] = m; });

    // Get schedules for the current day of week
    const dayOfWeek = getDayOfWeek(currentDate);

    const medIds = Object.keys(medications);
    if (medIds.length === 0) {
      entries = [];
      loadingState = false;
      render();
      return;
    }

    const { data: schedules } = await supabase
      .from('medication_schedules')
      .select('*')
      .in('medication_id', medIds)
      .eq('day_of_week', dayOfWeek)
      .order('time_of_day', { ascending: true });

    const { data: logs } = await supabase
      .from('medication_logs')
      .select('*, medications!inner(*)')
      .eq('medications.patient_id', patientId)
      .eq('scheduled_date', currentDate);

    const logMap = {};
    (logs || []).forEach(l => {
      logMap[`${l.schedule_id}_${l.scheduled_time}`] = l;
    });

    // Merge schedules with logs
    entries = (schedules || []).map(s => {
      const log = logMap[`${s.id}_${s.time_of_day}`];
      const med = medications[s.medication_id];
      return {
        scheduleId: s.id,
        medicationId: s.medication_id,
        medName: med?.name || 'Desconocido',
        medColor: med?.color || '#8b5cf6',
        medDose: med?.dose || '',
        medHowToTake: med?.how_to_take || '',
        time: s.time_of_day,
        logId: log?.id || null,
        status: log?.status || 'pending',
        takenAt: log?.taken_at || null,
      };
    });

    loadingState = false;
    render();
  }

  function getStats() {
    const total = entries.length;
    const taken = entries.filter(e => e.status === 'taken').length;
    const pending = entries.filter(e => e.status === 'pending').length;
    const skipped = entries.filter(e => e.status === 'skipped').length;
    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
    return { total, taken, pending, skipped, pct };
  }

  function renderProgressRing(pct) {
    const r = 34;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--accent)';

    return `
      <div class="progress-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle class="progress-ring-bg" cx="40" cy="40" r="${r}" />
          <circle class="progress-ring-fill" cx="40" cy="40" r="${r}"
                  stroke="${color}"
                  stroke-dasharray="${c}"
                  stroke-dashoffset="${offset}" />
        </svg>
        <div class="progress-ring-text" style="color:${color}">${pct}%</div>
      </div>
    `;
  }

  function render() {
    const stats = getStats();
    const dateLabel = isToday(currentDate) 
      ? `Hoy — ${formatDate(currentDate)}`
      : formatDate(currentDate);
    const dayLabel = getDayName(getDayOfWeek(currentDate), true);

    container.innerHTML = `
      <div class="page-container">
        <header style="margin-bottom: var(--space-lg);">
          <h1 class="page-title animate-in">Mis Medicamentos</h1>
          <p class="page-subtitle animate-in animate-in-delay-1">${dayLabel}</p>
        </header>

        <!-- Date Navigation -->
        <div class="date-nav glass-card animate-in animate-in-delay-1" style="padding: var(--space-md);">
          <button class="btn btn--icon btn--secondary" id="prev-day">◀</button>
          <div style="flex:1; text-align:center;">
            <div class="date-nav-label">${dateLabel}</div>
            ${!isToday(currentDate) ? '<button class="date-nav-today" id="go-today">Ir a hoy</button>' : ''}
          </div>
          <button class="btn btn--icon btn--secondary" id="next-day">▶</button>
        </div>

        ${loadingState ? `
          <div style="display:grid; place-items:center; padding: var(--space-3xl);">
            <div class="spinner" style="width:36px; height:36px; color:var(--accent);"></div>
          </div>
        ` : entries.length === 0 ? `
          <div class="empty-state animate-in animate-in-delay-2">
            <span class="empty-state-icon">📭</span>
            <h2 class="empty-state-title">Sin medicamentos para hoy</h2>
            <p class="empty-state-text">No tienes medicamentos programados para este día. Ve a "Medicinas" para agregar.</p>
            <a href="#/medications" class="btn btn--primary">Agregar Medicamento</a>
          </div>
        ` : `
          <!-- Stats -->
          <div class="stats-bar animate-in animate-in-delay-2">
            <div class="stat-card glass-card">
              <div class="stat-value" style="color: var(--success-text);">${stats.taken}</div>
              <div class="stat-label">Tomados</div>
            </div>
            <div class="stat-card glass-card">
              <div class="stat-value" style="color: var(--warning-text);">${stats.pending}</div>
              <div class="stat-label">Pendientes</div>
            </div>
            <div class="stat-card glass-card" style="display:grid; place-items:center;">
              ${renderProgressRing(stats.pct)}
            </div>
          </div>

          <!-- Timeline -->
          <div class="timeline animate-in animate-in-delay-3">
            ${entries.map((entry, i) => `
              <div class="timeline-item ${entry.status}" 
                   style="--med-color: ${entry.medColor}; animation-delay: ${i * 40}ms;"
                   data-idx="${i}">
                <div style="position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:0 4px 4px 0; background:${entry.medColor};"></div>
                <div class="timeline-time">
                  <span class="timeline-hour">${formatTime12(entry.time).split(' ')[0]}</span>
                  <span class="timeline-period">${formatTime12(entry.time).split(' ')[1]}</span>
                </div>
                <div class="timeline-content">
                  <div class="timeline-med-name">
                    <span class="timeline-med-dot" style="background:${entry.medColor}; box-shadow: 0 0 8px ${entry.medColor};"></span>
                    ${entry.medName}
                  </div>
                  ${entry.medDose ? `<div class="timeline-med-dose">${entry.medDose}</div>` : ''}
                  ${entry.medHowToTake ? `<div class="timeline-med-how">${entry.medHowToTake}</div>` : ''}
                  ${entry.status === 'taken' && entry.takenAt
                    ? `<div class="timeline-med-how" style="color: var(--success-text);">
                        ✓ Tomado a las ${new Date(entry.takenAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                       </div>`
                    : ''
                  }
                  ${entry.status === 'skipped'
                    ? `<div class="timeline-med-how" style="color: var(--danger-text);">✕ Omitido</div>`
                    : ''
                  }
                </div>
                <div class="timeline-actions">
                  ${entry.status === 'pending' ? `
                    <button class="timeline-check timeline-check--take" data-action="take" data-idx="${i}" title="Marcar como tomado">✓</button>
                    <button class="timeline-check timeline-check--skip" data-action="skip" data-idx="${i}" title="Omitir">✕</button>
                  ` : entry.status === 'taken' ? `
                    <button class="timeline-check timeline-check--taken" data-action="undo" data-idx="${i}" title="Deshacer">✓</button>
                  ` : `
                    <button class="timeline-check timeline-check--skip" data-action="undo" data-idx="${i}" title="Deshacer" style="background:var(--danger-soft); color:var(--danger-text); border-color:hsla(0 80% 60% / 0.3);">✕</button>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      ${renderNavbar()}
    `;

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('prev-day')?.addEventListener('click', () => {
      currentDate = addDays(currentDate, -1);
      loadData();
    });

    document.getElementById('next-day')?.addEventListener('click', () => {
      currentDate = addDays(currentDate, 1);
      loadData();
    });

    document.getElementById('go-today')?.addEventListener('click', () => {
      currentDate = getToday();
      loadData();
    });

    // Timeline action buttons
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const action = btn.dataset.action;
        await handleAction(idx, action);
      });
    });
  }

  async function handleAction(idx, action) {
    const entry = entries[idx];
    if (!entry) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (action === 'take' || action === 'skip') {
        const newStatus = action === 'take' ? 'taken' : 'skipped';

        if (entry.logId) {
          // Update existing log
          await supabase
            .from('medication_logs')
            .update({
              status: newStatus,
              taken_at: action === 'take' ? new Date().toISOString() : null,
            })
            .eq('id', entry.logId);
        } else {
          // Insert new log
          const { data } = await supabase
            .from('medication_logs')
            .insert({
              schedule_id: entry.scheduleId,
              medication_id: entry.medicationId,
              user_id: user.id,
              scheduled_date: currentDate,
              scheduled_time: entry.time,
              status: newStatus,
              taken_at: action === 'take' ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (data) entry.logId = data.id;
        }

        entry.status = newStatus;
        entry.takenAt = action === 'take' ? new Date().toISOString() : null;

        showToast(
          action === 'take' ? `${entry.medName} marcado como tomado ✓` : `${entry.medName} omitido`,
          action === 'take' ? 'success' : 'info'
        );
      } else if (action === 'undo') {
        if (entry.logId) {
          await supabase
            .from('medication_logs')
            .update({ status: 'pending', taken_at: null })
            .eq('id', entry.logId);
        }

        entry.status = 'pending';
        entry.takenAt = null;
        showToast(`${entry.medName} vuelto a pendiente`, 'info');
      }

      render();
    } catch (err) {
      showToast('Error al actualizar. Intenta de nuevo.', 'error');
    }
  }

  await loadData();
}
