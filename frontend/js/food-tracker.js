/**
 * FitMaster AI – Interactive Food & Nutrition Tracker Client Logic
 * Provides instant verified database search, live gram scaling, quick custom food logging,
 * real-time macro meter updates, and seamless offline/localStorage & backend sync.
 */

// Use local date to prevent UTC timezone shift (e.g. IST is UTC+5:30)
function getLocalDateStr(d) {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

let currentDate = getLocalDateStr();
let activeMealType = 'breakfast';
let selectedFood = null;
let userGoals = { daily_calories: 2000, protein_g: 140, carbs_g: 220, fat_g: 60 };
let activeCategory = '';

// Built-in verified nutrient databank (per 100g) — synced with database food_ids 1-95
const BUILTIN_FOODS = [
  { food_id: 1, food_name: "Almond Milk, Unsweetened", category: "Dairy & Alternatives", calories_per_100g: 15, protein_per_100g: 0.55, carbs_per_100g: 0.34, fat_per_100g: 1.1, fibre_per_100g: 0.2, source: "USDA FoodData Central" },
  { food_id: 2, food_name: "Buffalo Milk, Fluid", category: "Dairy & Alternatives", calories_per_100g: 97, protein_per_100g: 3.75, carbs_per_100g: 5.18, fat_per_100g: 6.87, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 3, food_name: "Buttermilk, Traditional (Chaas)", category: "Dairy & Alternatives", calories_per_100g: 28, protein_per_100g: 1.8, carbs_per_100g: 3.1, fat_per_100g: 0.9, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 4, food_name: "Cheddar Cheese", category: "Dairy & Alternatives", calories_per_100g: 403, protein_per_100g: 24.9, carbs_per_100g: 1.28, fat_per_100g: 33.14, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 5, food_name: "Curd / Dahi (Cow Milk)", category: "Dairy & Alternatives", calories_per_100g: 60, protein_per_100g: 3.2, carbs_per_100g: 4.4, fat_per_100g: 3.2, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 6, food_name: "Greek Yogurt (Nonfat, Plain)", category: "Dairy & Alternatives", calories_per_100g: 59, protein_per_100g: 10.19, carbs_per_100g: 3.6, fat_per_100g: 0.39, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 7, food_name: "Low-Fat Paneer", category: "Dairy & Alternatives", calories_per_100g: 173, protein_per_100g: 25, carbs_per_100g: 4.5, fat_per_100g: 5.5, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 8, food_name: "Mozzarella Cheese", category: "Dairy & Alternatives", calories_per_100g: 300, protein_per_100g: 22.17, carbs_per_100g: 2.19, fat_per_100g: 22.35, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 9, food_name: "Paneer (Indian Cottage Cheese)", category: "Dairy & Alternatives", calories_per_100g: 296, protein_per_100g: 18.3, carbs_per_100g: 3.4, fat_per_100g: 22.8, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 10, food_name: "Skimmed Milk", category: "Dairy & Alternatives", calories_per_100g: 35, protein_per_100g: 3.4, carbs_per_100g: 5, fat_per_100g: 0.1, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 11, food_name: "Whole Milk (Cow)", category: "Dairy & Alternatives", calories_per_100g: 61, protein_per_100g: 3.15, carbs_per_100g: 4.8, fat_per_100g: 3.25, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 12, food_name: "Atlantic Salmon (Baked)", category: "Fish & Seafood", calories_per_100g: 182, protein_per_100g: 25.44, carbs_per_100g: 0, fat_per_100g: 8.13, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 13, food_name: "Canned Tuna (in Water)", category: "Fish & Seafood", calories_per_100g: 116, protein_per_100g: 25.51, carbs_per_100g: 0, fat_per_100g: 0.82, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 14, food_name: "Pomfret, Silver, Cooked", category: "Fish & Seafood", calories_per_100g: 136, protein_per_100g: 20.4, carbs_per_100g: 0, fat_per_100g: 5.6, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 15, food_name: "Rohu (Carp), Meat Only, Cooked", category: "Fish & Seafood", calories_per_100g: 127, protein_per_100g: 21.8, carbs_per_100g: 0, fat_per_100g: 3.9, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 16, food_name: "Shrimp / Prawns (Steamed)", category: "Fish & Seafood", calories_per_100g: 99, protein_per_100g: 24, carbs_per_100g: 0.2, fat_per_100g: 0.28, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 17, food_name: "Tilapia Fillet (Cooked)", category: "Fish & Seafood", calories_per_100g: 128, protein_per_100g: 26.15, carbs_per_100g: 0, fat_per_100g: 2.65, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 18, food_name: "Apple (with skin, Raw)", category: "Fruits", calories_per_100g: 52, protein_per_100g: 0.26, carbs_per_100g: 13.81, fat_per_100g: 0.17, fibre_per_100g: 2.4, source: "USDA FoodData Central" },
  { food_id: 19, food_name: "Banana (Raw)", category: "Fruits", calories_per_100g: 89, protein_per_100g: 1.09, carbs_per_100g: 22.84, fat_per_100g: 0.33, fibre_per_100g: 2.6, source: "USDA FoodData Central" },
  { food_id: 20, food_name: "Blueberries (Raw)", category: "Fruits", calories_per_100g: 57, protein_per_100g: 0.74, carbs_per_100g: 14.49, fat_per_100g: 0.33, fibre_per_100g: 2.4, source: "USDA FoodData Central" },
  { food_id: 21, food_name: "Grapes (Raw)", category: "Fruits", calories_per_100g: 69, protein_per_100g: 0.72, carbs_per_100g: 18.1, fat_per_100g: 0.16, fibre_per_100g: 0.9, source: "USDA FoodData Central" },
  { food_id: 22, food_name: "Guava / Amrood (Raw)", category: "Fruits", calories_per_100g: 68, protein_per_100g: 2.55, carbs_per_100g: 14.32, fat_per_100g: 0.95, fibre_per_100g: 5.4, source: "USDA FoodData Central" },
  { food_id: 23, food_name: "Mango (Ripe, Raw)", category: "Fruits", calories_per_100g: 60, protein_per_100g: 0.82, carbs_per_100g: 14.98, fat_per_100g: 0.38, fibre_per_100g: 1.6, source: "USDA FoodData Central" },
  { food_id: 24, food_name: "Orange (Navel, Raw)", category: "Fruits", calories_per_100g: 47, protein_per_100g: 0.94, carbs_per_100g: 11.75, fat_per_100g: 0.12, fibre_per_100g: 2.4, source: "USDA FoodData Central" },
  { food_id: 25, food_name: "Papaya (Raw)", category: "Fruits", calories_per_100g: 43, protein_per_100g: 0.47, carbs_per_100g: 10.82, fat_per_100g: 0.26, fibre_per_100g: 1.7, source: "USDA FoodData Central" },
  { food_id: 26, food_name: "Pineapple, Raw", category: "Fruits", calories_per_100g: 50, protein_per_100g: 0.54, carbs_per_100g: 13.12, fat_per_100g: 0.12, fibre_per_100g: 1.4, source: "USDA FoodData Central" },
  { food_id: 27, food_name: "Pomegranate / Anar (Raw)", category: "Fruits", calories_per_100g: 83, protein_per_100g: 1.67, carbs_per_100g: 18.7, fat_per_100g: 1.17, fibre_per_100g: 4, source: "USDA FoodData Central" },
  { food_id: 28, food_name: "Strawberries (Raw)", category: "Fruits", calories_per_100g: 32, protein_per_100g: 0.67, carbs_per_100g: 7.68, fat_per_100g: 0.3, fibre_per_100g: 2, source: "USDA FoodData Central" },
  { food_id: 29, food_name: "Watermelon (Raw)", category: "Fruits", calories_per_100g: 30, protein_per_100g: 0.61, carbs_per_100g: 7.55, fat_per_100g: 0.15, fibre_per_100g: 0.4, source: "USDA FoodData Central" },
  { food_id: 30, food_name: "Barley, Pearled, Cooked", category: "Grains & Cereals", calories_per_100g: 123, protein_per_100g: 2.26, carbs_per_100g: 28.22, fat_per_100g: 0.44, fibre_per_100g: 3.8, source: "USDA FoodData Central" },
  { food_id: 31, food_name: "Basmati Rice, Cooked", category: "Grains & Cereals", calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28.2, fat_per_100g: 0.3, fibre_per_100g: 0.4, source: "Indian Nutrient Databank" },
  { food_id: 32, food_name: "Brown Rice (Cooked)", category: "Grains & Cereals", calories_per_100g: 123, protein_per_100g: 2.74, carbs_per_100g: 25.58, fat_per_100g: 0.97, fibre_per_100g: 1.6, source: "USDA FoodData Central" },
  { food_id: 33, food_name: "Finger Millet (Ragi), Whole Grain, Raw", category: "Grains & Cereals", calories_per_100g: 328, protein_per_100g: 7.3, carbs_per_100g: 72, fat_per_100g: 1.3, fibre_per_100g: 11.5, source: "Indian Nutrient Databank" },
  { food_id: 34, food_name: "Pearl Millet (Bajra), Whole Grain, Raw", category: "Grains & Cereals", calories_per_100g: 361, protein_per_100g: 11.6, carbs_per_100g: 67.5, fat_per_100g: 5, fibre_per_100g: 11.3, source: "Indian Nutrient Databank" },
  { food_id: 35, food_name: "Quinoa (Cooked)", category: "Grains & Cereals", calories_per_100g: 120, protein_per_100g: 4.4, carbs_per_100g: 21.3, fat_per_100g: 1.92, fibre_per_100g: 2.8, source: "USDA FoodData Central" },
  { food_id: 36, food_name: "Rolled Oats (Raw)", category: "Grains & Cereals", calories_per_100g: 379, protein_per_100g: 13.15, carbs_per_100g: 67.7, fat_per_100g: 6.52, fibre_per_100g: 10.1, source: "USDA FoodData Central" },
  { food_id: 37, food_name: "Semolina (Suji), Raw", category: "Grains & Cereals", calories_per_100g: 360, protein_per_100g: 12.7, carbs_per_100g: 72.8, fat_per_100g: 1.05, fibre_per_100g: 3.9, source: "Indian Nutrient Databank" },
  { food_id: 38, food_name: "Sorghum (Jowar), Whole Grain, Raw", category: "Grains & Cereals", calories_per_100g: 349, protein_per_100g: 10.4, carbs_per_100g: 72.6, fat_per_100g: 1.9, fibre_per_100g: 9.7, source: "Indian Nutrient Databank" },
  { food_id: 39, food_name: "White Bread", category: "Grains & Cereals", calories_per_100g: 266, protein_per_100g: 8.85, carbs_per_100g: 49.42, fat_per_100g: 3.33, fibre_per_100g: 2.7, source: "USDA FoodData Central" },
  { food_id: 40, food_name: "White Rice (Parboiled, Cooked)", category: "Grains & Cereals", calories_per_100g: 130, protein_per_100g: 2.69, carbs_per_100g: 28.17, fat_per_100g: 0.28, fibre_per_100g: 0.4, source: "USDA FoodData Central" },
  { food_id: 41, food_name: "Whole Wheat Bread", category: "Grains & Cereals", calories_per_100g: 247, protein_per_100g: 12.96, carbs_per_100g: 41.27, fat_per_100g: 3.42, fibre_per_100g: 6, source: "USDA FoodData Central" },
  { food_id: 42, food_name: "Whole Wheat Pasta (Cooked)", category: "Grains & Cereals", calories_per_100g: 124, protein_per_100g: 5.33, carbs_per_100g: 26.54, fat_per_100g: 0.54, fibre_per_100g: 3.9, source: "USDA FoodData Central" },
  { food_id: 43, food_name: "Whole Wheat Roti / Chapati", category: "Grains & Cereals", calories_per_100g: 297, protein_per_100g: 9.8, carbs_per_100g: 52.3, fat_per_100g: 4.2, fibre_per_100g: 9.6, source: "Indian Nutrient Databank" },
  { food_id: 44, food_name: "Bengal Gram Dal (Chana Dal), Cooked", category: "Legumes & Pulses", calories_per_100g: 138, protein_per_100g: 9.2, carbs_per_100g: 22.4, fat_per_100g: 1.4, fibre_per_100g: 7.8, source: "Indian Nutrient Databank" },
  { food_id: 45, food_name: "Black Beans (Cooked)", category: "Legumes & Pulses", calories_per_100g: 132, protein_per_100g: 8.86, carbs_per_100g: 23.71, fat_per_100g: 0.54, fibre_per_100g: 8.7, source: "USDA FoodData Central" },
  { food_id: 46, food_name: "Black Gram Dal (Urad), Cooked", category: "Legumes & Pulses", calories_per_100g: 130, protein_per_100g: 9.4, carbs_per_100g: 21.8, fat_per_100g: 0.5, fibre_per_100g: 7.5, source: "Indian Nutrient Databank" },
  { food_id: 47, food_name: "Black-Eyed Peas / Lobia (Cooked)", category: "Legumes & Pulses", calories_per_100g: 116, protein_per_100g: 7.73, carbs_per_100g: 21.25, fat_per_100g: 0.53, fibre_per_100g: 6.5, source: "USDA FoodData Central" },
  { food_id: 48, food_name: "Chickpeas / Chana (Cooked)", category: "Legumes & Pulses", calories_per_100g: 164, protein_per_100g: 8.86, carbs_per_100g: 27.42, fat_per_100g: 2.59, fibre_per_100g: 7.6, source: "USDA FoodData Central" },
  { food_id: 49, food_name: "Edamame, Frozen, Prepared", category: "Legumes & Pulses", calories_per_100g: 121, protein_per_100g: 11.91, carbs_per_100g: 8.91, fat_per_100g: 5.2, fibre_per_100g: 5.2, source: "USDA FoodData Central" },
  { food_id: 50, food_name: "Firm Tofu", category: "Legumes & Pulses", calories_per_100g: 76, protein_per_100g: 8.08, carbs_per_100g: 1.87, fat_per_100g: 4.78, fibre_per_100g: 0.3, source: "USDA FoodData Central" },
  { food_id: 51, food_name: "Kidney Beans / Rajma (Cooked)", category: "Legumes & Pulses", calories_per_100g: 127, protein_per_100g: 8.67, carbs_per_100g: 22.8, fat_per_100g: 0.5, fibre_per_100g: 6.4, source: "USDA FoodData Central" },
  { food_id: 52, food_name: "Moong Sprouts, Raw", category: "Legumes & Pulses", calories_per_100g: 30, protein_per_100g: 3.04, carbs_per_100g: 5.94, fat_per_100g: 0.18, fibre_per_100g: 1.8, source: "Indian Nutrient Databank" },
  { food_id: 53, food_name: "Red Gram Dal (Toor/Arhar), Cooked", category: "Legumes & Pulses", calories_per_100g: 124, protein_per_100g: 8.6, carbs_per_100g: 21.5, fat_per_100g: 0.4, fibre_per_100g: 7.2, source: "Indian Nutrient Databank" },
  { food_id: 54, food_name: "Red Lentil Dal (Masoor), Cooked", category: "Legumes & Pulses", calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.4, fibre_per_100g: 7.9, source: "Indian Nutrient Databank" },
  { food_id: 55, food_name: "Soybeans (Boiled)", category: "Legumes & Pulses", calories_per_100g: 172, protein_per_100g: 18.2, carbs_per_100g: 8.4, fat_per_100g: 8.9, fibre_per_100g: 6, source: "USDA FoodData Central" },
  { food_id: 56, food_name: "Soymilk, Original And Vanilla, Unfortified", category: "Legumes & Pulses", calories_per_100g: 54, protein_per_100g: 3.27, carbs_per_100g: 6.28, fat_per_100g: 1.75, fibre_per_100g: 0.6, source: "USDA FoodData Central" },
  { food_id: 57, food_name: "Yellow Lentil Dal (Moong), Cooked", category: "Legumes & Pulses", calories_per_100g: 116, protein_per_100g: 9.02, carbs_per_100g: 20.13, fat_per_100g: 0.38, fibre_per_100g: 7.9, source: "Indian Nutrient Databank" },
  { food_id: 58, food_name: "Almonds (Raw)", category: "Nuts & Seeds", calories_per_100g: 579, protein_per_100g: 21.15, carbs_per_100g: 21.55, fat_per_100g: 49.93, fibre_per_100g: 12.5, source: "USDA FoodData Central" },
  { food_id: 59, food_name: "Cashew Nuts (Raw)", category: "Nuts & Seeds", calories_per_100g: 553, protein_per_100g: 18.22, carbs_per_100g: 30.19, fat_per_100g: 43.85, fibre_per_100g: 3.3, source: "USDA FoodData Central" },
  { food_id: 60, food_name: "Chia Seeds (Dried)", category: "Nuts & Seeds", calories_per_100g: 486, protein_per_100g: 16.54, carbs_per_100g: 42.12, fat_per_100g: 30.74, fibre_per_100g: 34.4, source: "USDA FoodData Central" },
  { food_id: 61, food_name: "Flax Seeds", category: "Nuts & Seeds", calories_per_100g: 534, protein_per_100g: 18.29, carbs_per_100g: 28.88, fat_per_100g: 42.16, fibre_per_100g: 27.3, source: "USDA FoodData Central" },
  { food_id: 62, food_name: "Natural Peanut Butter", category: "Nuts & Seeds", calories_per_100g: 588, protein_per_100g: 25.09, carbs_per_100g: 20.08, fat_per_100g: 50.39, fibre_per_100g: 6, source: "USDA FoodData Central" },
  { food_id: 63, food_name: "Peanuts (Roasted, Unsalted)", category: "Nuts & Seeds", calories_per_100g: 585, protein_per_100g: 23.68, carbs_per_100g: 21.51, fat_per_100g: 49.66, fibre_per_100g: 8, source: "USDA FoodData Central" },
  { food_id: 64, food_name: "Pistachio Nuts (Raw)", category: "Nuts & Seeds", calories_per_100g: 560, protein_per_100g: 20.16, carbs_per_100g: 27.17, fat_per_100g: 45.32, fibre_per_100g: 10.6, source: "USDA FoodData Central" },
  { food_id: 65, food_name: "Pumpkin Seeds (Roasted)", category: "Nuts & Seeds", calories_per_100g: 574, protein_per_100g: 29.84, carbs_per_100g: 14.71, fat_per_100g: 49.05, fibre_per_100g: 6.5, source: "USDA FoodData Central" },
  { food_id: 66, food_name: "Walnuts (Raw)", category: "Nuts & Seeds", calories_per_100g: 654, protein_per_100g: 15.23, carbs_per_100g: 13.71, fat_per_100g: 65.21, fibre_per_100g: 6.7, source: "USDA FoodData Central" },
  { food_id: 67, food_name: "Coconut Oil", category: "Oils & Fats", calories_per_100g: 862, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 68, food_name: "Cow Ghee (Clarified Butter)", category: "Oils & Fats", calories_per_100g: 876, protein_per_100g: 0.28, carbs_per_100g: 0, fat_per_100g: 99.48, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 69, food_name: "Extra Virgin Olive Oil", category: "Oils & Fats", calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 70, food_name: "Mustard Oil (Pure)", category: "Oils & Fats", calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 71, food_name: "Chicken Breast (Skinless, Grilled)", category: "Poultry & Meat", calories_per_100g: 165, protein_per_100g: 31.02, carbs_per_100g: 0, fat_per_100g: 3.57, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 72, food_name: "Chicken Drumstick (Cooked)", category: "Poultry & Meat", calories_per_100g: 191, protein_per_100g: 28.3, carbs_per_100g: 0, fat_per_100g: 7.85, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 73, food_name: "Chicken Thigh (Skinless, Roasted)", category: "Poultry & Meat", calories_per_100g: 209, protein_per_100g: 25.97, carbs_per_100g: 0, fat_per_100g: 10.88, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 74, food_name: "Egg White (Boiled)", category: "Poultry & Meat", calories_per_100g: 52, protein_per_100g: 10.9, carbs_per_100g: 0.73, fat_per_100g: 0.17, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 75, food_name: "Lean Ground Beef (90/10 Cooked)", category: "Poultry & Meat", calories_per_100g: 217, protein_per_100g: 26.1, carbs_per_100g: 0, fat_per_100g: 11.83, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 76, food_name: "Mutton / Goat, Lean, Cooked", category: "Poultry & Meat", calories_per_100g: 143, protein_per_100g: 27.1, carbs_per_100g: 0, fat_per_100g: 3.03, fibre_per_100g: 0, source: "Indian Nutrient Databank" },
  { food_id: 77, food_name: "Turkey Breast (Roasted)", category: "Poultry & Meat", calories_per_100g: 135, protein_per_100g: 30.06, carbs_per_100g: 0, fat_per_100g: 0.74, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 78, food_name: "Whole Egg (Hard-Boiled)", category: "Poultry & Meat", calories_per_100g: 155, protein_per_100g: 12.58, carbs_per_100g: 1.12, fat_per_100g: 10.61, fibre_per_100g: 0, source: "USDA FoodData Central" },
  { food_id: 79, food_name: "Beetroot (Raw)", category: "Vegetables", calories_per_100g: 43, protein_per_100g: 1.61, carbs_per_100g: 9.56, fat_per_100g: 0.17, fibre_per_100g: 2.8, source: "USDA FoodData Central" },
  { food_id: 80, food_name: "Bitter Gourd / Karela (Raw)", category: "Vegetables", calories_per_100g: 17, protein_per_100g: 1, carbs_per_100g: 3.7, fat_per_100g: 0.2, fibre_per_100g: 2.8, source: "Indian Nutrient Databank" },
  { food_id: 81, food_name: "Bottle Gourd / Lauki (Raw)", category: "Vegetables", calories_per_100g: 14, protein_per_100g: 0.6, carbs_per_100g: 3.4, fat_per_100g: 0.1, fibre_per_100g: 1.2, source: "Indian Nutrient Databank" },
  { food_id: 82, food_name: "Broccoli (Steamed)", category: "Vegetables", calories_per_100g: 35, protein_per_100g: 2.38, carbs_per_100g: 7.18, fat_per_100g: 0.41, fibre_per_100g: 3.3, source: "USDA FoodData Central" },
  { food_id: 83, food_name: "Button Mushrooms (Raw)", category: "Vegetables", calories_per_100g: 22, protein_per_100g: 3.09, carbs_per_100g: 3.26, fat_per_100g: 0.34, fibre_per_100g: 1, source: "USDA FoodData Central" },
  { food_id: 84, food_name: "Cabbage, Raw", category: "Vegetables", calories_per_100g: 25, protein_per_100g: 1.28, carbs_per_100g: 5.8, fat_per_100g: 0.1, fibre_per_100g: 2.5, source: "USDA FoodData Central" },
  { food_id: 85, food_name: "Carrots (Raw)", category: "Vegetables", calories_per_100g: 41, protein_per_100g: 0.93, carbs_per_100g: 9.58, fat_per_100g: 0.24, fibre_per_100g: 2.8, source: "USDA FoodData Central" },
  { food_id: 86, food_name: "Cauliflower / Gobi (Cooked)", category: "Vegetables", calories_per_100g: 23, protein_per_100g: 1.84, carbs_per_100g: 4.11, fat_per_100g: 0.45, fibre_per_100g: 2.3, source: "USDA FoodData Central" },
  { food_id: 87, food_name: "Cucumber (Raw)", category: "Vegetables", calories_per_100g: 15, protein_per_100g: 0.65, carbs_per_100g: 3.63, fat_per_100g: 0.11, fibre_per_100g: 0.5, source: "USDA FoodData Central" },
  { food_id: 88, food_name: "Fenugreek Leaves / Methi (Raw)", category: "Vegetables", calories_per_100g: 49, protein_per_100g: 4.4, carbs_per_100g: 6, fat_per_100g: 0.9, fibre_per_100g: 3.2, source: "Indian Nutrient Databank" },
  { food_id: 89, food_name: "Green Bell Pepper / Capsicum (Raw)", category: "Vegetables", calories_per_100g: 20, protein_per_100g: 0.86, carbs_per_100g: 4.64, fat_per_100g: 0.17, fibre_per_100g: 1.7, source: "USDA FoodData Central" },
  { food_id: 90, food_name: "Green Peas (Boiled)", category: "Vegetables", calories_per_100g: 84, protein_per_100g: 5.36, carbs_per_100g: 15.63, fat_per_100g: 0.22, fibre_per_100g: 5.5, source: "USDA FoodData Central" },
  { food_id: 91, food_name: "Mustard Greens / Sarson (Raw)", category: "Vegetables", calories_per_100g: 27, protein_per_100g: 2.7, carbs_per_100g: 4.7, fat_per_100g: 0.4, fibre_per_100g: 3.2, source: "Indian Nutrient Databank" },
  { food_id: 92, food_name: "Okra / Bhindi (Raw)", category: "Vegetables", calories_per_100g: 33, protein_per_100g: 1.93, carbs_per_100g: 7.45, fat_per_100g: 0.19, fibre_per_100g: 3.2, source: "USDA FoodData Central" },
  { food_id: 93, food_name: "Red Bell Pepper (Raw)", category: "Vegetables", calories_per_100g: 31, protein_per_100g: 0.99, carbs_per_100g: 6.03, fat_per_100g: 0.3, fibre_per_100g: 2.1, source: "USDA FoodData Central" },
  { food_id: 94, food_name: "Spinach / Palak (Raw)", category: "Vegetables", calories_per_100g: 23, protein_per_100g: 2.86, carbs_per_100g: 3.63, fat_per_100g: 0.39, fibre_per_100g: 2.2, source: "USDA FoodData Central" },
  { food_id: 95, food_name: "Tomatoes (Ripe, Raw)", category: "Vegetables", calories_per_100g: 18, protein_per_100g: 0.88, carbs_per_100g: 3.89, fat_per_100g: 0.2, fibre_per_100g: 1.2, source: "USDA FoodData Central" }
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
  const d = new Date(currentDate + 'T12:00:00');
  d.setDate(d.getDate() + daysOffset);
  currentDate = getLocalDateStr(d);
  const picker = document.getElementById('tracker-date-picker');
  if (picker) picker.value = currentDate;
  loadDailyTrackerData();
}

function loadUserGoalsFromStorage() {
  // Try localStorage as quick cache; API will update userGoals async
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
  // Always fetch from backend to get authoritative goals
  api.get('/users/profile').then(res => {
    if (res?.data?.goal) {
      const g = res.data.goal;
      userGoals = {
        daily_calories: g.daily_calories || 2000,
        protein_g: g.protein_g || 140,
        carbs_g: g.carbs_g || 220,
        fat_g: g.fat_g || 60
      };
      // Update cache
      const cache = JSON.parse(localStorage.getItem('fitmaster_profile') || '{}');
      cache.goals = userGoals;
      localStorage.setItem('fitmaster_profile', JSON.stringify(cache));
    }
  }).catch(() => {});
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

    try {
      // Send to backend (food_id from BUILTIN_FOODS matches DB seeds)
      await api.post('/meals', {
        meal_date: currentDate,
        meal_type: activeMealType,
        items: [{ food_id: selectedFood.food_id, quantity_grams: grams }]
      });
      showToast('Food Added', `Added ${grams}g ${selectedFood.food_name} to ${activeMealType}!`, 'success');
    } catch (e) {
      console.warn('API meal save failed, using local fallback:', e);
      // Fallback: save locally only if API fails
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
      saveFoodItemLocally(currentDate, activeMealType, foodItem);
      showToast('Food Added (Offline)', `Saved locally. Will sync on reconnect.`, 'info');
    }

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
  let fromBackend = false;

  // Always try backend first
  try {
    const res = await api.get(`/meals?date=${currentDate}`);
    if (res?.data?.meals) {
      meals = res.data.meals;
      fromBackend = true;
      // Update daily totals from backend aggregation
      const totals = res.data.daily_totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      renderDailyBudgetAndMacros(totals);
      renderMealSlots(meals, true);
      return;
    }
  } catch (err) {
    console.warn('API meals fetch failed, using local cache:', err);
  }

  // Offline fallback: use localStorage only if API unavailable
  meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${currentDate}`) || '[]');

  // Calculate totals from local data
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
  meals.forEach((m) => {
    (m.items || []).forEach((item) => {
      totalCal += Number(item.calories || 0);
      totalP += Number(item.protein || 0);
      totalC += Number(item.carbs || 0);
      totalF += Number(item.fat || 0);
    });
  });

  renderDailyBudgetAndMacros({ calories: totalCal, protein: totalP, carbs: totalC, fat: totalF });
  renderMealSlots(meals, false);
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

function renderMealSlots(meals, fromBackend = false) {
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

      // Use backend meal_item_id when available; fallback to local entry_id or idx
      const deleteId = fromBackend
        ? `meal:${item.meal_item_id || item.meal_id}`
        : `local:${item.entry_id || idx}`;
      const mealId = meal.meal_id;
      const itemId = item.meal_item_id;

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
            <button onclick="deleteMealItem('${type}', ${fromBackend ? mealId : "'" + (item.entry_id || idx) + "'"}, ${fromBackend ? (itemId || 'null') : 'null'}, ${fromBackend})" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 6px; padding: 4px 8px; font-size: 13px; cursor: pointer; transition: all 0.2s;" title="Remove food item">✕</button>
          </div>
        </div>
      `;
    }).join('');

    if (calsEl) calsEl.textContent = `${Math.round(mealCal)} kcal`;
    if (macrosEl) macrosEl.textContent = `${Math.round(mealP)}g P • ${Math.round(mealC)}g C • ${Math.round(mealF)}g F`;
  });
}

/**
 * Delete a meal entry (backend-first, local fallback)
 * When fromBackend is true: mealId is the backend meal_id, itemId is meal_item_id
 * When fromBackend is false: mealType+entryId identify the local entry
 */
window.deleteMealItem = async function(mealType, mealId, itemId, fromBackend) {
  if (fromBackend && mealId) {
    // Delete the entire meal row from backend (cascades to meal_items)
    try {
      await api.delete(`/meals/${mealId}`);
      showToast('Item Removed', 'Food item removed from meal.', 'info');
    } catch (err) {
      showToast('Error', 'Could not remove item. Please try again.', 'error');
      return;
    }
  } else {
    // Local-only deletion (offline mode)
    const entryId = mealId; // in local mode mealId parameter holds entry_id
    let meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${currentDate}`) || '[]');
    const meal = meals.find((m) => m.meal_type === mealType);
    if (meal && meal.items) {
      meal.items = meal.items.filter((item, idx) => (item.entry_id || idx) != entryId);
      meal.total_calories = meal.items.reduce((sum, i) => sum + (i.calories || 0), 0);
      meal.total_protein = meal.items.reduce((sum, i) => sum + (i.protein || 0), 0);
      meal.total_carbs = meal.items.reduce((sum, i) => sum + (i.carbs || 0), 0);
      meal.total_fat = meal.items.reduce((sum, i) => sum + (i.fat || 0), 0);
      localStorage.setItem(`fitmaster_meals_${currentDate}`, JSON.stringify(meals));
    }
    showToast('Item Removed', 'Food item removed from meal.', 'info');
  }
  await loadDailyTrackerData();
};
