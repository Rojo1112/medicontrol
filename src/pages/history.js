/**
 * History page — Past medication logs
 */

import { supabase } from '../lib/supabase.js';
import { renderNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import {
  formatDate, formatDateISO, formatTime12, getToday,
  addDays, getDayName, getDayOfWeek, isToday
} from '../utils/dates.js';

export async function renderHistory(container) {
  let currentDate = getToday();
  let weekDates = [];
  let logsByDate = {};
  let medications = {};
  let loading = true;

  function getWeekDates(centerDate) {
    const dates = [];
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(centerDate, i));
    }
    return dates;
  }

  async function loadData() {
    loading = true;
    render();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get medications
    const { data: meds } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id);

    medications = {};
    (meds || []).forEach(m => { medications[m.id] = m; });

    weekDates = getWeekDates(currentDate);

    // Get logs for the week
    const { data: logs } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', weekDates[0])
      .lte('scheduled_date', weekDates[weekDates.length - 1])
      .order('scheduled_time', { ascending: true });

    logsByDate = {};
    weekDates.forEach(d => { logsByDate[d] = []; });
    (logs || []).forEach(l => {
      if (logsByDate[l.scheduled_date]) {
        logsByDate[l.scheduled_date].push(l);
      }
    });

    loading = false;
    render();
  }

  function getDateStats(date) {
    const logs = logsByDate[date] || [];
    const total = logs.length;
    const taken = logs.filter(l => l.status === 'taken').length;
    const skipped = logs.filter(l => l.status === 'skipped').length;
    const pending = logs.filter(l => l.status === 'pending').length;
    const pct = total > 0 ? Math.round((taken / total) * 100) : -1;
    return { total, taken, skipped, pending, pct };
  }

  function render() {
    const selectedLogs = logsByDate[currentDate] || [];
    const dayLabel = getDayName(getDayOfWeek(currentDate), true);

    container.innerHTML = `
      <div class="page-container">
        <header style="margin-bottom: var(--space-lg);">
          <h1 class="page-title animate-in">Historial</h1>
          <p class="page-subtitle animate-in animate-in-delay-1">Revisa tu cumplimiento</p>
        </header>

        ${loading ? `
          <div style="display:grid; place-items:center; padding: var(--space-3xl);">
            <div class="spinner" style="width:36px; height:36px; color:var(--accent);"></div>
          </div>
        ` : `
          <!-- Week navigation -->
          <div class="date-nav animate-in animate-in-delay-1" style="margin-bottom: var(--space-sm);">
            <button class="btn btn--icon btn--secondary" id="prev-week">◀</button>
            <div style="flex:1; text-align:center;">
              <div class="date-nav-label" style="font-size:var(--font-size-base);">Semana</div>
            </div>
            <button class="btn btn--icon btn--secondary" id="next-week">▶</button>
          </div>

          <!-- Week dots -->
          <div class="animate-in animate-in-delay-2" style="display:flex; gap:var(--space-xs); margin-bottom:var(--space-lg); overflow-x:auto; padding: var(--space-xs) 0;">
            ${weekDates.map(date => {
              const stats = getDateStats(date);
              const isSelected = date === currentDate;
              const today = isToday(date);
              let bgColor = 'var(--bg-surface)';
              if (stats.pct >= 80) bgColor = 'var(--success-soft)';
              else if (stats.pct >= 50) bgColor = 'var(--warning-soft)';
              else if (stats.pct >= 0 && stats.total > 0) bgColor = 'var(--danger-soft)';

              return `
                <button class="glass-card week-day-btn" data-date="${date}" style="
                  flex: 1;
                  min-width: 60px;
                  padding: var(--space-sm) var(--space-xs);
                  text-align: center;
                  cursor: pointer;
                  transition: all var(--transition-fast);
                  ${isSelected ? `border-color: var(--accent); box-shadow: var(--shadow-glow); background: var(--accent-soft);` : ''}
                  ${today && !isSelected ? 'border-color: var(--border-color-hover);' : ''}
                ">
                  <div style="font-size:var(--font-size-xs); color:${today ? 'var(--accent)' : 'var(--text-tertiary)'}; font-weight:600;">
                    ${getDayName(getDayOfWeek(date))}
                  </div>
                  <div style="font-size:var(--font-size-lg); font-weight:700; color:${isSelected ? 'var(--accent)' : 'var(--text-primary)'};">
                    ${new Date(date + 'T12:00:00').getDate()}
                  </div>
                  ${stats.total > 0 ? `
                    <div style="
                      width: 8px; height: 8px; border-radius: 50%; margin: 4px auto 0;
                      background: ${stats.pct >= 80 ? 'var(--success)' : stats.pct >= 50 ? 'var(--warning)' : 'var(--danger)'};
                    "></div>
                  ` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Day detail -->
          <div class="glass-card animate-in animate-in-delay-3" style="padding: var(--space-lg);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md);">
              <div>
                <h2 class="section-title" style="margin-bottom:0;">${dayLabel}</h2>
                <p style="font-size:var(--font-size-sm); color:var(--text-secondary);">${formatDate(currentDate)}</p>
              </div>
              ${(() => {
                const stats = getDateStats(currentDate);
                if (stats.total === 0) return '';
                return `
                  <div style="text-align:right;">
                    <div style="font-size:var(--font-size-2xl); font-weight:800; color:${
                      stats.pct >= 80 ? 'var(--success-text)' : stats.pct >= 50 ? 'var(--warning-text)' : 'var(--danger-text)'
                    };">${stats.pct}%</div>
                    <div style="font-size:var(--font-size-xs); color:var(--text-tertiary);">cumplimiento</div>
                  </div>
                `;
              })()}
            </div>

            ${selectedLogs.length === 0 ? `
              <div style="text-align:center; padding: var(--space-xl) 0; color: var(--text-tertiary);">
                <div style="font-size:32px; margin-bottom:var(--space-sm);">📭</div>
                <p style="font-size:var(--font-size-sm);">No hay registros para este día</p>
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:var(--space-sm);">
                ${selectedLogs.map(log => {
                  const med = medications[log.medication_id];
                  const color = med?.color || '#8b5cf6';
                  const statusIcon = log.status === 'taken' ? '✓' : log.status === 'skipped' ? '✕' : '○';
                  const statusColor = log.status === 'taken' ? 'var(--success-text)' : log.status === 'skipped' ? 'var(--danger-text)' : 'var(--warning-text)';
                  const statusLabel = log.status === 'taken' ? 'Tomado' : log.status === 'skipped' ? 'Omitido' : 'Pendiente';

                  return `
                    <div style="display:flex; align-items:center; gap:var(--space-md); padding:var(--space-sm) 0; border-bottom: 1px solid var(--border-color);">
                      <span style="
                        width: 32px; height: 32px; border-radius: 50%;
                        display:grid; place-items:center; font-size:14px; font-weight:700;
                        background: ${log.status === 'taken' ? 'var(--success-soft)' : log.status === 'skipped' ? 'var(--danger-soft)' : 'var(--warning-soft)'};
                        color: ${statusColor};
                      ">${statusIcon}</span>
                      <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; display:flex; align-items:center; gap:var(--space-xs);">
                          <span style="width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
                          ${med?.name || 'Desconocido'}
                        </div>
                        <div style="font-size:var(--font-size-xs); color:var(--text-tertiary);">
                          ${formatTime12(log.scheduled_time)}
                          ${log.taken_at ? ` · Tomado a las ${new Date(log.taken_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                      </div>
                      <span class="badge badge--${log.status === 'taken' ? 'success' : log.status === 'skipped' ? 'danger' : 'warning'}">${statusLabel}</span>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Summary -->
              <div style="display:flex; gap:var(--space-md); margin-top:var(--space-md); padding-top:var(--space-md); border-top:1px solid var(--border-color);">
                ${(() => {
                  const stats = getDateStats(currentDate);
                  return `
                    <div style="flex:1; text-align:center;">
                      <div style="font-size:var(--font-size-xl); font-weight:700; color:var(--success-text);">${stats.taken}</div>
                      <div style="font-size:var(--font-size-xs); color:var(--text-tertiary);">Tomados</div>
                    </div>
                    <div style="flex:1; text-align:center;">
                      <div style="font-size:var(--font-size-xl); font-weight:700; color:var(--warning-text);">${stats.pending}</div>
                      <div style="font-size:var(--font-size-xs); color:var(--text-tertiary);">Pendientes</div>
                    </div>
                    <div style="flex:1; text-align:center;">
                      <div style="font-size:var(--font-size-xl); font-weight:700; color:var(--danger-text);">${stats.skipped}</div>
                      <div style="font-size:var(--font-size-xs); color:var(--text-tertiary);">Omitidos</div>
                    </div>
                  `;
                })()}
              </div>
            `}
          </div>
        `}
      </div>
      ${renderNavbar()}
    `;

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('prev-week')?.addEventListener('click', () => {
      currentDate = addDays(currentDate, -7);
      loadData();
    });

    document.getElementById('next-week')?.addEventListener('click', () => {
      currentDate = addDays(currentDate, 7);
      loadData();
    });

    container.querySelectorAll('.week-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentDate = btn.dataset.date;
        render();
      });
    });
  }

  await loadData();
}
