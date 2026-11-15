/**
 * FitMaster AI – Interactive Progress Analytics Controller
 * Renders client-side Chart.js interactive charts (Macronutrients, Weight Trajectory, Hydration)
 * and manages interactive weigh-in logging and history.
 * Backend API is the primary store; localStorage is offline cache only.
 */

// Use local date to prevent UTC timezone shift
function getLocalDateStr(d) {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function getDateDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalDateStr(d);
}

let activeTab = 'macros';
let activeChartInstance = null;
let weighInsData = [];
let weeklyNutritionData = [];
let weeklyWaterData = [];
let targetGoals = { calories: 2000, protein: 140, carbs: 220, fat: 60, water: 2500 };

document.addEventListener('DOMContentLoaded', async () => {
  // Set default measurement date to today
  const dateInput = document.getElementById('weight-date');
  if (dateInput) {
    dateInput.value = getLocalDateStr();
  }

  await loadTargetGoals();
  await loadAnalyticsData();
});

async function loadTargetGoals() {
  // Quick cache read first
  const saved = localStorage.getItem('fitmaster_profile');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.goals) {
        if (p.goals.daily_calories) targetGoals.calories = p.goals.daily_calories;
        if (p.goals.protein_g) targetGoals.protein = p.goals.protein_g;
        if (p.goals.carbs_g) targetGoals.carbs = p.goals.carbs_g;
        if (p.goals.fat_g) targetGoals.fat = p.goals.fat_g;
        if (p.goals.water_ml) targetGoals.water = p.goals.water_ml;
      }
    } catch (e) {
      console.warn('Target goals parse:', e);
    }
  }

  // Authoritative source: backend
  try {
    const res = await api.get('/users/profile');
    if (res?.data?.goal) {
      const g = res.data.goal;
      if (g.daily_calories) targetGoals.calories = g.daily_calories;
      if (g.protein_g) targetGoals.protein = g.protein_g;
      if (g.carbs_g) targetGoals.carbs = g.carbs_g;
      if (g.fat_g) targetGoals.fat = g.fat_g;
      if (g.water_ml) targetGoals.water = g.water_ml;
      // Update cache
      const cache = JSON.parse(localStorage.getItem('fitmaster_profile') || '{}');
      cache.goals = { daily_calories: g.daily_calories, protein_g: g.protein_g, carbs_g: g.carbs_g, fat_g: g.fat_g, water_ml: g.water_ml };
      localStorage.setItem('fitmaster_profile', JSON.stringify(cache));
    }
  } catch (e) {
    console.warn('Could not load goals from backend:', e);
  }

  const kpiCal = document.getElementById('kpi-target-calories');
  const kpiP = document.getElementById('kpi-target-protein');
  if (kpiCal) kpiCal.textContent = targetGoals.calories;
  if (kpiP) kpiP.textContent = targetGoals.protein;
}

/**
 * Switch tabs interactively
 */
window.switchAnalyticsTab = function(tabName) {
  activeTab = tabName;

  document.querySelectorAll('.analytics-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.chart === tabName);
  });

  renderActiveChart();
};

/**
 * Fetch data from backend as primary source
 */
async function loadAnalyticsData() {
  // 1. Load weigh-ins from backend
  try {
    const res = await api.get('/progress/weight');
    // Backend returns array; normalize field names (recorded_date vs date)
    weighInsData = (res?.data || []).map(w => ({
      id: w.weight_id,
      date: w.recorded_date || w.date,
      weight_kg: w.weight_kg,
      notes: w.notes || ''
    }));
  } catch {
    // Offline fallback
    weighInsData = JSON.parse(localStorage.getItem('fitmaster_weigh_ins') || '[]');
  }

  // Do NOT generate fake data when empty — show proper empty state
  // weighInsData stays [] if the user has no entries yet

  // 2. Load weekly nutrition data from backend API
  await buildWeeklyNutritionData();

  // 3. Update KPI cards
  updateKPISummaries();

  // 4. Render weigh-in table
  renderWeighInTable();

  // 5. Render interactive chart
  renderActiveChart();
}

async function buildWeeklyNutritionData() {
  weeklyNutritionData = [];
  weeklyWaterData = [];

  try {
    // Use backend /progress/weekly endpoint (returns 7 days)
    const res = await api.get('/progress/weekly');
    const rows = res?.data || [];

    rows.forEach((row) => {
      const dayName = new Date(row.day_date + 'T12:00:00').toLocaleDateString([], { weekday: 'short' });
      weeklyNutritionData.push({
        date: row.day_date,
        day: dayName,
        calories: row.calories || 0,
        protein: row.protein || 0,
        carbs: row.carbs || 0,
        fat: row.fat || 0
      });
      weeklyWaterData.push({
        date: row.day_date,
        day: dayName,
        consumed: row.water || 0,
        target: targetGoals.water
      });
    });
  } catch (e) {
    console.warn('Weekly data fetch failed, building from localStorage:', e);
    // Offline fallback: read localStorage but DO NOT generate fake mock data
    for (let i = 6; i >= 0; i--) {
      const dateStr = getDateDaysAgo(i);
      const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString([], { weekday: 'short' });

      const meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${dateStr}`) || '[]');
      let dayCal = 0, dayP = 0, dayC = 0, dayF = 0;

      meals.forEach((m) => {
        (m.items || []).forEach((item) => {
          dayCal += Number(item.calories || 0);
          dayP += Number(item.protein || 0);
          dayC += Number(item.carbs || 0);
          dayF += Number(item.fat || 0);
        });
      });

      const waterConsumed = Number(localStorage.getItem(`fitmaster_water_${dateStr}`) || 0);

      weeklyNutritionData.push({ date: dateStr, day: dayName, calories: dayCal, protein: dayP, carbs: dayC, fat: dayF });
      weeklyWaterData.push({ date: dateStr, day: dayName, consumed: waterConsumed, target: targetGoals.water });
    }
  }
}

function updateKPISummaries() {
  // Average calories & protein (from backend data)
  const validDays = weeklyNutritionData.filter((d) => d.calories > 0);
  const avgCal = validDays.length > 0 ? Math.round(validDays.reduce((s, d) => s + d.calories, 0) / validDays.length) : 0;
  const avgP = validDays.length > 0 ? Math.round(validDays.reduce((s, d) => s + d.protein, 0) / validDays.length) : 0;

  const kpiCal = document.getElementById('kpi-avg-calories');
  const kpiP = document.getElementById('kpi-avg-protein');
  if (kpiCal) kpiCal.textContent = avgCal > 0 ? `${avgCal} kcal` : '— kcal';
  if (kpiP) kpiP.textContent = avgP > 0 ? `${avgP} g` : '— g';

  // Weight
  const kpiWeight = document.getElementById('kpi-current-weight');
  const kpiWeightChange = document.getElementById('kpi-weight-change');
  if (weighInsData.length > 0) {
    const sorted = [...weighInsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = sorted[sorted.length - 1];
    const first = sorted[0];
    const diff = (latest.weight_kg - first.weight_kg).toFixed(1);

    if (kpiWeight) kpiWeight.textContent = `${latest.weight_kg} kg`;
    if (kpiWeightChange) {
      const sign = diff > 0 ? '+' : '';
      kpiWeightChange.textContent = `${sign}${diff} kg from starting log`;
      kpiWeightChange.style.color = diff < 0 ? '#10b981' : (diff > 0 ? '#60a5fa' : 'var(--text-muted)');
    }
  } else {
    if (kpiWeight) kpiWeight.textContent = '— kg';
    if (kpiWeightChange) kpiWeightChange.textContent = 'No weigh-ins logged yet';
  }

  // Hydration rate
  const totalWaterDays = weeklyWaterData.length;
  const fulfilledDays = weeklyWaterData.filter((d) => d.consumed > 0 && d.consumed >= d.target).length;
  const rate = totalWaterDays > 0 ? Math.round((fulfilledDays / totalWaterDays) * 100) : 0;
  const kpiHydration = document.getElementById('kpi-hydration-rate');
  if (kpiHydration) kpiHydration.textContent = `${rate}%`;
}

/**
 * Render Chart.js interactive charts
 */
function renderActiveChart() {
  const canvas = document.getElementById('interactiveChartCanvas');
  if (!canvas) return;

  if (activeChartInstance) {
    activeChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');

  if (activeTab === 'macros') {
    const labels = weeklyNutritionData.map((d) => `${d.day} (${d.date.slice(5)})`);
    const calories = weeklyNutritionData.map((d) => d.calories);
    const protein = weeklyNutritionData.map((d) => d.protein);
    const carbs = weeklyNutritionData.map((d) => d.carbs);
    const fat = weeklyNutritionData.map((d) => d.fat);

    activeChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Calories (kcal)', data: calories, backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 6, yAxisID: 'y' },
          { label: 'Protein (g)', data: protein, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: '#3b82f6', borderWidth: 1.5, borderRadius: 6, yAxisID: 'y1' },
          { label: 'Carbs (g)', data: carbs, backgroundColor: 'rgba(245, 158, 11, 0.7)', borderColor: '#f59e0b', borderWidth: 1.5, borderRadius: 6, yAxisID: 'y1' },
          { label: 'Fats (g)', data: fat, backgroundColor: 'rgba(244, 63, 94, 0.7)', borderColor: '#f43f5e', borderWidth: 1.5, borderRadius: 6, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12 } } },
          tooltip: { backgroundColor: '#0d1424', titleColor: '#ffffff', bodyColor: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1 }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.04)' } },
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Calories (kcal)', color: '#10b981' }, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.04)' } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Macronutrients (g)', color: '#60a5fa' }, ticks: { color: '#94a3b8' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  } else if (activeTab === 'weight') {
    const sorted = [...weighInsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sorted.map((d) => d.date);
    const weights = sorted.map((d) => d.weight_kg);

    if (sorted.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('No weight data yet. Log your first weigh-in below!', canvas.width / 2, canvas.height / 2);
      return;
    }

    activeChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Bodyweight (kg)',
          data: weights,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12 } } },
          tooltip: {
            backgroundColor: '#0d1424', titleColor: '#ffffff', bodyColor: '#cbd5e1',
            borderColor: 'rgba(16, 185, 129, 0.4)', borderWidth: 1,
            callbacks: { label: (context) => `Weight: ${context.parsed.y} kg` }
          }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.04)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.04)' }, title: { display: true, text: 'Weight (kg)', color: '#10b981' } }
        }
      }
    });
  } else if (activeTab === 'water') {
    const labels = weeklyWaterData.map((d) => `${d.day} (${d.date.slice(5)})`);
    const consumed = weeklyWaterData.map((d) => d.consumed);
    const targets = weeklyWaterData.map((d) => d.target);

    activeChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Water Intake (ml)', data: consumed, backgroundColor: 'rgba(6, 182, 212, 0.75)', borderColor: '#06b6d4', borderWidth: 1.5, borderRadius: 6 },
          { type: 'line', label: 'Daily Target (ml)', data: targets, borderColor: '#3b82f6', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1', font: { family: 'Inter', size: 12 } } },
          tooltip: { backgroundColor: '#0d1424', titleColor: '#ffffff', bodyColor: '#cbd5e1', borderColor: 'rgba(6, 182, 212, 0.4)', borderWidth: 1 }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.04)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.04)' }, title: { display: true, text: 'Volume (ml)', color: '#06b6d4' } }
        }
      }
    });
  }
}

/**
 * Render historical weight table
 */
function renderWeighInTable() {
  const tbody = document.getElementById('weight-history-tbody');
  const countLabel = document.getElementById('weight-count-label');
  if (!tbody) return;

  if (countLabel) countLabel.textContent = `${weighInsData.length} entries`;

  if (weighInsData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No weigh-ins logged yet. Use the form below to record your first entry!</td></tr>`;
    return;
  }

  // Sort latest first
  const sorted = [...weighInsData].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = sorted.map((entry, idx) => {
    const nextEntry = sorted[idx + 1]; // older entry
    let deltaStr = '--';
    let deltaColor = 'var(--text-muted)';

    if (nextEntry) {
      const diff = (entry.weight_kg - nextEntry.weight_kg).toFixed(1);
      if (diff > 0) {
        deltaStr = `+${diff} kg`;
        deltaColor = '#60a5fa';
      } else if (diff < 0) {
        deltaStr = `${diff} kg`;
        deltaColor = '#10b981';
      } else {
        deltaStr = '0.0 kg';
      }
    }

    return `
      <tr>
        <td style="font-weight: 600; color: #ffffff;">${entry.date}</td>
        <td style="font-family: var(--font-heading); font-weight: 700; color: var(--primary-light);">${entry.weight_kg} kg</td>
        <td style="font-weight: 600; color: ${deltaColor};">${deltaStr}</td>
        <td style="color: var(--text-muted); font-size: 13px;">${entry.notes || '—'}</td>
        <td>
          <button onclick="deleteWeighIn(${entry.id})" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 6px; padding: 3px 8px; font-size: 12px; cursor: pointer;" title="Delete record">✕</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Handle new weigh-in submission — backend is primary
 */
window.handleWeightSubmit = async function(e) {
  e.preventDefault();

  const date = document.getElementById('weight-date').value;
  const weight = parseFloat(document.getElementById('weight-kg').value);
  const notes = document.getElementById('weight-notes').value.trim();

  if (!date || isNaN(weight)) {
    showToast('Invalid Data', 'Please enter a valid date and bodyweight.', 'warning');
    return;
  }

  try {
    // Backend is primary — saves to weight_history table
    const res = await api.post('/progress/weight', { recorded_date: date, weight_kg: weight, notes });
    // Reload from backend to get real IDs
    const histRes = await api.get('/progress/weight');
    weighInsData = (histRes?.data || []).map(w => ({
      id: w.weight_id,
      date: w.recorded_date || w.date,
      weight_kg: w.weight_kg,
      notes: w.notes || ''
    }));
    showToast('Weigh-In Saved', `${weight} kg recorded for ${date}!`, 'success');
  } catch (err) {
    console.warn('Backend weight log failed, saving locally:', err);
    // Offline fallback
    const newEntry = { id: Date.now(), date, weight_kg: weight, notes };
    weighInsData.push(newEntry);
    localStorage.setItem('fitmaster_weigh_ins', JSON.stringify(weighInsData));
    showToast('Weigh-In Saved (Offline)', `${weight} kg saved locally.`, 'info');
  }

  document.getElementById('weight-notes').value = '';
  updateKPISummaries();
  renderWeighInTable();
  renderActiveChart();
};

/**
 * Delete weigh-in — backend is primary
 */
window.deleteWeighIn = async function(id) {
  try {
    await api.delete(`/progress/weight/${id}`);
    // Reload from backend
    const histRes = await api.get('/progress/weight');
    weighInsData = (histRes?.data || []).map(w => ({
      id: w.weight_id,
      date: w.recorded_date || w.date,
      weight_kg: w.weight_kg,
      notes: w.notes || ''
    }));
  } catch (err) {
    console.warn('Backend weight delete failed, removing locally:', err);
    weighInsData = weighInsData.filter((w) => w.id !== id);
    localStorage.setItem('fitmaster_weigh_ins', JSON.stringify(weighInsData));
  }

  showToast('Record Removed', 'Weigh-in entry removed.', 'info');
  updateKPISummaries();
  renderWeighInTable();
  renderActiveChart();
};

window.loadAnalyticsData = loadAnalyticsData;
