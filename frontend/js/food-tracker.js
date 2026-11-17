/**
 * FitMaster AI – Interactive Food & Nutrition Tracker Client Logic
 * Features: meal-specific suggestions, full DB search, custom food CRUD,
 * nutrition estimation, My Foods tab, real-time macro updates.
 */

// ─── Timezone-safe local date ─────────────────────────────────────────────────
function getLocalDateStr(d) {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

// ─── State ────────────────────────────────────────────────────────────────────
let currentDate    = getLocalDateStr();
let goalsRequestId = 0;
let activeMealType = 'breakfast';
let selectedFood   = null;         // { food_id|custom_food_id, food_name, ... per-100g data, isCustom }
let userGoals      = { daily_calories: 2000, protein_g: 140, carbs_g: 220, fat_g: 60 };
let activeCategory = '';
let activeTab      = 'suggestions';
let myCustomFoods  = [];           // cached list of user's custom foods

// ─── Built-in Verified Nutrient Databank (per 100g) — synced with DB food_ids 1–95 ───
const BUILTIN_FOODS = [
  { food_id: 1,  food_name: "Almond Milk, Unsweetened",           category: "Dairy & Alternatives", calories_per_100g: 15,  protein_per_100g: 0.55,  carbs_per_100g: 0.34,  fat_per_100g: 1.1,   fibre_per_100g: 0.2,  source: "USDA FoodData Central" },
  { food_id: 2,  food_name: "Buffalo Milk, Fluid",                category: "Dairy & Alternatives", calories_per_100g: 97,  protein_per_100g: 3.75,  carbs_per_100g: 5.18,  fat_per_100g: 6.87,  fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 3,  food_name: "Buttermilk, Traditional (Chaas)",    category: "Dairy & Alternatives", calories_per_100g: 28,  protein_per_100g: 1.8,   carbs_per_100g: 3.1,   fat_per_100g: 0.9,   fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 4,  food_name: "Cheddar Cheese",                     category: "Dairy & Alternatives", calories_per_100g: 403, protein_per_100g: 24.9,  carbs_per_100g: 1.28,  fat_per_100g: 33.14, fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 5,  food_name: "Curd / Dahi (Cow Milk)",             category: "Dairy & Alternatives", calories_per_100g: 60,  protein_per_100g: 3.2,   carbs_per_100g: 4.4,   fat_per_100g: 3.2,   fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 6,  food_name: "Greek Yogurt (Nonfat, Plain)",        category: "Dairy & Alternatives", calories_per_100g: 59,  protein_per_100g: 10.19, carbs_per_100g: 3.6,   fat_per_100g: 0.39,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 7,  food_name: "Low-Fat Paneer",                      category: "Dairy & Alternatives", calories_per_100g: 173, protein_per_100g: 25,    carbs_per_100g: 4.5,   fat_per_100g: 5.5,   fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 8,  food_name: "Mozzarella Cheese",                   category: "Dairy & Alternatives", calories_per_100g: 300, protein_per_100g: 22.17, carbs_per_100g: 2.19,  fat_per_100g: 22.35, fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 9,  food_name: "Paneer (Indian Cottage Cheese)",       category: "Dairy & Alternatives", calories_per_100g: 296, protein_per_100g: 18.3,  carbs_per_100g: 3.4,   fat_per_100g: 22.8,  fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 10, food_name: "Skimmed Milk",                        category: "Dairy & Alternatives", calories_per_100g: 35,  protein_per_100g: 3.4,   carbs_per_100g: 5,     fat_per_100g: 0.1,   fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 11, food_name: "Whole Milk (Cow)",                    category: "Dairy & Alternatives", calories_per_100g: 61,  protein_per_100g: 3.15,  carbs_per_100g: 4.8,   fat_per_100g: 3.25,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 12, food_name: "Atlantic Salmon (Baked)",             category: "Fish & Seafood",        calories_per_100g: 182, protein_per_100g: 25.44, carbs_per_100g: 0,     fat_per_100g: 8.13,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 13, food_name: "Canned Tuna (in Water)",              category: "Fish & Seafood",        calories_per_100g: 116, protein_per_100g: 25.51, carbs_per_100g: 0,     fat_per_100g: 0.82,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 14, food_name: "Pomfret, Silver, Cooked",             category: "Fish & Seafood",        calories_per_100g: 136, protein_per_100g: 20.4,  carbs_per_100g: 0,     fat_per_100g: 5.6,   fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 15, food_name: "Rohu (Carp), Meat Only, Cooked",      category: "Fish & Seafood",        calories_per_100g: 127, protein_per_100g: 21.8,  carbs_per_100g: 0,     fat_per_100g: 3.9,   fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 16, food_name: "Shrimp / Prawns (Steamed)",           category: "Fish & Seafood",        calories_per_100g: 99,  protein_per_100g: 24,    carbs_per_100g: 0.2,   fat_per_100g: 0.28,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 17, food_name: "Tilapia Fillet (Cooked)",             category: "Fish & Seafood",        calories_per_100g: 128, protein_per_100g: 26.15, carbs_per_100g: 0,     fat_per_100g: 2.65,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 18, food_name: "Apple (with skin, Raw)",              category: "Fruits",                calories_per_100g: 52,  protein_per_100g: 0.26,  carbs_per_100g: 13.81, fat_per_100g: 0.17,  fibre_per_100g: 2.4,  source: "USDA FoodData Central" },
  { food_id: 19, food_name: "Banana (Raw)",                        category: "Fruits",                calories_per_100g: 89,  protein_per_100g: 1.09,  carbs_per_100g: 22.84, fat_per_100g: 0.33,  fibre_per_100g: 2.6,  source: "USDA FoodData Central" },
  { food_id: 20, food_name: "Blueberries (Raw)",                   category: "Fruits",                calories_per_100g: 57,  protein_per_100g: 0.74,  carbs_per_100g: 14.49, fat_per_100g: 0.33,  fibre_per_100g: 2.4,  source: "USDA FoodData Central" },
  { food_id: 21, food_name: "Grapes (Raw)",                        category: "Fruits",                calories_per_100g: 69,  protein_per_100g: 0.72,  carbs_per_100g: 18.1,  fat_per_100g: 0.16,  fibre_per_100g: 0.9,  source: "USDA FoodData Central" },
  { food_id: 22, food_name: "Guava / Amrood (Raw)",                category: "Fruits",                calories_per_100g: 68,  protein_per_100g: 2.55,  carbs_per_100g: 14.32, fat_per_100g: 0.95,  fibre_per_100g: 5.4,  source: "USDA FoodData Central" },
  { food_id: 23, food_name: "Mango (Ripe, Raw)",                   category: "Fruits",                calories_per_100g: 60,  protein_per_100g: 0.82,  carbs_per_100g: 14.98, fat_per_100g: 0.38,  fibre_per_100g: 1.6,  source: "USDA FoodData Central" },
  { food_id: 24, food_name: "Orange (Navel, Raw)",                 category: "Fruits",                calories_per_100g: 47,  protein_per_100g: 0.94,  carbs_per_100g: 11.75, fat_per_100g: 0.12,  fibre_per_100g: 2.4,  source: "USDA FoodData Central" },
  { food_id: 25, food_name: "Papaya (Raw)",                        category: "Fruits",                calories_per_100g: 43,  protein_per_100g: 0.47,  carbs_per_100g: 10.82, fat_per_100g: 0.26,  fibre_per_100g: 1.7,  source: "USDA FoodData Central" },
  { food_id: 26, food_name: "Pineapple, Raw",                      category: "Fruits",                calories_per_100g: 50,  protein_per_100g: 0.54,  carbs_per_100g: 13.12, fat_per_100g: 0.12,  fibre_per_100g: 1.4,  source: "USDA FoodData Central" },
  { food_id: 27, food_name: "Pomegranate / Anar (Raw)",            category: "Fruits",                calories_per_100g: 83,  protein_per_100g: 1.67,  carbs_per_100g: 18.7,  fat_per_100g: 1.17,  fibre_per_100g: 4,    source: "USDA FoodData Central" },
  { food_id: 28, food_name: "Strawberries (Raw)",                  category: "Fruits",                calories_per_100g: 32,  protein_per_100g: 0.67,  carbs_per_100g: 7.68,  fat_per_100g: 0.3,   fibre_per_100g: 2,    source: "USDA FoodData Central" },
  { food_id: 29, food_name: "Watermelon (Raw)",                    category: "Fruits",                calories_per_100g: 30,  protein_per_100g: 0.61,  carbs_per_100g: 7.55,  fat_per_100g: 0.15,  fibre_per_100g: 0.4,  source: "USDA FoodData Central" },
  { food_id: 30, food_name: "Barley, Pearled, Cooked",             category: "Grains & Cereals",      calories_per_100g: 123, protein_per_100g: 2.26,  carbs_per_100g: 28.22, fat_per_100g: 0.44,  fibre_per_100g: 3.8,  source: "USDA FoodData Central" },
  { food_id: 31, food_name: "Basmati Rice, Cooked",                category: "Grains & Cereals",      calories_per_100g: 130, protein_per_100g: 2.7,   carbs_per_100g: 28.2,  fat_per_100g: 0.3,   fibre_per_100g: 0.4,  source: "Indian Nutrient Databank" },
  { food_id: 32, food_name: "Brown Rice (Cooked)",                 category: "Grains & Cereals",      calories_per_100g: 123, protein_per_100g: 2.74,  carbs_per_100g: 25.58, fat_per_100g: 0.97,  fibre_per_100g: 1.6,  source: "USDA FoodData Central" },
  { food_id: 33, food_name: "Finger Millet (Ragi), Whole Grain, Raw", category: "Grains & Cereals",  calories_per_100g: 328, protein_per_100g: 7.3,   carbs_per_100g: 72,    fat_per_100g: 1.3,   fibre_per_100g: 11.5, source: "Indian Nutrient Databank" },
  { food_id: 34, food_name: "Pearl Millet (Bajra), Whole Grain, Raw", category: "Grains & Cereals",  calories_per_100g: 361, protein_per_100g: 11.6,  carbs_per_100g: 67.5,  fat_per_100g: 5,     fibre_per_100g: 11.3, source: "Indian Nutrient Databank" },
  { food_id: 35, food_name: "Quinoa (Cooked)",                     category: "Grains & Cereals",      calories_per_100g: 120, protein_per_100g: 4.4,   carbs_per_100g: 21.3,  fat_per_100g: 1.92,  fibre_per_100g: 2.8,  source: "USDA FoodData Central" },
  { food_id: 36, food_name: "Rolled Oats (Raw)",                   category: "Grains & Cereals",      calories_per_100g: 379, protein_per_100g: 13.15, carbs_per_100g: 67.7,  fat_per_100g: 6.52,  fibre_per_100g: 10.1, source: "USDA FoodData Central" },
  { food_id: 37, food_name: "Semolina (Suji), Raw",                category: "Grains & Cereals",      calories_per_100g: 360, protein_per_100g: 12.7,  carbs_per_100g: 72.8,  fat_per_100g: 1.05,  fibre_per_100g: 3.9,  source: "Indian Nutrient Databank" },
  { food_id: 38, food_name: "Sorghum (Jowar), Whole Grain, Raw",   category: "Grains & Cereals",      calories_per_100g: 349, protein_per_100g: 10.4,  carbs_per_100g: 72.6,  fat_per_100g: 1.9,   fibre_per_100g: 9.7,  source: "Indian Nutrient Databank" },
  { food_id: 39, food_name: "White Bread",                         category: "Grains & Cereals",      calories_per_100g: 266, protein_per_100g: 8.85,  carbs_per_100g: 49.42, fat_per_100g: 3.33,  fibre_per_100g: 2.7,  source: "USDA FoodData Central" },
  { food_id: 40, food_name: "White Rice (Parboiled, Cooked)",      category: "Grains & Cereals",      calories_per_100g: 130, protein_per_100g: 2.69,  carbs_per_100g: 28.17, fat_per_100g: 0.28,  fibre_per_100g: 0.4,  source: "USDA FoodData Central" },
  { food_id: 41, food_name: "Whole Wheat Bread",                   category: "Grains & Cereals",      calories_per_100g: 247, protein_per_100g: 12.96, carbs_per_100g: 41.27, fat_per_100g: 3.42,  fibre_per_100g: 6,    source: "USDA FoodData Central" },
  { food_id: 42, food_name: "Whole Wheat Pasta (Cooked)",          category: "Grains & Cereals",      calories_per_100g: 124, protein_per_100g: 5.33,  carbs_per_100g: 26.54, fat_per_100g: 0.54,  fibre_per_100g: 3.9,  source: "USDA FoodData Central" },
  { food_id: 43, food_name: "Whole Wheat Roti / Chapati",          category: "Grains & Cereals",      calories_per_100g: 297, protein_per_100g: 9.8,   carbs_per_100g: 52.3,  fat_per_100g: 4.2,   fibre_per_100g: 9.6,  source: "Indian Nutrient Databank" },
  { food_id: 44, food_name: "Bengal Gram Dal (Chana Dal), Cooked", category: "Legumes & Pulses",      calories_per_100g: 138, protein_per_100g: 9.2,   carbs_per_100g: 22.4,  fat_per_100g: 1.4,   fibre_per_100g: 7.8,  source: "Indian Nutrient Databank" },
  { food_id: 45, food_name: "Black Beans (Cooked)",                category: "Legumes & Pulses",      calories_per_100g: 132, protein_per_100g: 8.86,  carbs_per_100g: 23.71, fat_per_100g: 0.54,  fibre_per_100g: 8.7,  source: "USDA FoodData Central" },
  { food_id: 46, food_name: "Black Gram Dal (Urad), Cooked",       category: "Legumes & Pulses",      calories_per_100g: 130, protein_per_100g: 9.4,   carbs_per_100g: 21.8,  fat_per_100g: 0.5,   fibre_per_100g: 7.5,  source: "Indian Nutrient Databank" },
  { food_id: 47, food_name: "Black-Eyed Peas / Lobia (Cooked)",   category: "Legumes & Pulses",      calories_per_100g: 116, protein_per_100g: 7.73,  carbs_per_100g: 21.25, fat_per_100g: 0.53,  fibre_per_100g: 6.5,  source: "USDA FoodData Central" },
  { food_id: 48, food_name: "Chickpeas / Chana (Cooked)",          category: "Legumes & Pulses",      calories_per_100g: 164, protein_per_100g: 8.86,  carbs_per_100g: 27.42, fat_per_100g: 2.59,  fibre_per_100g: 7.6,  source: "USDA FoodData Central" },
  { food_id: 49, food_name: "Edamame, Frozen, Prepared",           category: "Legumes & Pulses",      calories_per_100g: 121, protein_per_100g: 11.91, carbs_per_100g: 8.91,  fat_per_100g: 5.2,   fibre_per_100g: 5.2,  source: "USDA FoodData Central" },
  { food_id: 50, food_name: "Firm Tofu",                           category: "Legumes & Pulses",      calories_per_100g: 76,  protein_per_100g: 8.08,  carbs_per_100g: 1.87,  fat_per_100g: 4.78,  fibre_per_100g: 0.3,  source: "USDA FoodData Central" },
  { food_id: 51, food_name: "Kidney Beans / Rajma (Cooked)",       category: "Legumes & Pulses",      calories_per_100g: 127, protein_per_100g: 8.67,  carbs_per_100g: 22.8,  fat_per_100g: 0.5,   fibre_per_100g: 6.4,  source: "USDA FoodData Central" },
  { food_id: 52, food_name: "Moong Sprouts, Raw",                  category: "Legumes & Pulses",      calories_per_100g: 30,  protein_per_100g: 3.04,  carbs_per_100g: 5.94,  fat_per_100g: 0.18,  fibre_per_100g: 1.8,  source: "Indian Nutrient Databank" },
  { food_id: 53, food_name: "Red Gram Dal (Toor/Arhar), Cooked",   category: "Legumes & Pulses",      calories_per_100g: 124, protein_per_100g: 8.6,   carbs_per_100g: 21.5,  fat_per_100g: 0.4,   fibre_per_100g: 7.2,  source: "Indian Nutrient Databank" },
  { food_id: 54, food_name: "Red Lentil Dal (Masoor), Cooked",     category: "Legumes & Pulses",      calories_per_100g: 116, protein_per_100g: 9,     carbs_per_100g: 20,    fat_per_100g: 0.4,   fibre_per_100g: 7.9,  source: "Indian Nutrient Databank" },
  { food_id: 55, food_name: "Soybeans (Boiled)",                   category: "Legumes & Pulses",      calories_per_100g: 172, protein_per_100g: 18.2,  carbs_per_100g: 8.4,   fat_per_100g: 8.9,   fibre_per_100g: 6,    source: "USDA FoodData Central" },
  { food_id: 56, food_name: "Soymilk, Original And Vanilla, Unfortified", category: "Legumes & Pulses", calories_per_100g: 54, protein_per_100g: 3.27,  carbs_per_100g: 6.28, fat_per_100g: 1.75, fibre_per_100g: 0.6,  source: "USDA FoodData Central" },
  { food_id: 57, food_name: "Yellow Lentil Dal (Moong), Cooked",   category: "Legumes & Pulses",      calories_per_100g: 116, protein_per_100g: 9.02,  carbs_per_100g: 20.13, fat_per_100g: 0.38,  fibre_per_100g: 7.9,  source: "Indian Nutrient Databank" },
  { food_id: 58, food_name: "Almonds (Raw)",                       category: "Nuts & Seeds",          calories_per_100g: 579, protein_per_100g: 21.15, carbs_per_100g: 21.55, fat_per_100g: 49.93, fibre_per_100g: 12.5, source: "USDA FoodData Central" },
  { food_id: 59, food_name: "Cashew Nuts (Raw)",                   category: "Nuts & Seeds",          calories_per_100g: 553, protein_per_100g: 18.22, carbs_per_100g: 30.19, fat_per_100g: 43.85, fibre_per_100g: 3.3,  source: "USDA FoodData Central" },
  { food_id: 60, food_name: "Chia Seeds (Dried)",                  category: "Nuts & Seeds",          calories_per_100g: 486, protein_per_100g: 16.54, carbs_per_100g: 42.12, fat_per_100g: 30.74, fibre_per_100g: 34.4, source: "USDA FoodData Central" },
  { food_id: 61, food_name: "Flax Seeds",                          category: "Nuts & Seeds",          calories_per_100g: 534, protein_per_100g: 18.29, carbs_per_100g: 28.88, fat_per_100g: 42.16, fibre_per_100g: 27.3, source: "USDA FoodData Central" },
  { food_id: 62, food_name: "Natural Peanut Butter",               category: "Nuts & Seeds",          calories_per_100g: 588, protein_per_100g: 25.09, carbs_per_100g: 20.08, fat_per_100g: 50.39, fibre_per_100g: 6,    source: "USDA FoodData Central" },
  { food_id: 63, food_name: "Peanuts (Roasted, Unsalted)",         category: "Nuts & Seeds",          calories_per_100g: 585, protein_per_100g: 23.68, carbs_per_100g: 21.51, fat_per_100g: 49.66, fibre_per_100g: 8,    source: "USDA FoodData Central" },
  { food_id: 64, food_name: "Pistachio Nuts (Raw)",                category: "Nuts & Seeds",          calories_per_100g: 560, protein_per_100g: 20.16, carbs_per_100g: 27.17, fat_per_100g: 45.32, fibre_per_100g: 10.6, source: "USDA FoodData Central" },
  { food_id: 65, food_name: "Pumpkin Seeds (Roasted)",             category: "Nuts & Seeds",          calories_per_100g: 574, protein_per_100g: 29.84, carbs_per_100g: 14.71, fat_per_100g: 49.05, fibre_per_100g: 6.5,  source: "USDA FoodData Central" },
  { food_id: 66, food_name: "Walnuts (Raw)",                       category: "Nuts & Seeds",          calories_per_100g: 654, protein_per_100g: 15.23, carbs_per_100g: 13.71, fat_per_100g: 65.21, fibre_per_100g: 6.7,  source: "USDA FoodData Central" },
  { food_id: 67, food_name: "Coconut Oil",                         category: "Oils & Fats",           calories_per_100g: 862, protein_per_100g: 0,     carbs_per_100g: 0,     fat_per_100g: 100,   fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 68, food_name: "Cow Ghee (Clarified Butter)",         category: "Oils & Fats",           calories_per_100g: 876, protein_per_100g: 0.28,  carbs_per_100g: 0,     fat_per_100g: 99.48, fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 69, food_name: "Extra Virgin Olive Oil",              category: "Oils & Fats",           calories_per_100g: 884, protein_per_100g: 0,     carbs_per_100g: 0,     fat_per_100g: 100,   fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 70, food_name: "Mustard Oil (Pure)",                  category: "Oils & Fats",           calories_per_100g: 884, protein_per_100g: 0,     carbs_per_100g: 0,     fat_per_100g: 100,   fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 71, food_name: "Chicken Breast (Skinless, Grilled)",  category: "Poultry & Meat",        calories_per_100g: 165, protein_per_100g: 31.02, carbs_per_100g: 0,     fat_per_100g: 3.57,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 72, food_name: "Chicken Drumstick (Cooked)",          category: "Poultry & Meat",        calories_per_100g: 191, protein_per_100g: 28.3,  carbs_per_100g: 0,     fat_per_100g: 7.85,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 73, food_name: "Chicken Thigh (Skinless, Roasted)",   category: "Poultry & Meat",        calories_per_100g: 209, protein_per_100g: 25.97, carbs_per_100g: 0,     fat_per_100g: 10.88, fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 74, food_name: "Egg White (Boiled)",                  category: "Poultry & Meat",        calories_per_100g: 52,  protein_per_100g: 10.9,  carbs_per_100g: 0.73,  fat_per_100g: 0.17,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 75, food_name: "Lean Ground Beef (90/10 Cooked)",     category: "Poultry & Meat",        calories_per_100g: 217, protein_per_100g: 26.1,  carbs_per_100g: 0,     fat_per_100g: 11.83, fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 76, food_name: "Mutton / Goat, Lean, Cooked",         category: "Poultry & Meat",        calories_per_100g: 143, protein_per_100g: 27.1,  carbs_per_100g: 0,     fat_per_100g: 3.03,  fibre_per_100g: 0,    source: "Indian Nutrient Databank" },
  { food_id: 77, food_name: "Turkey Breast (Roasted)",             category: "Poultry & Meat",        calories_per_100g: 135, protein_per_100g: 30.06, carbs_per_100g: 0,     fat_per_100g: 0.74,  fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 78, food_name: "Whole Egg (Hard-Boiled)",             category: "Poultry & Meat",        calories_per_100g: 155, protein_per_100g: 12.58, carbs_per_100g: 1.12,  fat_per_100g: 10.61, fibre_per_100g: 0,    source: "USDA FoodData Central" },
  { food_id: 79, food_name: "Beetroot (Raw)",                      category: "Vegetables",            calories_per_100g: 43,  protein_per_100g: 1.61,  carbs_per_100g: 9.56,  fat_per_100g: 0.17,  fibre_per_100g: 2.8,  source: "USDA FoodData Central" },
  { food_id: 80, food_name: "Bitter Gourd / Karela (Raw)",         category: "Vegetables",            calories_per_100g: 17,  protein_per_100g: 1,     carbs_per_100g: 3.7,   fat_per_100g: 0.2,   fibre_per_100g: 2.8,  source: "Indian Nutrient Databank" },
  { food_id: 81, food_name: "Bottle Gourd / Lauki (Raw)",          category: "Vegetables",            calories_per_100g: 14,  protein_per_100g: 0.6,   carbs_per_100g: 3.4,   fat_per_100g: 0.1,   fibre_per_100g: 1.2,  source: "Indian Nutrient Databank" },
  { food_id: 82, food_name: "Broccoli (Steamed)",                  category: "Vegetables",            calories_per_100g: 35,  protein_per_100g: 2.38,  carbs_per_100g: 7.18,  fat_per_100g: 0.41,  fibre_per_100g: 3.3,  source: "USDA FoodData Central" },
  { food_id: 83, food_name: "Button Mushrooms (Raw)",              category: "Vegetables",            calories_per_100g: 22,  protein_per_100g: 3.09,  carbs_per_100g: 3.26,  fat_per_100g: 0.34,  fibre_per_100g: 1,    source: "USDA FoodData Central" },
  { food_id: 84, food_name: "Cabbage, Raw",                        category: "Vegetables",            calories_per_100g: 25,  protein_per_100g: 1.28,  carbs_per_100g: 5.8,   fat_per_100g: 0.1,   fibre_per_100g: 2.5,  source: "USDA FoodData Central" },
  { food_id: 85, food_name: "Carrots (Raw)",                       category: "Vegetables",            calories_per_100g: 41,  protein_per_100g: 0.93,  carbs_per_100g: 9.58,  fat_per_100g: 0.24,  fibre_per_100g: 2.8,  source: "USDA FoodData Central" },
  { food_id: 86, food_name: "Cauliflower / Gobi (Cooked)",         category: "Vegetables",            calories_per_100g: 23,  protein_per_100g: 1.84,  carbs_per_100g: 4.11,  fat_per_100g: 0.45,  fibre_per_100g: 2.3,  source: "USDA FoodData Central" },
  { food_id: 87, food_name: "Cucumber (Raw)",                      category: "Vegetables",            calories_per_100g: 15,  protein_per_100g: 0.65,  carbs_per_100g: 3.63,  fat_per_100g: 0.11,  fibre_per_100g: 0.5,  source: "USDA FoodData Central" },
  { food_id: 88, food_name: "Fenugreek Leaves / Methi (Raw)",      category: "Vegetables",            calories_per_100g: 49,  protein_per_100g: 4.4,   carbs_per_100g: 6,     fat_per_100g: 0.9,   fibre_per_100g: 3.2,  source: "Indian Nutrient Databank" },
  { food_id: 89, food_name: "Green Bell Pepper / Capsicum (Raw)",  category: "Vegetables",            calories_per_100g: 20,  protein_per_100g: 0.86,  carbs_per_100g: 4.64,  fat_per_100g: 0.17,  fibre_per_100g: 1.7,  source: "USDA FoodData Central" },
  { food_id: 90, food_name: "Green Peas (Boiled)",                 category: "Vegetables",            calories_per_100g: 84,  protein_per_100g: 5.36,  carbs_per_100g: 15.63, fat_per_100g: 0.22,  fibre_per_100g: 5.5,  source: "USDA FoodData Central" },
  { food_id: 91, food_name: "Mustard Greens / Sarson (Raw)",       category: "Vegetables",            calories_per_100g: 27,  protein_per_100g: 2.7,   carbs_per_100g: 4.7,   fat_per_100g: 0.4,   fibre_per_100g: 3.2,  source: "Indian Nutrient Databank" },
  { food_id: 92, food_name: "Okra / Bhindi (Raw)",                 category: "Vegetables",            calories_per_100g: 33,  protein_per_100g: 1.93,  carbs_per_100g: 7.45,  fat_per_100g: 0.19,  fibre_per_100g: 3.2,  source: "USDA FoodData Central" },
  { food_id: 93, food_name: "Red Bell Pepper (Raw)",               category: "Vegetables",            calories_per_100g: 31,  protein_per_100g: 0.99,  carbs_per_100g: 6.03,  fat_per_100g: 0.3,   fibre_per_100g: 2.1,  source: "USDA FoodData Central" },
  { food_id: 94, food_name: "Spinach / Palak (Raw)",               category: "Vegetables",            calories_per_100g: 23,  protein_per_100g: 2.86,  carbs_per_100g: 3.63,  fat_per_100g: 0.39,  fibre_per_100g: 2.2,  source: "USDA FoodData Central" },
  { food_id: 95, food_name: "Tomatoes (Ripe, Raw)",                category: "Vegetables",            calories_per_100g: 18,  protein_per_100g: 0.88,  carbs_per_100g: 3.89,  fat_per_100g: 0.2,   fibre_per_100g: 1.2,  source: "USDA FoodData Central" }
];

// ─── Meal-specific suggestion mappings (food_ids from BUILTIN_FOODS) ──────────
const MEAL_SUGGESTIONS = {
  breakfast: [78, 36, 19, 11, 41, 62, 43, 39, 74, 37],  // Eggs, Oats, Banana, Milk, WW Bread, PB, Chapati, White Bread, Egg White, Suji
  lunch:     [40, 31, 43, 57, 71, 9, 5, 82, 85, 53, 44], // Rice, Basmati, Chapati, Moong Dal, Chicken, Paneer, Curd, Broccoli, Carrots, Toor Dal, Chana Dal
  dinner:    [43, 40, 71, 9, 54, 12, 82, 90, 15, 76],    // Chapati, Rice, Chicken, Paneer, Masoor Dal, Salmon, Broccoli, Peas, Rohu, Mutton
  snacks:    [18, 19, 58, 63, 6, 48, 36, 22, 28, 60]     // Apple, Banana, Almonds, Peanuts, Greek Yogurt, Chana, Oats, Guava, Strawberries, Chia
};

// ─── Initialisation ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const datePicker = document.getElementById('tracker-date-picker');
  if (datePicker) {
    datePicker.value = currentDate;
    datePicker.addEventListener('change', async (e) => {
      currentDate = e.target.value;
      const requestedDate = currentDate;
      await loadUserGoalsFromStorage(requestedDate);
      if (currentDate === requestedDate) await loadDailyTrackerData();
    });
  }

  document.getElementById('prev-day-btn')?.addEventListener('click', () => changeDate(-1));
  document.getElementById('next-day-btn')?.addEventListener('click', () => changeDate(1));

  // Add Food buttons on each meal slot
  document.querySelectorAll('.add-food-btn').forEach(btn => {
    btn.addEventListener('click', () => openFoodSearchModal(btn.dataset.meal));
  });

  setupModalListeners();
  await loadUserGoalsFromStorage(currentDate);
  await loadDailyTrackerData();
});

async function changeDate(daysOffset) {
  const d = new Date(currentDate + 'T12:00:00');
  d.setDate(d.getDate() + daysOffset);
  currentDate = getLocalDateStr(d);
  const picker = document.getElementById('tracker-date-picker');
  if (picker) picker.value = currentDate;
  const requestedDate = currentDate;
  await loadUserGoalsFromStorage(requestedDate);
  if (currentDate === requestedDate) await loadDailyTrackerData();
}

async function loadUserGoalsFromStorage(date) {
  const requestId = ++goalsRequestId;
  const savedProfile = localStorage.getItem('fitmaster_profile');
  if (savedProfile) {
    try {
      const p = JSON.parse(savedProfile);
      if (p.goals) {
        userGoals = {
          daily_calories: p.goals.daily_calories || 2000,
          protein_g:      p.goals.protein_g      || 140,
          carbs_g:        p.goals.carbs_g        || 220,
          fat_g:          p.goals.fat_g          || 60
        };
      }
    } catch (e) {}
  }
  try {
    const res = await api.get(`/users/profile${date ? `?date=${encodeURIComponent(date)}` : ''}`);
    if (res?.data?.goal) {
      const g = res.data.goal;
      if (requestId !== goalsRequestId) return;
      userGoals = {
        daily_calories: g.daily_calories,
        protein_g: g.protein_g,
        carbs_g: g.carbs_g,
        fat_g: g.fat_g
      };
      const cache = JSON.parse(localStorage.getItem('fitmaster_profile') || '{}');
      if (!date || date === getLocalDateStr()) cache.goals = userGoals;
      localStorage.setItem('fitmaster_profile', JSON.stringify(cache));
    }
  } catch {
    // Keep the last cached goals for offline use.
  }
}

// ─── Modal Open / Close ───────────────────────────────────────────────────────
window.openFoodSearchModal = function(mealType) {
  activeMealType = mealType;
  const modal = document.getElementById('food-search-modal');
  const title = document.getElementById('modal-meal-name');
  if (title) title.textContent = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  // Reset state
  selectedFood = null;
  activeCategory = '';
  document.getElementById('serving-calculator').style.display = 'none';
  document.getElementById('confirm-add-food-btn').disabled = true;
  document.getElementById('serving-grams-input').value = 100;

  // Open on Suggestions tab
  switchTab('suggestions');
  renderSuggestions(mealType);

  if (modal) modal.classList.add('active');
};

window.closeModal = function() {
  const modal = document.getElementById('food-search-modal');
  if (modal) modal.classList.remove('active');
  selectedFood = null;
};

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  // On switching to My Foods, refresh list
  if (tabName === 'myfoods') {
    loadMyFoods();
  }
  // On switching to search, initialise with empty query
  if (tabName === 'search') {
    executeFoodSearch(document.getElementById('food-search-input')?.value || '');
  }

  // Hide serving calculator when switching away from a food selection context
  // but keep it if selectedFood is still set and user is on search/suggestions tab
  if (tabName === 'custom') {
    document.getElementById('serving-calculator').style.display = 'none';
    document.getElementById('confirm-add-food-btn').disabled = true;
  }
}

// ─── Meal Suggestions Tab ────────────────────────────────────────────────────
function renderSuggestions(mealType) {
  const container = document.getElementById('suggestion-chips');
  if (!container) return;

  const ids = MEAL_SUGGESTIONS[mealType] || [];
  const foods = ids.map(id => BUILTIN_FOODS.find(f => f.food_id === id)).filter(Boolean);

  if (foods.length === 0) {
    container.innerHTML = `<div style="color: var(--text-dim); padding: 16px;">No suggestions available.</div>`;
    return;
  }

  container.innerHTML = '';
  foods.forEach(food => {
    const chip = document.createElement('div');
    chip.className = 'suggestion-chip';
    chip.innerHTML = `
      <div class="suggestion-chip-name">${food.food_name}</div>
      <div class="suggestion-chip-macros">${food.calories_per_100g} kcal • ${food.protein_per_100g}g P</div>
    `;
    chip.addEventListener('click', () => selectFood(food, 'DB'));
    container.appendChild(chip);
  });
}

// ─── Search Tab ───────────────────────────────────────────────────────────────
function setupModalListeners() {
  const modal = document.getElementById('food-search-modal');
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Tab switching
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Search input
  const searchInput = document.getElementById('food-search-input');
  searchInput?.addEventListener('input', (e) => {
    executeFoodSearch(e.target.value.trim());
  });

  // Category filter chips
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.dataset.cat || '';
      executeFoodSearch(searchInput?.value.trim() || '');
    });
  });

  // Gram input & presets
  const gramsInput = document.getElementById('serving-grams-input');
  gramsInput?.addEventListener('input', updateDynamicServingCalculation);
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (gramsInput) {
        gramsInput.value = e.target.dataset.grams;
        updateDynamicServingCalculation();
      }
    });
  });

  // Confirm Add Food
  document.getElementById('confirm-add-food-btn')?.addEventListener('click', confirmAddFood);

  // Custom food form
  document.getElementById('add-ingredient-btn')?.addEventListener('click', addIngredientRow);
  document.getElementById('estimate-nutrition-btn')?.addEventListener('click', estimateNutrition);
  document.getElementById('save-custom-food-btn')?.addEventListener('click', saveCustomFood);
  document.getElementById('add-custom-once-btn')?.addEventListener('click', addCustomFoodOnce);

  // My Foods refresh
  document.getElementById('refresh-my-foods-btn')?.addEventListener('click', loadMyFoods);
}

async function executeFoodSearch(q) {
  const container = document.getElementById('search-results-list');
  if (!container) return;

  const query = q.toLowerCase();
  let foods = BUILTIN_FOODS.filter(f => {
    const matchQ   = !query || f.food_name.toLowerCase().includes(query) || f.category.toLowerCase().includes(query);
    const matchCat = !activeCategory || f.category.toLowerCase() === activeCategory.toLowerCase();
    return matchQ && matchCat;
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
  foods.forEach(food => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    if (selectedFood && selectedFood.food_id === food.food_id && !selectedFood.isCustom) {
      item.classList.add('selected');
    }
    item.innerHTML = `
      <div>
        <div style="font-weight: 600; font-size: 14px; color: #ffffff;">${food.food_name}</div>
        <div style="font-size: 12px; color: var(--text-dim);">${food.category} • per 100g</div>
      </div>
      <div style="text-align: right;">
        <div style="font-family: var(--font-heading); font-weight: 700; color: var(--primary-light); font-size: 14px;">${food.calories_per_100g} kcal</div>
        <div style="font-size: 11px; color: var(--text-muted);">${food.protein_per_100g}g P • ${food.carbs_per_100g}g C</div>
      </div>
    `;
    item.addEventListener('click', () => {
      document.querySelectorAll('.search-result-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectFood(food, food.source || 'DB');
    });
    container.appendChild(item);
  });
}

// ─── Food Selection (shared between tabs) ────────────────────────────────────
function selectFood(food, sourceLabel) {
  selectedFood = food;
  const calcCard = document.getElementById('serving-calculator');
  if (calcCard) calcCard.style.display = 'block';

  document.getElementById('selected-food-title').textContent = food.food_name;
  document.getElementById('selected-food-source').textContent = sourceLabel || (food.isCustom ? 'Custom' : 'DB');
  document.getElementById('serving-grams-input').value = 100;
  document.getElementById('confirm-add-food-btn').disabled = false;
  updateDynamicServingCalculation();
}

function updateDynamicServingCalculation() {
  if (!selectedFood) return;
  const grams = parseFloat(document.getElementById('serving-grams-input')?.value) || 0;
  const mult = grams / 100;

  document.getElementById('calc-calories').textContent = Math.round((selectedFood.calories_per_100g || 0) * mult);
  document.getElementById('calc-protein').textContent  = ((selectedFood.protein_per_100g  || 0) * mult).toFixed(1);
  document.getElementById('calc-carbs').textContent    = ((selectedFood.carbs_per_100g    || 0) * mult).toFixed(1);
  document.getElementById('calc-fat').textContent      = ((selectedFood.fat_per_100g      || 0) * mult).toFixed(1);
  document.getElementById('calc-fibre').textContent    = ((selectedFood.fibre_per_100g    || 0) * mult).toFixed(1);
}

// ─── Confirm Add Food ─────────────────────────────────────────────────────────
async function confirmAddFood() {
  if (!selectedFood) return;
  const gramsInput = document.getElementById('serving-grams-input');
  const grams = parseFloat(gramsInput?.value) || 100;
  const confirmBtn = document.getElementById('confirm-add-food-btn');

  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span class="spinner"></span> Adding...';

  try {
    if (selectedFood.isCustom) {
      // Custom food — POST with custom_food_id
      await api.post('/meals', {
        meal_date:  currentDate,
        meal_type:  activeMealType,
        items: [{ custom_food_id: selectedFood.custom_food_id, quantity_grams: grams }]
      });
    } else {
      // Regular food — POST with food_id
      await api.post('/meals', {
        meal_date:  currentDate,
        meal_type:  activeMealType,
        items: [{ food_id: selectedFood.food_id, quantity_grams: grams }]
      });
    }
    showToast('Food Added', `Added ${grams}g ${selectedFood.food_name} to ${activeMealType}!`, 'success');
  } catch (e) {
    // Offline fallback
    console.warn('API meal save failed, using local fallback:', e);
    const mult = grams / 100;
    const foodItem = {
      food_id:        selectedFood.food_id || null,
      food_name:      selectedFood.food_name,
      quantity_grams: grams,
      calories:       Math.round((selectedFood.calories_per_100g || 0) * mult),
      protein:        Number(((selectedFood.protein_per_100g  || 0) * mult).toFixed(1)),
      carbs:          Number(((selectedFood.carbs_per_100g    || 0) * mult).toFixed(1)),
      fat:            Number(((selectedFood.fat_per_100g      || 0) * mult).toFixed(1)),
      category:       selectedFood.category || 'Custom'
    };
    saveFoodItemLocally(currentDate, activeMealType, foodItem);
    showToast('Food Added (Offline)', 'Saved locally.', 'info');
  }

  closeModal();
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = 'Add to Meal';
  await loadDailyTrackerData();
}

// ─── Custom Food Tab ──────────────────────────────────────────────────────────
let ingredientCount = 0;

function addIngredientRow() {
  ingredientCount++;
  const list = document.getElementById('ingredients-list');
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.id = `ing-row-${ingredientCount}`;
  row.innerHTML = `
    <input type="text" class="form-control ing-name" placeholder="Ingredient (e.g., Rice)" style="flex: 2;">
    <input type="number" class="form-control ing-qty" placeholder="g" min="0" style="flex: 1;">
    <button class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()" style="flex: none;">✕</button>
  `;
  list.appendChild(row);
}

async function estimateNutrition() {
  const btn = document.getElementById('estimate-nutrition-btn');
  btn.disabled = true;
  btn.textContent = '⚡ Estimating...';

  const foodName   = document.getElementById('cf-name').value.trim();
  const ingRows    = document.querySelectorAll('#ingredients-list .ingredient-row');
  const ingredients = [];

  ingRows.forEach(row => {
    const name = row.querySelector('.ing-name')?.value.trim();
    const qty  = parseFloat(row.querySelector('.ing-qty')?.value) || 0;
    if (name && qty > 0) ingredients.push({ name, quantity_g: qty });
  });

  try {
    const res = await api.post('/foods/custom/estimate', { food_name: foodName, ingredients });
    if (res?.data) {
      const d = res.data;
      document.getElementById('cf-cal').value   = d.calories_per_100g || '';
      document.getElementById('cf-prot').value  = d.protein_per_100g  || '';
      document.getElementById('cf-carbs').value = d.carbs_per_100g    || '';
      document.getElementById('cf-fat').value   = d.fat_per_100g      || '';
      document.getElementById('cf-fibre').value = d.fibre_per_100g    || '';

      const label = document.getElementById('estimated-label');
      if (d.is_estimated) {
        label.style.display = 'block';
        if (d.unmatched_ingredients?.length) {
          label.textContent = `⚠️ Estimated — could not find: ${d.unmatched_ingredients.join(', ')}. Please verify.`;
        } else if (d.source === 'manual') {
          label.textContent = d.message || '⚠️ Could not estimate. Please fill manually.';
        } else {
          label.textContent = '⚠️ Estimated values — please verify before saving';
        }
      } else {
        label.style.display = 'block';
        label.textContent = `✅ Matched: "${d.matched_food}" from database`;
        label.style.color = 'var(--primary-light)';
      }
    }
  } catch (err) {
    showToast('Estimation Failed', 'Could not estimate. Please fill manually.', 'error');
  }

  btn.disabled = false;
  btn.textContent = '⚡ Estimate';
}

function getCustomFoodFormData() {
  const name    = document.getElementById('cf-name').value.trim();
  const qty     = parseFloat(document.getElementById('cf-qty').value) || 100;
  const unit    = document.getElementById('cf-unit').value;
  const cal     = parseFloat(document.getElementById('cf-cal').value)   || 0;
  const prot    = parseFloat(document.getElementById('cf-prot').value)  || 0;
  const carbs   = parseFloat(document.getElementById('cf-carbs').value) || 0;
  const fat     = parseFloat(document.getElementById('cf-fat').value)   || 0;
  const fibre   = parseFloat(document.getElementById('cf-fibre').value) || 0;
  const isEst   = document.getElementById('estimated-label').style.display !== 'none' &&
                  document.getElementById('estimated-label').textContent.startsWith('⚠️');

  const ingRows = document.querySelectorAll('#ingredients-list .ingredient-row');
  const ingredients = [];
  ingRows.forEach(row => {
    const ingName = row.querySelector('.ing-name')?.value.trim();
    const ingQty  = parseFloat(row.querySelector('.ing-qty')?.value) || 0;
    if (ingName && ingQty > 0) ingredients.push({ name: ingName, quantity_g: ingQty });
  });

  return { name, qty, unit, cal, prot, carbs, fat, fibre, isEst, ingredients };
}

async function saveCustomFood() {
  const { name, unit, cal, prot, carbs, fat, fibre, isEst, ingredients } = getCustomFoodFormData();

  if (!name) { showToast('Required', 'Please enter a food name.', 'error'); return; }

  const btn = document.getElementById('save-custom-food-btn');
  btn.disabled = true;
  btn.textContent = '💾 Saving...';

  try {
    const res = await api.post('/foods/custom', {
      food_name:         name,
      calories_per_100g: cal,
      protein_per_100g:  prot,
      carbs_per_100g:    carbs,
      fat_per_100g:      fat,
      fibre_per_100g:    fibre,
      unit,
      ingredients,
      is_estimated:      isEst
    });
    showToast('Saved!', `"${name}" added to My Foods.`, 'success');
    clearCustomFoodForm();
    myCustomFoods = []; // force refresh
    switchTab('myfoods');
  } catch (err) {
    showToast('Error', err.message || 'Could not save custom food.', 'error');
  }

  btn.disabled = false;
  btn.textContent = '💾 Save to My Foods';
}

async function addCustomFoodOnce() {
  const { name, qty, unit, cal, prot, carbs, fat, fibre } = getCustomFoodFormData();
  if (!name) { showToast('Required', 'Please enter a food name.', 'error'); return; }

  // Build a temporary food object for the serving calculator
  const tempFood = {
    food_name:         name,
    calories_per_100g: cal,
    protein_per_100g:  prot,
    carbs_per_100g:    carbs,
    fat_per_100g:      fat,
    fibre_per_100g:    fibre,
    isCustom:          true,
    isTemporary:       true
  };

  // Show serving calculator pre-filled with the entered qty
  selectFood(tempFood, 'Custom (once)');
  document.getElementById('serving-grams-input').value = qty;
  updateDynamicServingCalculation();
}

function clearCustomFoodForm() {
  ['cf-name','cf-qty','cf-cal','cf-prot','cf-carbs','cf-fat','cf-fibre'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'cf-qty' ? '100' : '';
  });
  document.getElementById('cf-unit').value = 'grams';
  document.getElementById('ingredients-list').innerHTML = '';
  document.getElementById('estimated-label').style.display = 'none';
}

// ─── My Foods Tab ─────────────────────────────────────────────────────────────
async function loadMyFoods() {
  const container = document.getElementById('my-foods-list');
  const countEl   = document.getElementById('my-foods-count');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim);">Loading...</div>`;

  try {
    const res = await api.get('/foods/custom');
    myCustomFoods = res?.data || [];
    if (countEl) countEl.textContent = `${myCustomFoods.length} custom food${myCustomFoods.length !== 1 ? 's' : ''}`;

    if (myCustomFoods.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:30px;color:var(--text-dim);">
          <div style="font-size:24px;margin-bottom:8px;">🥘</div>
          <div>No custom foods yet.</div>
          <div style="font-size:12px;margin-top:6px;">Use the "+ Custom Food" tab to create one.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    myCustomFoods.forEach(food => renderMyFoodItem(container, food));
  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:#f87171;">Could not load custom foods.</div>`;
  }
}

function renderMyFoodItem(container, food) {
  const item = document.createElement('div');
  item.className = 'my-food-item';
  item.dataset.id = food.custom_food_id;
  item.innerHTML = `
    <div class="my-food-info" style="cursor:pointer;" data-cf-id="${food.custom_food_id}">
      <div style="font-weight:600;color:#fff;font-size:14px;">
        ${food.food_name}${food.is_estimated ? ' <span style="color:#fbbf24;font-size:11px;">⚠ est.</span>' : ''}
      </div>
      <div style="font-size:12px;color:var(--text-dim);">
        ${food.calories_per_100g} kcal • ${food.protein_per_100g}g P • ${food.carbs_per_100g}g C • ${food.fat_per_100g}g F — per 100g
      </div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
      <button class="btn btn-primary btn-sm" data-action="add-cf" data-cf-id="${food.custom_food_id}">+ Add</button>
      <button class="btn btn-secondary btn-sm" data-action="del-cf" data-cf-id="${food.custom_food_id}" style="color:#f87171;">✕</button>
    </div>
  `;

  // Add to meal
  item.querySelector('[data-action="add-cf"]').addEventListener('click', () => {
    const f = myCustomFoods.find(cf => cf.custom_food_id === food.custom_food_id);
    if (!f) return;
    selectFood({
      custom_food_id:    f.custom_food_id,
      food_name:         f.food_name,
      calories_per_100g: f.calories_per_100g,
      protein_per_100g:  f.protein_per_100g,
      carbs_per_100g:    f.carbs_per_100g,
      fat_per_100g:      f.fat_per_100g,
      fibre_per_100g:    f.fibre_per_100g,
      isCustom: true
    }, 'Custom');
  });

  // Delete
  item.querySelector('[data-action="del-cf"]').addEventListener('click', async (e) => {
    if (!confirm(`Delete "${food.food_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/foods/custom/${food.custom_food_id}`);
      item.remove();
      myCustomFoods = myCustomFoods.filter(cf => cf.custom_food_id !== food.custom_food_id);
      showToast('Deleted', `"${food.food_name}" removed.`, 'info');
      const cEl = document.getElementById('my-foods-count');
      if (cEl) cEl.textContent = `${myCustomFoods.length} custom food${myCustomFoods.length !== 1 ? 's' : ''}`;
    } catch (err) {
      showToast('Error', 'Could not delete.', 'error');
    }
  });

  container.appendChild(item);
}

// ─── Load & Render Daily Data ─────────────────────────────────────────────────
async function loadDailyTrackerData() {
  let meals = [];
  try {
    const res = await api.get(`/meals?date=${currentDate}`);
    if (res?.data?.meals) {
      meals = res.data.meals;
      const totals = res.data.daily_totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      renderDailyBudgetAndMacros(totals);
      renderMealSlots(meals, true);
      return;
    }
  } catch (err) {
    console.warn('API meals fetch failed, using local cache:', err);
  }

  // Offline fallback
  meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${currentDate}`) || '[]');
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
  meals.forEach(m => {
    (m.items || []).forEach(item => {
      totalCal += Number(item.calories || 0);
      totalP   += Number(item.protein  || 0);
      totalC   += Number(item.carbs    || 0);
      totalF   += Number(item.fat      || 0);
    });
  });
  renderDailyBudgetAndMacros({ calories: totalCal, protein: totalP, carbs: totalC, fat: totalF });
  renderMealSlots(meals, false);
}

function renderDailyBudgetAndMacros(totals) {
  const targetCal   = userGoals.daily_calories || 2000;
  const consumedCal = totals.calories;
  const remaining   = Math.max(0, targetCal - consumedCal);
  const pct         = Math.min(100, Math.round((consumedCal / targetCal) * 100));

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('consumed-calories-num', Math.round(consumedCal));
  set('target-calories-num',   Math.round(targetCal));
  set('remaining-calories-num', `${Math.round(remaining)} remaining`);

  const bar = document.getElementById('calories-progress-bar');
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.style.background = pct > 100 ? '#f43f5e' : 'linear-gradient(90deg,#10b981 0%,#34d399 100%)';
  }

  const pT = Math.round(userGoals.protein_g || 140);
  const cT = Math.round(userGoals.carbs_g || 220);
  const fT = Math.round(userGoals.fat_g || 60);

  set('consumed-protein-stat', `${Math.round(totals.protein)}g / ${pT}g`);
  set('consumed-carbs-stat',   `${Math.round(totals.carbs)}g / ${cT}g`);
  set('consumed-fat-stat',     `${Math.round(totals.fat)}g / ${fT}g`);
  set('consumed-fibre-stat',   `${Math.round(totals.fibre || 0)}g`);
}

function renderMealSlots(meals, fromBackend = false) {
  ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(type => {
    const meal      = meals.find(m => m.meal_type === type);
    const container = document.getElementById(`${type}-items-container`);
    const totElId   = `${type}-totals-text`;

    if (!container) return;

    if (!meal || !meal.items || meal.items.length === 0) {
      container.innerHTML = `<div class="empty-meal-placeholder">No items logged yet.</div>`;
      const totEl = document.getElementById(totElId);
      if (totEl) totEl.textContent = '0 kcal • 0g P • 0g C • 0g F';
      return;
    }

    let mCal = 0, mP = 0, mC = 0, mF = 0;

    container.innerHTML = meal.items.map((item, idx) => {
      mCal += Number(item.calories || 0);
      mP   += Number(item.protein  || 0);
      mC   += Number(item.carbs    || 0);
      mF   += Number(item.fat      || 0);

      const mealId = meal.meal_id;
      const itemId = item.meal_item_id;

      return `
        <div class="meal-food-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid var(--bg-card-border);border-radius:var(--radius-md);margin-bottom:8px;">
          <div>
            <div style="font-weight:600;color:#fff;font-size:14px;">${item.food_name || item.name}</div>
            <div style="font-size:12px;color:var(--text-dim);">
              ${item.quantity_grams || 100}g •
              <span style="color:#60a5fa;">${Math.round(item.protein || 0)}g P</span> •
              <span style="color:#fbbf24;">${Math.round(item.carbs || 0)}g C</span> •
              <span style="color:#f43f5e;">${Math.round(item.fat || 0)}g F</span>
              ${item.custom_food_id ? ' <span style="color:var(--text-muted);font-size:11px;">[custom]</span>' : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-family:var(--font-heading);font-weight:700;color:var(--primary-light);font-size:15px;">${Math.round(item.calories || 0)} kcal</div>
            <button onclick="deleteMealItem('${type}',${fromBackend ? mealId : "'"+( item.entry_id || idx)+"'"}, ${fromBackend ? (itemId || 'null') : 'null'}, ${fromBackend})"
              style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;border-radius:6px;padding:4px 8px;font-size:13px;cursor:pointer;" title="Remove">✕</button>
          </div>
        </div>
      `;
    }).join('');

    const totEl = document.getElementById(totElId);
    if (totEl) totEl.textContent = `${Math.round(mCal)} kcal • ${Math.round(mP)}g P • ${Math.round(mC)}g C • ${Math.round(mF)}g F`;
  });
}

// ─── Delete Meal Item ─────────────────────────────────────────────────────────
window.deleteMealItem = async function(mealType, mealId, itemId, fromBackend) {
  if (fromBackend && mealId) {
    try {
      await api.delete(`/meals/${mealId}`);
      showToast('Removed', 'Food item removed.', 'info');
    } catch (err) {
      showToast('Error', 'Could not remove item.', 'error');
      return;
    }
  } else {
    // Local-only deletion
    const entryId = mealId;
    let meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${currentDate}`) || '[]');
    const meal = meals.find(m => m.meal_type === mealType);
    if (meal && meal.items) {
      meal.items = meal.items.filter((item, idx) => (item.entry_id || idx) != entryId);
      meal.total_calories = meal.items.reduce((sum, i) => sum + (i.calories || 0), 0);
      meal.total_protein  = meal.items.reduce((sum, i) => sum + (i.protein  || 0), 0);
      meal.total_carbs    = meal.items.reduce((sum, i) => sum + (i.carbs    || 0), 0);
      meal.total_fat      = meal.items.reduce((sum, i) => sum + (i.fat      || 0), 0);
      localStorage.setItem(`fitmaster_meals_${currentDate}`, JSON.stringify(meals));
    }
    showToast('Removed', 'Food item removed.', 'info');
  }
  await loadDailyTrackerData();
};

// ─── Local Offline Fallback ───────────────────────────────────────────────────
function saveFoodItemLocally(date, mealType, foodItem) {
  let meals = JSON.parse(localStorage.getItem(`fitmaster_meals_${date}`) || '[]');
  let meal = meals.find(m => m.meal_type === mealType);

  if (!meal) {
    meal = { meal_id: Date.now(), meal_type: mealType, items: [], total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 };
    meals.push(meal);
  }

  foodItem.entry_id = Date.now() + Math.floor(Math.random() * 1000);
  meal.items.push(foodItem);
  meal.total_calories = meal.items.reduce((sum, i) => sum + (i.calories || 0), 0);
  meal.total_protein  = meal.items.reduce((sum, i) => sum + (i.protein  || 0), 0);
  meal.total_carbs    = meal.items.reduce((sum, i) => sum + (i.carbs    || 0), 0);
  meal.total_fat      = meal.items.reduce((sum, i) => sum + (i.fat      || 0), 0);
  localStorage.setItem(`fitmaster_meals_${date}`, JSON.stringify(meals));
}
