/**
 * FitMaster AI – Interactive Hydration Tracker Client Script
 * Manages water intake logging, dynamic circular wave gauge, interactive goal adjustments,
 * and date-based ledger with localStorage & backend API synchronization.
 */

let waterDate = new Date().toISOString().split('T')[0];
let targetWaterMl = 2500;

document.addEventListener('DOMContentLoaded', async () => {
  loadTargetFromStorage();

  const dateInput = document.getElementById('water-date-picker');
  if (dateInput) {
    dateInput.value = waterDate;
    dateInput.addEventListener('change', (e) => {
      waterDate = e.target.value;
      loadWaterData();
    });
  }

  document.getElementById('water-prev-day-btn')?.addEventListener('click', () => changeWaterDate(-1));
  document.getElementById('water-next-day-btn')?.addEventListener('click', () => changeWaterDate(1));

  // Quick preset buttons (+150ml, +250ml, +500ml, +750ml)
  document.querySelectorAll('.quick-water-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const ml = parseInt(e.currentTarget.dataset.ml, 10);
      animateButton(e.currentTarget);
      await logWaterAmount(ml);
    });
  });

  // Goal slider adjuster
  const goalSlider = document.getElementById('water-goal-slider');
  const goalValDisplay = document.getElementById('water-target-slider-val');
  if (goalSlider) {
    goalSlider.value = targetWaterMl;
    if (goalValDisplay) goalValDisplay.textContent = `${targetWaterMl} ml`;

    goalSlider.addEventListener('input', (e) => {
      targetWaterMl = parseInt(e.target.value, 10);
      if (goalValDisplay) goalValDisplay.textContent = `${targetWaterMl} ml`;

      // Save to profile
      saveTargetToStorage(targetWaterMl);
      loadWaterData();
    });
  }

  // Custom water form
  const customForm = document.getElementById('custom-water-form');
  if (customForm) {
    customForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('custom-water-input');
      const ml = parseInt(input.value, 10);
      if (ml > 0) {
        await logWaterAmount(ml);
        input.value = '';
      }
    });
  }

  await loadWaterData();
});

function loadTargetFromStorage() {
  const savedProfile = localStorage.getItem('fitmaster_profile');
  if (savedProfile) {
    try {
      const p = JSON.parse(savedProfile);
      if (p.goals?.water_ml) {
        targetWaterMl = p.goals.water_ml;
      }
    } catch (e) {
      console.warn('Water target parse:', e);
    }
  }
}

function saveTargetToStorage(val) {
  let p = {};
  try {
    p = JSON.parse(localStorage.getItem('fitmaster_profile') || '{}');
  } catch {}
  if (!p.goals) p.goals = {};
  p.goals.water_ml = val;
  localStorage.setItem('fitmaster_profile', JSON.stringify(p));
}

function animateButton(btn) {
  btn.style.transform = 'scale(0.92)';
  setTimeout(() => {
    btn.style.transform = '';
  }, 180);
}

function changeWaterDate(daysOffset) {
  const d = new Date(waterDate);
  d.setDate(d.getDate() + daysOffset);
  waterDate = d.toISOString().split('T')[0];
  const dateInput = document.getElementById('water-date-picker');
  if (dateInput) dateInput.value = waterDate;
  loadWaterData();
}

/**
 * Load hydration data for selected date
 */
async function loadWaterData() {
  let waterData = null;

  try {
    const res = await api.get(`/water?date=${waterDate}`);
    if (res?.data) {
      waterData = res.data;
      if (waterData.target_ml) targetWaterMl = waterData.target_ml;
    }
  } catch {
    // LocalStorage fallback
    const consumed = Number(localStorage.getItem(`fitmaster_water_${waterDate}`) || 0);
    const logs = JSON.parse(localStorage.getItem(`fitmaster_water_history_${waterDate}`) || '[]');
    const percentage = targetWaterMl > 0 ? Math.round((consumed / targetWaterMl) * 100) : 0;
    const remaining = Math.max(0, targetWaterMl - consumed);

    waterData = {
      target_ml: targetWaterMl,
      consumed_ml: consumed,
      remaining_ml: remaining,
      percentage,
      logs,
      date: waterDate
    };
  }

  if (waterData) {
    renderWaterUI(waterData);
  }
}

/**
 * Render circular gauge, stats, and ledger
 */
function renderWaterUI(data) {
  const { target_ml = targetWaterMl, consumed_ml = 0, remaining_ml = 0, percentage = 0, logs = [], date = waterDate } = data;

  const boundedPercent = Math.min(100, Math.round(percentage));

  // Update Badge & Header
  const goalBadge = document.getElementById('water-goal-badge');
  if (goalBadge) goalBadge.textContent = `Daily Goal: ${Math.round(target_ml)} ml ⚙️`;

  const milestoneBadge = document.getElementById('water-milestone-badge');
  if (milestoneBadge) {
    if (percentage >= 100) {
      milestoneBadge.style.display = 'inline-block';
      milestoneBadge.textContent = percentage >= 150 ? 'Extra Hydrated! 🌊' : 'Goal Achieved! 🎉';
    } else {
      milestoneBadge.style.display = 'none';
    }
  }

  const ledgerDate = document.getElementById('ledger-date-text');
  if (ledgerDate) ledgerDate.textContent = `Logged entries for ${date}`;

  const ledgerCount = document.getElementById('ledger-entry-count');
  if (ledgerCount) ledgerCount.textContent = `${logs.length} ${logs.length === 1 ? 'log' : 'logs'}`;

  // Update Gauge
  const fillLevel = document.getElementById('water-fill-level');
  if (fillLevel) {
    fillLevel.style.height = `${boundedPercent}%`;
  }

  const percentVal = document.getElementById('water-percent-val');
  if (percentVal) percentVal.textContent = `${percentage}%`;

  const consumedLabel = document.getElementById('water-consumed-label');
  if (consumedLabel) consumedLabel.textContent = `${consumed_ml} / ${Math.round(target_ml)} ml`;

  // Update Stats Box
  const consumedNum = document.getElementById('water-consumed-num');
  if (consumedNum) consumedNum.textContent = `${consumed_ml} ml`;

  const remainingNum = document.getElementById('water-remaining-num');
  if (remainingNum) remainingNum.textContent = `${remaining_ml} ml`;

  // Render History Ledger
  const container = document.getElementById('water-history-container');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `<div class="empty-meal-placeholder">No water logged for ${date} yet. Click a preset button to begin!</div>`;
    return;
  }

  container.innerHTML = '';
  // Show most recent first
  const sortedLogs = [...logs].reverse();

  sortedLogs.forEach((log) => {
    const timeStr = log.logged_at ? new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged';
    const row = document.createElement('div');
    row.className = 'intake-row';
    row.innerHTML = `
      <div class="intake-meta">
        <span class="intake-icon">💧</span>
        <div>
          <div class="intake-amount">+${log.amount_ml} ml</div>
          <div class="intake-time">${timeStr}</div>
        </div>
      </div>
      <button class="delete-item-btn" title="Delete Entry" onclick="deleteWaterEntry(${log.water_id})" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 6px; padding: 4px 8px; font-size: 13px; cursor: pointer;">✕</button>
    `;
    container.appendChild(row);
  });
}

/**
 * Log fluid intake
 */
async function logWaterAmount(amountMl) {
  // Offline / local storage record
  const current = Number(localStorage.getItem(`fitmaster_water_${waterDate}`) || 0);
  const updated = current + amountMl;
  localStorage.setItem(`fitmaster_water_${waterDate}`, updated);

  const history = JSON.parse(localStorage.getItem(`fitmaster_water_history_${waterDate}`) || '[]');
  const newLog = {
    water_id: Date.now(),
    amount_ml: amountMl,
    logged_at: new Date().toISOString()
  };
  history.push(newLog);
  localStorage.setItem(`fitmaster_water_history_${waterDate}`, JSON.stringify(history));

  try {
    await api.post('/water', {
      amount_ml: amountMl,
      date: waterDate
    });
  } catch (e) {
    console.warn('API water log:', e);
  }

  showToast('Hydration Logged', `+${amountMl} ml of water recorded!`, 'success');
  await loadWaterData();
}

/**
 * Delete hydration log
 */
async function deleteWaterEntry(waterId) {
  // Update local storage
  let history = JSON.parse(localStorage.getItem(`fitmaster_water_history_${waterDate}`) || '[]');
  const itemToDelete = history.find((h) => h.water_id == waterId);
  const amountToSubtract = itemToDelete ? itemToDelete.amount_ml : 0;

  history = history.filter((h) => h.water_id != waterId);
  localStorage.setItem(`fitmaster_water_history_${waterDate}`, JSON.stringify(history));

  const current = Number(localStorage.getItem(`fitmaster_water_${waterDate}`) || 0);
  const updated = Math.max(0, current - amountToSubtract);
  localStorage.setItem(`fitmaster_water_${waterDate}`, updated);

  try {
    await api.delete(`/water/${waterId}`);
  } catch (e) {
    console.warn('API delete water:', e);
  }

  showToast('Entry Removed', 'Hydration entry deleted.', 'info');
  await loadWaterData();
}

window.deleteWaterEntry = deleteWaterEntry;
window.logWaterAmount = logWaterAmount;
