/**
 * FitMaster AI – Interactive Food & Nutrition Tracker Client Logic
 * Provides instant verified database search, live gram scaling, quick custom food logging,
 * real-time macro meter updates, and seamless offline/localStorage & backend sync.
 */

let currentDate = new Date().toISOString().split('T')[0];
let activeMealType = 'breakfast';
let selectedFood = null;
let userGoals = { daily_calories: 2000, protein_g: 140, carbs_g: 220, fat_g: 60 };
let activeCategory = '';

// Built-in verified nutrient databank (per 100g) for 0ms instant interactive search
const BUILTIN_FOODS = [
  { food_id: 101, food_name: "Rolled Oats", category: "Grains & Cereals", calories_per_100g: 389, protein_per_100g: 16.9, carbs_per_100g: 66.3, fat_per_100g: 6.9, fibre_per_100g: 10.6, source: "USDA" },
  { food_id: 102, food_name: "Brown Rice (Cooked)", category: "Grains & Cereals", calories_per_100g: 123, protein_per_100g: 2.7, carbs_per_100g: 25.6, fat_per_100g: 1.0, fibre_per_100g: 1.6, source: "USDA" },
  { food_id: 103, food_name: "White Basmati Rice (Cooked)", category: "Grains & Cereals", calories_per_100g: 130, protein_per_100g: 2.4, carbs_per_100g: 28.2, fat_per_100g: 0.3, fibre_per_100g: 0.4, source: "Indian Databank" },
  { food_id: 104, food_name: "Whole Wheat Roti / Chapati", category: "Grains & Cereals", calories_per_100g: 297, protein_per_100g: 9.6, carbs_per_100g: 58.4, fat_per_100g: 3.7, fibre_per_100g: 9.8, source: "Indian Databank" },
  { food_id: 105, food_name: "Whole Wheat Bread", category: "Grains & Cereals", calories_per_100g: 247, protein_per_100g: 13.0, carbs_per_100g: 41.3, fat_per_100g: 3.4, fibre_per_100g: 7.0, source: "USDA" },
  { food_id: 106, food_name: "Yellow Moong Dal (Cooked)", category: "Legumes & Pulses", calories_per_100g: 105, protein_per_100g: 7.0, carbs_per_100g: 19.1, fat_per_100g: 0.4, fibre_per_100g: 5.2, source: "Indian Databank" },
  { food_id: 107, food_name: "Masoor Dal (Red Lentils, Cooked)", category: "Legumes & Pulses", calories_per_100g: 116, protein_per_100g: 9.0, carbs_per_100g: 20.1, fat_per_100g: 0.4, fibre_per_100g: 7.9, source: "Indian Databank" },
  { food_id: 108, food_name: "Boiled Chickpeas (Chana)", category: "Legumes & Pulses", calories_per_100g: 164, protein_per_100g: 8.9, carbs_per_100g: 27.4, fat_per_100g: 2.6, fibre_per_100g: 7.6, source: "Indian Databank" },
  { food_id: 109, food_name: "Rajma (Kidney Beans, Cooked)", category: "Legumes & Pulses", calories_per_100g: 127, protein_per_100g: 8.7, carbs_per_100g: 22.8, fat_per_100g: 0.5, fibre_per_100g: 6.4, source: "Indian Databank" },
  { food_id: 110, food_name: "Chicken Breast (Skinless, Grilled)", category: "Poultry & Meat", calories_per_100g: 165, protein_per_100g: 31.0, carbs_per_100g: 0.0, fat_per_100g: 3.6, fibre_per_100g: 0.0, source: "USDA" },
  { food_id: 111, food_name: "Whole Boiled Egg", category: "Poultry & Meat", calories_per_100g: 155, protein_per_100g: 12.6, carbs_per_100g: 1.1, fat_per_100g: 10.6, fibre_per_100g: 0.0, source: "USDA" },
  { food_id: 112, food_name: "Egg White (Boiled)", category: "Poultry & Meat", calories_per_100g: 52, protein_per_100g: 10.9, carbs_per_100g: 0.7, fat_per_100g: 0.2, fibre_per_100g: 0.0, source: "USDA" },
  { food_id: 113, food_name: "Paneer (Indian Cottage Cheese)", category: "Dairy & Alternatives", calories_per_100g: 296, protein_per_100g: 18.3, carbs_per_100g: 4.5, fat_per_100g: 22.0, fibre_per_100g: 0.0, source: "Indian Databank" },
  { food_id: 114, food_name: "Low-Fat Paneer", category: "Dairy & Alternatives", calories_per_100g: 173, protein_per_100g: 25.0, carbs_per_100g: 3.5, fat_per_100g: 6.0, fibre_per_100g: 0.0, source: "Indian Databank" },
  { food_id: 115, food_name: "Greek Yogurt (Plain, Non-fat)", category: "Dairy & Alternatives", calories_per_100g: 59, protein_per_100g: 10.0, carbs_per_100g: 3.6, fat_per_100g: 0.4, fibre_per_100g: 0.0, source: "USDA" },
  { food_id: 116, food_name: "Curd / Dahi (Whole Milk)", category: "Dairy & Alternatives", calories_per_100g: 61, protein_per_100g: 3.5, carbs_per_100g: 4.7, fat_per_100g: 3.3, fibre_per_100g: 0.0, source: "Indian Databank" },
  { food_id: 117, food_name: "Toned Milk (Cow's Milk)", category: "Dairy & Alternatives", calories_per_100g: 58, protein_per_100g: 3.2, carbs_per_100g: 4.8, fat_per_100g: 3.0, fibre_per_100g: 0.0, source: "Indian Databank" },
  { food_id: 118, food_name: "Whey Protein Isolate", category: "Dairy & Alternatives", calories_per_100g: 370, protein_per_100g: 88.0, carbs_per_100g: 2.0, fat_per_100g: 1.0, fibre_per_100g: 0.5, source: "USDA" },
  { food_id: 119, food_name: "Tofu (Firm)", category: "Dairy & Alternatives", calories_per_100g: 83, protein_per_100g: 10.0, carbs_per_100g: 1.2, fat_per_100g: 5.3, fibre_per_100g: 1.0, source: "USDA" },
  { food_id: 120, food_name: "Atlantic Salmon (Grilled)", category: "Fish & Seafood", calories_per_100g: 206, protein_per_100g: 22.1, carbs_per_100g: 0.0, fat_per_100g: 12.3, fibre_per_100g: 0.0, source: "USDA" },
  { food_id: 121, food_name: "Almonds (Raw)", category: "Nuts & Seeds", calories_per_100g: 579, protein_per_100g: 21.2, carbs_per_100g: 21.6, fat_per_100g: 49.9, fibre_per_100g: 12.5, source: "USDA" },
  { food_id: 122, food_name: "Walnuts", category: "Nuts & Seeds", calories_per_100g: 654, protein_per_100g: 15.2, carbs_per_100g: 13.7, fat_per_100g: 65.2, fibre_per_100g: 6.7, source: "USDA" },
  { food_id: 123, food_name: "Peanut Butter (Unsweetened)", category: "Nuts & Seeds", calories_per_100g: 588, protein_per_100g: 25.1, carbs_per_100g: 20.0, fat_per_100g: 50.4, fibre_per_100g: 6.0, source: "USDA" },
  { food_id: 124, food_name: "Chia Seeds", category: "Nuts & Seeds", calories_per_100g: 486, protein_per_100g: 16.5, carbs_per_100g: 42.1, fat_per_100g: 30.7, fibre_per_100g: 34.4, source: "USDA" },
  { food_id: 125, food_name: "Banana", category: "Fruits", calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 22.8, fat_per_100g: 0.3, fibre_per_100g: 2.6, source: "USDA" },
  { food_id: 126, food_name: "Apple (With Skin)", category: "Fruits", calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 13.8, fat_per_100g: 0.2, fibre_per_100g: 2.4, source: "USDA" },
  { food_id: 127, food_name: "Broccoli (Steamed)", category: "Vegetables", calories_per_100g: 35, protein_per_100g: 2.4, carbs_per_100g: 7.2, fat_per_100g: 0.4, fibre_per_100g: 3.3, source: "USDA" },
  { food_id: 128, food_name: "Spinach / Palak (Cooked)", category: "Vegetables", calories_per_100g: 23, protein_per_100g: 3.0, carbs_per_100g: 3.8, fat_per_100g: 0.3, fibre_per_100g: 2.4, source: "Indian Databank" },
  { food_id: 129, food_name: "Sweet Potato (Boiled)", category: "Vegetables", calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20.1, fat_per_100g: 0.1, fibre_per_100g: 3.0, source: "USDA" },
  { food_id: 130, food_name: "Extra Virgin Olive Oil", category: "Oils & Fats", calories_per_100g: 884, protein_per_100g: 0.0, carbs_per_100g: 0.0, fat_per_100g: 100.0, fibre_per_100g: 0.0, source: "USDA" }
];

document.addEventListener('DOMContentLoaded', async () => {
  const datePicker = document.getElementById('tracker-date-picker');
  if (datePicker) {
    datePicker.value = currentDate;
    datePicker.addEventListener('change', (e) => {
      currentDate = e.target.value;
      loadDailyTrackerData();
    });
  }

  document.getElementById('prev-day-btn')?.addEventListener('click', () => changeDate(-1));
  document.getElementById('next-day-btn')?.addEventListener('click', () => changeDate(1));

  setupModalListeners();
  loadUserGoalsFromStorage();
  await loadDailyTrackerData();
});

function changeDate(daysOffset) {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + daysOffset);
  currentDate = d.toISOString().split('T')[0];
  const picker = document.getElementById('tracker-date-picker');
  if (picker) picker.value = currentDate;
  loadDailyTrackerData();
}

function loadUserGoalsFromStorage() {
  const savedProfile = localStorage.getItem('fitmaster_profile');
  if (savedProfile) {
    try {
      const p = JSON.parse(savedProfile);
      if (p.goals) {
        userGoals = {
          daily_calories: p.goals.daily_calories || 2000,
          protein_g: p.goals.protein_g || 140,
          carbs_g: p.goals.carbs_g || 220,
          fat_g: p.goals.fat_g || 60
        };
      }
    } catch (e) {
      console.warn('Goals parse error:', e);
    }
  }
}

/**
 * Open food search modal for a specific meal
 */
window.openFoodSearchModal = function(mealType) {
  activeMealType = mealType;
  const modal = document.getElementById('food-search-modal');
  const title = document.getElementById('modal-meal-name');
  if (title) title.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  const searchInput = document.getElementById('food-search-input');
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => searchInput.focus(), 100);
  }

  // Reset category
  activeCategory = '';
  document.querySelectorAll('.category-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.cat === '');
  });

  selectedFood = null;
  const calcCard = document.getElementById('serving-calculator');
  if (calcCard) calcCard.style.display = 'none';

  const confirmBtn = document.getElementById('confirm-add-food-btn');
  if (confirmBtn) confirmBtn.disabled = true;

  if (modal) modal.classList.add('active');
  executeFoodSearch('');
};

window.closeModal = function() {
  const modal = document.getElementById('food-search-modal');
  if (modal) modal.classList.remove('active');
  selectedFood = null;
};

/**
 * Setup modal events
 */
function setupModalListeners() {
  const modal = document.getElementById('food-search-modal');
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const searchInput = document.getElementById('food-search-input');
  searchInput?.addEventListener('input', (e) => {
    executeFoodSearch(e.target.value.trim());
  });

  // Category filter chips
  document.querySelectorAll('.category-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.cat || '';
      executeFoodSearch(searchInput.value.trim());
    });
  });

  // Gram input
  const gramsInput = document.getElementById('serving-grams-input');
  gramsInput?.addEventListener('input', updateDynamicServingCalculation);

  // Preset chips
  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      if (gramsInput) {
        gramsInput.value = e.target.dataset.grams;
        updateDynamicServingCalculation();
      }
    });
  });

  // Confirm Add Food
  const confirmBtn = document.getElementById('confirm-add-food-btn');
  confirmBtn?.addEventListener('click', async () => {
    if (!selectedFood) return;
    const grams = parseFloat(gramsInput?.value) || 100;

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Adding...';

    const mult = grams / 100;
    const foodItem = {
      food_id: selectedFood.food_id,
      food_name: selectedFood.food_name,
      quantity_grams: grams,
      calories: Math.round(selectedFood.calories_per_100g * mult),
      protein: Number((selectedFood.protein_per_100g * mult).toFixed(1)),
      carbs: Number((selectedFood.carbs_per_100g * mult).toFixed(1)),
      fat: Number((selectedFood.fat_per_100g * mult).toFixed(1)),
      category: selectedFood.category
    };

    try {
      // Try backend
      await api.post('/meals', {
        meal_date: currentDate,
        meal_type: activeMealType,
        items: [{ food_id: selectedFood.food_id, quantity_grams: grams }]
      }).catch(() => null);
    } catch (e) {
      console.warn('API meal save:', e);
    }

    // Save to local meal storage
    saveFoodItemLocally(currentDate, activeMealType, foodItem);

    showToast('Food Added', `Added ${grams}g ${selectedFood.food_name} to ${activeMealType}!`, 'success');
    closeModal();
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = 'Add to Meal';
    await loadDailyTrackerData();
  });
}

function saveFoodItemLocally(date, mealType, foodItem) {
  let meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${date}`) || '[]');
  let meal = meals.find((m) => m.meal_type === mealType);

  if (!meal) {
    meal = {
      meal_id: Date.now(),
      meal_type: mealType,
      items: [],
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0
    };
    meals.push(meal);
  }

  foodItem.entry_id = Date.now() + Math.floor(Math.random() * 1000);
  meal.items.push(foodItem);

  // Recalculate totals
  meal.total_calories = meal.items.reduce((sum, i) => sum + (i.calories || 0), 0);
  meal.total_protein = meal.items.reduce((sum, i) => sum + (i.protein || 0), 0);
  meal.total_carbs = meal.items.reduce((sum, i) => sum + (i.carbs || 0), 0);
  meal.total_fat = meal.items.reduce((sum, i) => sum + (i.fat || 0), 0);

  localStorage.setItem(`fitmaster_meals_${date}`, JSON.stringify(meals));
}

/**
 * Execute search instantly with fallback
 */
async function executeFoodSearch(q) {
  const container = document.getElementById('search-results-list');
  if (!container) return;

  const query = q.toLowerCase();
  let foods = BUILTIN_FOODS.filter((f) => {
    const matchesQ = !query || f.food_name.toLowerCase().includes(query) || f.category.toLowerCase().includes(query);
    const matchesCat = !activeCategory || f.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesQ && matchesCat;
  });

  if (foods.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-dim);">
        <div>No matching foods found.</div>
        <div style="font-size: 12px; margin-top: 6px; color: var(--text-muted);">Try a broader keyword or switch categories.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  foods.forEach((food) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    if (selectedFood && selectedFood.food_id === food.food_id) {
      item.classList.add('selected');
    }

    item.innerHTML = `
      <div>
        <div style="font-weight: 600; font-size: 14px; color: #ffffff;">${food.food_name}</div>
        <div style="font-size: 12px; color: var(--text-dim);">
          ${food.category} • Standard Serving: 100g
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-family: var(--font-heading); font-weight: 700; color: var(--primary-light); font-size: 14px;">
          ${food.calories_per_100g} kcal
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">${food.protein_per_100g}g P • ${food.carbs_per_100g}g C</div>
      </div>
    `;

    item.addEventListener('click', () => {
      document.querySelectorAll('.search-result-item').forEach((el) => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedFood = food;

      const calcCard = document.getElementById('serving-calculator');
      if (calcCard) calcCard.style.display = 'block';

      document.getElementById('selected-food-title').textContent = food.food_name;
      document.getElementById('selected-food-source').textContent = food.source;
      document.getElementById('confirm-add-food-btn').disabled = false;

      updateDynamicServingCalculation();
    });

    container.appendChild(item);
  });
}

function updateDynamicServingCalculation() {
  if (!selectedFood) return;
  const grams = parseFloat(document.getElementById('serving-grams-input')?.value) || 0;
  const mult = grams / 100;

  const calcCal = Math.round(selectedFood.calories_per_100g * mult);
  const calcP = (selectedFood.protein_per_100g * mult).toFixed(1);
  const calcC = (selectedFood.carbs_per_100g * mult).toFixed(1);
  const calcF = (selectedFood.fat_per_100g * mult).toFixed(1);
  const calcFib = ((selectedFood.fibre_per_100g || 0) * mult).toFixed(1);

  document.getElementById('calc-calories').textContent = calcCal;
  document.getElementById('calc-protein').textContent = calcP;
  document.getElementById('calc-carbs').textContent = calcC;
  document.getElementById('calc-fat').textContent = calcF;
  document.getElementById('calc-fibre').textContent = calcFib;
}

/**
 * Load meals for current date and render interactive slots
 */
async function loadDailyTrackerData() {
  let meals = [];

  // Try API first
  try {
    const res = await api.get(`/meals?date=${currentDate}`);
    meals = res?.data?.meals || [];
  } catch {
    // Local fallback
    meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${currentDate}`) || '[]');
  }

  // Calculate daily totals
  let totalCal = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  meals.forEach((m) => {
    (m.items || []).forEach((item) => {
      totalCal += Number(item.calories || 0);
      totalP += Number(item.protein || 0);
      totalC += Number(item.carbs || 0);
      totalF += Number(item.fat || 0);
    });
  });

  renderDailyBudgetAndMacros({ calories: totalCal, protein: totalP, carbs: totalC, fat: totalF });
  renderMealSlots(meals);
}

function renderDailyBudgetAndMacros(totals) {
  const targetCal = userGoals.daily_calories || 2000;
  const consumedCal = totals.calories;
  const remainingCal = Math.max(0, targetCal - consumedCal);
  const percentage = Math.min(100, Math.round((consumedCal / targetCal) * 100));

  const cNum = document.getElementById('consumed-calories-num');
  const tNum = document.getElementById('target-calories-num');
  const rNum = document.getElementById('remaining-calories-num');
  const bar = document.getElementById('calories-progress-bar');

  if (cNum) cNum.textContent = Math.round(consumedCal);
  if (tNum) tNum.textContent = Math.round(targetCal);
  if (rNum) rNum.textContent = `${Math.round(remainingCal)} remaining`;
  if (bar) {
    bar.style.width = `${percentage}%`;
    bar.style.background = percentage > 100 ? '#f43f5e' : 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  }

  // Macro progress bars
  const pTarget = userGoals.protein_g || 140;
  const cTarget = userGoals.carbs_g || 220;
  const fTarget = userGoals.fat_g || 60;

  const pStat = document.getElementById('consumed-protein-stat');
  const cStart = document.getElementById('consumed-carbs-stat');
  const fStat = document.getElementById('consumed-fat-stat');

  if (pStat) pStat.textContent = `${Math.round(totals.protein)}g / ${pTarget}g`;
  if (cStart) cStart.textContent = `${Math.round(totals.carbs)}g / ${cTarget}g`;
  if (fStat) fStat.textContent = `${Math.round(totals.fat)}g / ${fTarget}g`;

  const pBar = document.getElementById('protein-progress-bar');
  const cBar = document.getElementById('carbs-progress-bar');
  const fBar = document.getElementById('fat-progress-bar');

  if (pBar) pBar.style.width = `${Math.min(100, Math.round((totals.protein / pTarget) * 100))}%`;
  if (cBar) cBar.style.width = `${Math.min(100, Math.round((totals.carbs / cTarget) * 100))}%`;
  if (fBar) fBar.style.width = `${Math.min(100, Math.round((totals.fat / fTarget) * 100))}%`;
}

function renderMealSlots(meals) {
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

  mealTypes.forEach((type) => {
    const meal = meals.find((m) => m.meal_type === type);
    const container = document.getElementById(`${type}-items-container`);
    const calsEl = document.getElementById(`${type}-calories-summary`);
    const macrosEl = document.getElementById(`${type}-macros-summary`);

    if (!container) return;

    if (!meal || !meal.items || meal.items.length === 0) {
      container.innerHTML = `<div class="empty-meal-placeholder">No items logged yet.</div>`;
      if (calsEl) calsEl.textContent = '0 kcal';
      if (macrosEl) macrosEl.textContent = '0g P • 0g C • 0g F';
      return;
    }

    let mealCal = 0, mealP = 0, mealC = 0, mealF = 0;

    container.innerHTML = meal.items.map((item, idx) => {
      mealCal += Number(item.calories || 0);
      mealP += Number(item.protein || 0);
      mealC += Number(item.carbs || 0);
      mealF += Number(item.fat || 0);

      const entryId = item.entry_id || idx;
      return `
        <div class="meal-food-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--bg-card-border); border-radius: var(--radius-md); margin-bottom: 8px;">
          <div>
            <div style="font-weight: 600; color: #ffffff; font-size: 14px;">${item.food_name || item.name}</div>
            <div style="font-size: 12px; color: var(--text-dim);">
              ${item.quantity_grams || 100}g portion • <span style="color: #60a5fa;">${Math.round(item.protein || 0)}g P</span> • <span style="color: #fbbf24;">${Math.round(item.carbs || 0)}g C</span> • <span style="color: #f43f5e;">${Math.round(item.fat || 0)}g F</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-family: var(--font-heading); font-weight: 700; color: var(--primary-light); font-size: 15px;">
              ${Math.round(item.calories || 0)} kcal
            </div>
            <button onclick="deleteMealItem('${type}', ${entryId})" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 6px; padding: 4px 8px; font-size: 13px; cursor: pointer; transition: all 0.2s;" title="Remove food item">✕</button>
          </div>
        </div>
      `;
    }).join('');

    if (calsEl) calsEl.textContent = `${Math.round(mealCal)} kcal`;
    if (macrosEl) macrosEl.textContent = `${Math.round(mealP)}g P • ${Math.round(mealC)}g C • ${Math.round(mealF)}g F`;
  });
}

/**
 * Delete individual food item interactively
 */
window.deleteMealItem = async function(mealType, entryId) {
  let meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${currentDate}`) || '[]');
  const meal = meals.find((m) => m.meal_type === mealType);

  if (meal && meal.items) {
    meal.items = meal.items.filter((item, idx) => (item.entry_id || idx) != entryId);
    meal.total_calories = meal.items.reduce((sum, i) => sum + (i.calories || 0), 0);
    meal.total_protein = meal.items.reduce((sum, i) => sum + (i.protein || 0), 0);
    meal.total_carbs = meal.items.reduce((sum, i) => sum + (i.carbs || 0), 0);
    meal.total_fat = meal.items.reduce((sum, i) => sum + (i.fat || 0), 0);

    localStorage.setItem(`fitmaster_meals_${currentDate}`, JSON.stringify(meals));
    showToast('Item Removed', 'Food item removed from meal.', 'info');
    await loadDailyTrackerData();
  }
};
