/**
 * FitMaster AI – Dashboard Controller
 * Synchronizes daily energy, hydration status, macronutrients, and today's meals.
 */

let selectedDate = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
  const datePicker = document.getElementById('dash-date-picker');
  if (datePicker) {
    datePicker.value = selectedDate;
    datePicker.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      loadDashboardData();
    });
  }

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobile-toggle-btn');
  const sidebar = document.getElementById('app-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('fitmaster_user') || '{}');
    if (user && user.name && document.getElementById('dash-user-name')) {
      document.getElementById('dash-user-name').textContent = user.name;
    }

    // Load user targets
    let targetCalories = 2000;
    let targetMacros = { protein: 140, carbs: 220, fat: 60 };
    let targetWater = 2500;

    const savedProfile = localStorage.getItem('fitmaster_profile');
    if (savedProfile) {
      try {
        const p = JSON.parse(savedProfile);
        if (p.goals?.daily_calories) targetCalories = p.goals.daily_calories;
        if (p.goals?.protein_g) targetMacros.protein = p.goals.protein_g;
        if (p.goals?.carbs_g) targetMacros.carbs = p.goals.carbs_g;
        if (p.goals?.fat_g) targetMacros.fat = p.goals.fat_g;
        if (p.goals?.water_ml) targetWater = p.goals.water_ml;
      } catch (e) {
        console.warn('Profile parse error:', e);
      }
    }

    // Try backend API for daily progress
    let dailyData = null;
    try {
      const progressRes = await api.get(`/progress/daily?date=${selectedDate}`);
      dailyData = progressRes?.data;
    } catch {
      // Fallback from localStorage
      dailyData = getLocalDailyData(selectedDate, targetCalories, targetWater, targetMacros);
    }

    if (dailyData) {
      populateDailyMetrics(dailyData, targetCalories, targetWater, targetMacros);
    }

    // Load today's meals
    loadMealsForDate(selectedDate);
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  }
}

function getLocalDailyData(date, targetCal, targetWater, targetMacros) {
  const localMeals = JSON.parse(localStorage.getItem(`fitmaster_meals_${date}`) || '[]');
  let consumedCal = 0;
  let consumedP = 0;
  let consumedC = 0;
  let consumedF = 0;

  localMeals.forEach((meal) => {
    (meal.items || []).forEach((item) => {
      consumedCal += Number(item.calories || 0);
      consumedP += Number(item.protein || 0);
      consumedC += Number(item.carbs || 0);
      consumedF += Number(item.fat || 0);
    });
  });

  const localWater = Number(localStorage.getItem(`fitmaster_water_${date}`) || 0);

  return {
    calories: {
      consumed: consumedCal,
      target: targetCal,
      remaining: Math.max(0, targetCal - consumedCal),
      percentage: Math.min(100, Math.round((consumedCal / targetCal) * 100))
    },
    water: {
      consumed: localWater,
      target: targetWater,
      remaining: Math.max(0, targetWater - localWater),
      percentage: Math.min(100, Math.round((localWater / targetWater) * 100))
    },
    macros: {
      protein: { consumed: consumedP, target: targetMacros.protein, percentage: Math.min(100, Math.round((consumedP / targetMacros.protein) * 100)) },
      carbs: { consumed: consumedC, target: targetMacros.carbs, percentage: Math.min(100, Math.round((consumedC / targetMacros.carbs) * 100)) },
      fat: { consumed: consumedF, target: targetMacros.fat, percentage: Math.min(100, Math.round((consumedF / targetMacros.fat) * 100)) }
    }
  };
}

function populateDailyMetrics(progress, targetCalDefault = 2000, targetWaterDefault = 2500, targetMacrosDefault = { protein: 140, carbs: 220, fat: 60 }) {
  const cals = progress.calories || { consumed: 0, target: targetCalDefault, remaining: targetCalDefault, percentage: 0 };
  const water = progress.water || { consumed: 0, target: targetWaterDefault, remaining: targetWaterDefault, percentage: 0 };
  const macros = progress.macros || {};

  // Calorie card
  const cCon = document.getElementById('card-cal-consumed');
  const cTar = document.getElementById('card-cal-target');
  const cRem = document.getElementById('card-cal-remaining');
  const calBar = document.getElementById('card-cal-bar');

  if (cCon) cCon.textContent = Math.round(cals.consumed || 0);
  if (cTar) cTar.textContent = Math.round(cals.target || targetCalDefault);
  if (cRem) cRem.textContent = `${Math.round(cals.remaining || 0)} kcal`;
  if (calBar) {
    const pct = Math.min(100, Math.round(cals.percentage || 0));
    calBar.style.width = `${pct}%`;
    if (pct > 100) calBar.style.background = '#f43f5e';
    else calBar.style.background = 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  }

  // Water card
  const wCon = document.getElementById('card-water-consumed');
  const wTar = document.getElementById('card-water-target');
  const wPct = document.getElementById('card-water-pct');
  const wBar = document.getElementById('card-water-bar');

  if (wCon) wCon.textContent = Math.round(water.consumed || 0);
  if (wTar) wTar.textContent = Math.round(water.target || targetWaterDefault);
  if (wPct) wPct.textContent = `${Math.round(water.percentage || 0)}%`;
  if (wBar) wBar.style.width = `${Math.min(100, Math.round(water.percentage || 0))}%`;

  // Macros
  const p = macros.protein || { consumed: 0, target: targetMacrosDefault.protein, percentage: 0 };
  const c = macros.carbs || { consumed: 0, target: targetMacrosDefault.carbs, percentage: 0 };
  const f = macros.fat || { consumed: 0, target: targetMacrosDefault.fat, percentage: 0 };

  const pCon = document.getElementById('p-con');
  const pTar = document.getElementById('p-tar');
  const pBar = document.getElementById('p-bar');
  const pPct = document.getElementById('p-pct');

  if (pCon) pCon.textContent = Math.round(p.consumed || 0);
  if (pTar) pTar.textContent = Math.round(p.target || targetMacrosDefault.protein);
  if (pBar) pBar.style.width = `${Math.min(100, Math.round(p.percentage || 0))}%`;
  if (pPct) pPct.textContent = `${Math.round(p.percentage || 0)}% fulfilled (${Math.max(0, Math.round((p.target || targetMacrosDefault.protein) - (p.consumed || 0)))}g remaining)`;

  const cConEl = document.getElementById('c-con');
  const cTarEl = document.getElementById('c-tar');
  const cBar = document.getElementById('c-bar');
  const cPct = document.getElementById('c-pct');

  if (cConEl) cConEl.textContent = Math.round(c.consumed || 0);
  if (cTarEl) cTarEl.textContent = Math.round(c.target || targetMacrosDefault.carbs);
  if (cBar) cBar.style.width = `${Math.min(100, Math.round(c.percentage || 0))}%`;
  if (cPct) cPct.textContent = `${Math.round(c.percentage || 0)}% fulfilled (${Math.max(0, Math.round((c.target || targetMacrosDefault.carbs) - (c.consumed || 0)))}g remaining)`;

  const fConEl = document.getElementById('f-con');
  const fTarEl = document.getElementById('f-tar');
  const fBar = document.getElementById('f-bar');
  const fPct = document.getElementById('f-pct');

  if (fConEl) fConEl.textContent = Math.round(f.consumed || 0);
  if (fTarEl) fTarEl.textContent = Math.round(f.target || targetMacrosDefault.fat);
  if (fBar) fBar.style.width = `${Math.min(100, Math.round(f.percentage || 0))}%`;
  if (fPct) fPct.textContent = `${Math.round(f.percentage || 0)}% fulfilled (${Math.max(0, Math.round((f.target || targetMacrosDefault.fat) - (f.consumed || 0)))}g remaining)`;
}

async function loadMealsForDate(date) {
  const container = document.getElementById('meals-list-container');
  if (!container) return;

  let meals = [];
  try {
    const res = await api.get(`/meals?date=${date}`);
    meals = res?.data?.meals || [];
  } catch {
    meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${date}`) || '[]');
  }

  if (!meals || meals.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
        <div style="font-size: 36px; margin-bottom: 12px;">🍽️</div>
        <div style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">No meals logged for this date yet</div>
        <p style="font-size: 13px; color: var(--text-dim); max-width: 380px; margin: 0 auto 16px;">
          Track your breakfast, lunch, dinner, and snacks with accurate calorie and macro breakdown.
        </p>
        <a href="food-tracker.html" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;">
          <span>+</span> Log Your First Meal
        </a>
      </div>
    `;
    return;
  }

  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snacks: '🍎'
  };

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      ${meals.map((m) => {
        const items = m.items || [];
        const itemNames = items.map(i => `${i.food_name || i.name} (${i.quantity_grams || 100}g)`).join(', ') || 'No food items';
        return `
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--bg-card-border); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 20px;">${mealTypeIcons[m.meal_type] || '🍲'}</span>
                  <span style="font-weight: 700; text-transform: capitalize; color: #ffffff; font-size: 15px;">
                    ${m.meal_type}
                  </span>
                </div>
                <span style="font-family: var(--font-heading); font-weight: 800; font-size: 15px; color: var(--primary-light);">
                  ${Math.round(m.total_calories || 0)} kcal
                </span>
              </div>
              <div style="font-size: 12px; color: var(--text-dim); line-height: 1.4; margin-bottom: 12px; max-height: 48px; overflow: hidden; text-overflow: ellipsis;">
                ${itemNames}
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: var(--text-muted);">
              <span>🍗 ${Math.round(m.total_protein || 0)}g</span>
              <span>🌾 ${Math.round(m.total_carbs || 0)}g</span>
              <span>🥑 ${Math.round(m.total_fat || 0)}g</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function quickLogWater(amountMl) {
  try {
    await api.post('/water', {
      amount_ml: amountMl,
      date: selectedDate
    });
    showToast('Hydration Logged', `+${amountMl} ml recorded!`, 'success');
  } catch {
    // Offline / local fallback
    const current = Number(localStorage.getItem(`fitmaster_water_${selectedDate}`) || 0);
    const updated = current + amountMl;
    localStorage.setItem(`fitmaster_water_${selectedDate}`, updated);

    // Save history log
    const history = JSON.parse(localStorage.getItem(`fitmaster_water_history_${selectedDate}`) || '[]');
    history.push({
      water_id: Date.now(),
      amount_ml: amountMl,
      logged_at: new Date().toISOString()
    });
    localStorage.setItem(`fitmaster_water_history_${selectedDate}`, JSON.stringify(history));

    showToast('Hydration Logged', `+${amountMl} ml recorded locally!`, 'success');
  }

  loadDashboardData();
}

window.quickLogWater = quickLogWater;
