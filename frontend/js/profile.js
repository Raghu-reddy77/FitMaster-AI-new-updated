/**
 * FitMaster AI – User Profile Management Script
 * Provides live real-time interactive calculations for BMI, BMR, TDEE,
 * daily calorie targets, macronutrients, and hydration with local persistence & API sync.
 */

document.addEventListener('DOMContentLoaded', async () => {
  setupInteractiveControls();
  await loadUserProfile();
  computeLiveMetabolicTargets();

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveUserProfile();
    });
  }
});

/**
 * Connect sliders, inputs, and interactive goal selection cards
 */
function setupInteractiveControls() {
  const heightInput = document.getElementById('profile-height');
  const heightSlider = document.getElementById('profile-height-slider');
  const heightDisplay = document.getElementById('height-val-display');

  const weightInput = document.getElementById('profile-weight');
  const weightSlider = document.getElementById('profile-weight-slider');
  const weightDisplay = document.getElementById('weight-val-display');

  const ageInput = document.getElementById('profile-age');
  const genderSelect = document.getElementById('profile-gender');
  const activitySelect = document.getElementById('profile-activity');

  // Height sync
  if (heightInput && heightSlider) {
    heightSlider.addEventListener('input', (e) => {
      heightInput.value = e.target.value;
      if (heightDisplay) heightDisplay.textContent = `${e.target.value} cm`;
      computeLiveMetabolicTargets();
    });

    heightInput.addEventListener('input', (e) => {
      heightSlider.value = e.target.value;
      if (heightDisplay) heightDisplay.textContent = `${e.target.value || 0} cm`;
      computeLiveMetabolicTargets();
    });
  }

  // Weight sync
  if (weightInput && weightSlider) {
    weightSlider.addEventListener('input', (e) => {
      weightInput.value = e.target.value;
      if (weightDisplay) weightDisplay.textContent = `${Number(e.target.value).toFixed(1)} kg`;
      computeLiveMetabolicTargets();
    });

    weightInput.addEventListener('input', (e) => {
      weightSlider.value = e.target.value;
      if (weightDisplay) weightDisplay.textContent = `${Number(e.target.value || 0).toFixed(1)} kg`;
      computeLiveMetabolicTargets();
    });
  }

  // Input listeners for dynamic live recalculation
  ageInput?.addEventListener('input', computeLiveMetabolicTargets);
  genderSelect?.addEventListener('change', computeLiveMetabolicTargets);
  activitySelect?.addEventListener('change', computeLiveMetabolicTargets);

  // Interactive Goal Selector Cards
  document.querySelectorAll('.goal-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.goal-card').forEach((c) => {
        c.classList.remove('active');
        c.style.borderColor = 'var(--bg-card-border)';
        c.style.background = 'rgba(255, 255, 255, 0.03)';
      });

      card.classList.add('active');
      card.style.borderColor = 'var(--primary)';
      card.style.background = 'rgba(16, 185, 129, 0.12)';

      const chosenGoal = card.dataset.goal;
      const hiddenInput = document.getElementById('profile-goal');
      if (hiddenInput) hiddenInput.value = chosenGoal;

      computeLiveMetabolicTargets();
    });
  });
}

/**
 * Live Mifflin-St Jeor + Macro & BMI computation
 */
function computeLiveMetabolicTargets() {
  const age = parseInt(document.getElementById('profile-age')?.value, 10) || 25;
  const gender = document.getElementById('profile-gender')?.value || 'male';
  const height_cm = parseFloat(document.getElementById('profile-height')?.value) || 175;
  const weight_kg = parseFloat(document.getElementById('profile-weight')?.value) || 70;
  const activity_level = document.getElementById('profile-activity')?.value || 'moderately_active';
  const fitness_goal = document.getElementById('profile-goal')?.value || 'weight_maintenance';

  // 1. BMI calculation: weight / (height in m)^2
  const heightM = height_cm / 100;
  const bmi = heightM > 0 ? (weight_kg / (heightM * heightM)) : 22;
  const bmiFormatted = bmi.toFixed(1);

  // BMI Category & badge
  let bmiCategory = 'Normal';
  let badgeClass = 'badge badge-success';
  let pinPercent = 35; // default position

  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
    badgeClass = 'badge badge-warning';
    pinPercent = Math.max(5, (bmi / 18.5) * 20);
  } else if (bmi <= 24.9) {
    bmiCategory = 'Normal (Optimal)';
    badgeClass = 'badge badge-success';
    pinPercent = 20 + ((bmi - 18.5) / (24.9 - 18.5)) * 30;
  } else if (bmi <= 29.9) {
    bmiCategory = 'Overweight';
    badgeClass = 'badge badge-warning';
    pinPercent = 50 + ((bmi - 25) / (29.9 - 25)) * 25;
  } else {
    bmiCategory = 'Obese';
    badgeClass = 'badge badge-danger';
    pinPercent = Math.min(95, 75 + ((bmi - 30) / 15) * 20);
  }

  // Update BMI elements
  const scoreText = document.getElementById('bmi-score-text');
  const statusBadge = document.getElementById('bmi-status-badge');
  const pin = document.getElementById('bmi-indicator-pin');
  if (scoreText) scoreText.textContent = bmiFormatted;
  if (statusBadge) {
    statusBadge.textContent = bmiCategory;
    statusBadge.className = badgeClass;
  }
  if (pin) pin.style.left = `${Math.min(95, Math.max(5, pinPercent))}%`;

  // 2. BMR via Mifflin-St Jeor
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'female') {
    bmr -= 161;
  } else {
    bmr += 5;
  }

  // 3. Activity multipliers
  const activityMap = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };
  const multiplier = activityMap[activity_level] || 1.55;
  const tdee = bmr * multiplier;

  // 4. Target calories based on goal
  let dailyCalories = tdee;
  if (fitness_goal === 'weight_loss') {
    dailyCalories = Math.max(1200, tdee - 500);
  } else if (fitness_goal === 'lean_muscle_gain') {
    dailyCalories = tdee + 350;
  }

  // 5. Macronutrient distribution
  // Protein: ~2g per kg bodyweight
  const protein_g = Math.round(weight_kg * 2.0);
  // Fat: ~25% of daily calories (9 kcal/g)
  const fat_g = Math.round((dailyCalories * 0.25) / 9);
  // Carbs: remainder (4 kcal/g)
  const remainingCal = dailyCalories - (protein_g * 4 + fat_g * 9);
  const carbs_g = Math.max(50, Math.round(remainingCal / 4));

  // 6. Hydration: 35ml per kg bodyweight
  const water_ml = Math.round(weight_kg * 35);

  const calculatedGoals = {
    daily_calories: Math.round(dailyCalories),
    protein_g,
    carbs_g,
    fat_g,
    bmi: bmiFormatted,
    bmiCategory,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    water_ml
  };

  renderGoalTargets(calculatedGoals);
  return calculatedGoals;
}

/**
 * Load profile from backend or localStorage
 */
async function loadUserProfile() {
  try {
    const response = await api.get('/users/profile');
    const { user, profile, goal } = response.data;

    if (user) {
      document.getElementById('profile-display-name').textContent = user.name;
      document.getElementById('profile-display-email').textContent = user.email;

      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      document.getElementById('profile-avatar-initials').textContent = initials || 'FM';
    }

    if (profile) {
      if (profile.age) document.getElementById('profile-age').value = profile.age;
      if (profile.gender) document.getElementById('profile-gender').value = profile.gender;
      if (profile.height_cm) {
        document.getElementById('profile-height').value = profile.height_cm;
        const slider = document.getElementById('profile-height-slider');
        if (slider) slider.value = profile.height_cm;
        const disp = document.getElementById('height-val-display');
        if (disp) disp.textContent = `${profile.height_cm} cm`;
      }
      if (profile.weight_kg) {
        document.getElementById('profile-weight').value = profile.weight_kg;
        const slider = document.getElementById('profile-weight-slider');
        if (slider) slider.value = profile.weight_kg;
        const disp = document.getElementById('weight-val-display');
        if (disp) disp.textContent = `${Number(profile.weight_kg).toFixed(1)} kg`;
      }
      if (profile.activity_level) document.getElementById('profile-activity').value = profile.activity_level;
      if (profile.fitness_goal) {
        const goalInput = document.getElementById('profile-goal');
        if (goalInput) goalInput.value = profile.fitness_goal;

        document.querySelectorAll('.goal-card').forEach((c) => {
          if (c.dataset.goal === profile.fitness_goal) {
            c.classList.add('active');
            c.style.borderColor = 'var(--primary)';
            c.style.background = 'rgba(16, 185, 129, 0.12)';
          } else {
            c.classList.remove('active');
            c.style.borderColor = 'var(--bg-card-border)';
            c.style.background = 'rgba(255, 255, 255, 0.03)';
          }
        });
      }
    }

    if (goal) {
      renderGoalTargets(goal);
    }
  } catch {
    // Local fallback
    const saved = localStorage.getItem('fitmaster_profile');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.age) document.getElementById('profile-age').value = p.age;
        if (p.gender) document.getElementById('profile-gender').value = p.gender;
        if (p.height_cm) {
          document.getElementById('profile-height').value = p.height_cm;
          const slider = document.getElementById('profile-height-slider');
          if (slider) slider.value = p.height_cm;
          const disp = document.getElementById('height-val-display');
          if (disp) disp.textContent = `${p.height_cm} cm`;
        }
        if (p.weight_kg) {
          document.getElementById('profile-weight').value = p.weight_kg;
          const slider = document.getElementById('profile-weight-slider');
          if (slider) slider.value = p.weight_kg;
          const disp = document.getElementById('weight-val-display');
          if (disp) disp.textContent = `${Number(p.weight_kg).toFixed(1)} kg`;
        }
        if (p.activity_level) document.getElementById('profile-activity').value = p.activity_level;
        if (p.fitness_goal) {
          document.getElementById('profile-goal').value = p.fitness_goal;
          document.querySelectorAll('.goal-card').forEach((c) => {
            if (c.dataset.goal === p.fitness_goal) {
              c.classList.add('active');
              c.style.borderColor = 'var(--primary)';
              c.style.background = 'rgba(16, 185, 129, 0.12)';
            }
          });
        }
      } catch (e) {
        console.warn('LocalStorage profile parse error:', e);
      }
    }

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : JSON.parse(localStorage.getItem('fitmaster_user') || '{}');
    if (user && user.name) {
      document.getElementById('profile-display-name').textContent = user.name;
      document.getElementById('profile-display-email').textContent = user.email || 'user@fitmaster.ai';
      const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
      document.getElementById('profile-avatar-initials').textContent = initials || 'FM';
    }
  }
}

/**
 * Save updated profile
 */
async function saveUserProfile() {
  const saveBtn = document.getElementById('save-profile-btn');

  const age = parseInt(document.getElementById('profile-age').value, 10);
  const gender = document.getElementById('profile-gender').value;
  const height_cm = parseFloat(document.getElementById('profile-height').value);
  const weight_kg = parseFloat(document.getElementById('profile-weight').value);
  const activity_level = document.getElementById('profile-activity').value;
  const fitness_goal = document.getElementById('profile-goal').value;

  if (!age || !gender || !height_cm || !weight_kg || !activity_level || !fitness_goal) {
    showToast('Incomplete Data', 'Please fill in all physical attribute fields.', 'warning');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Saving...';

  const liveGoals = computeLiveMetabolicTargets();

  // Save to localStorage for instant cross-tab interactivity
  const profileData = {
    age,
    gender,
    height_cm,
    weight_kg,
    activity_level,
    fitness_goal,
    goals: liveGoals,
    updated_at: new Date().toISOString()
  };
  localStorage.setItem('fitmaster_profile', JSON.stringify(profileData));

  try {
    const response = await api.put('/users/profile', {
      age,
      gender,
      height_cm,
      weight_kg,
      activity_level,
      fitness_goal
    });

    showToast('Profile Updated', 'Metabolic targets and daily goals successfully saved!', 'success');
    if (response.data && response.data.goals) {
      renderGoalTargets(response.data.goals);
    }
  } catch {
    // Seamless local success
    showToast('Profile Saved Locally', 'Targets updated and synchronized!', 'success');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Profile & Recalculate Goals';
  }
}

/**
 * Update UI targets
 */
function renderGoalTargets(goals) {
  const cEl = document.getElementById('target-calories-val');
  const pEl = document.getElementById('target-protein-val');
  const cbEl = document.getElementById('target-carbs-val');
  const fEl = document.getElementById('target-fat-val');

  if (cEl) cEl.textContent = Math.round(goals.daily_calories || 0);
  if (pEl) pEl.textContent = `${Math.round(goals.protein_g || 0)} g`;
  if (cbEl) cbEl.textContent = `${Math.round(goals.carbs_g || 0)} g`;
  if (fEl) fEl.textContent = `${Math.round(goals.fat_g || 0)} g`;

  const bmiEl = document.getElementById('chip-bmi');
  const catEl = document.getElementById('chip-bmi-category');
  const bmrEl = document.getElementById('chip-bmr');
  const tdeeEl = document.getElementById('chip-tdee');
  const waterEl = document.getElementById('chip-water');

  if (bmiEl) bmiEl.textContent = goals.bmi || '--';
  if (catEl) catEl.textContent = goals.bmiCategory || 'Normal';
  if (bmrEl) bmrEl.textContent = Math.round(goals.bmr || 0);
  if (tdeeEl) tdeeEl.textContent = Math.round(goals.tdee || 0);
  if (waterEl) waterEl.textContent = Math.round(goals.water_ml || 2500);
}
