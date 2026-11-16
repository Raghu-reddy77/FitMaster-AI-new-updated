-- =============================================================================
-- FITMASTER AI – INTELLIGENT NUTRITION TRACKER
-- Relational Database Schema (MySQL 8.0+)
-- Compliant with 3NF Normalization, Referential Integrity & MySQL Workbench
-- =============================================================================

CREATE DATABASE IF NOT EXISTS fitmaster_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fitmaster_ai;

-- -----------------------------------------------------------------------------
-- Table 1: users
-- Core authentication credentials and account metadata
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 2: user_profiles
-- Physical attributes, biometrics, and lifestyle fitness goals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    age INT NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    height_cm DECIMAL(5,2) NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    activity_level ENUM(
        'sedentary',
        'lightly_active',
        'moderately_active',
        'very_active',
        'extra_active'
    ) NOT NULL DEFAULT 'sedentary',
    fitness_goal ENUM(
        'weight_loss',
        'weight_maintenance',
        'lean_muscle_gain'
    ) NOT NULL DEFAULT 'weight_maintenance',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 3: nutrition_goals
-- Calculated metabolic baselines (BMI, BMR, TDEE) and daily target intakes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutrition_goals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    daily_calories DECIMAL(8,2) NOT NULL,
    protein_g DECIMAL(8,2) NOT NULL,
    carbs_g DECIMAL(8,2) NOT NULL,
    fat_g DECIMAL(8,2) NOT NULL,
    water_ml DECIMAL(8,2) NOT NULL DEFAULT 2500.00,
    bmi DECIMAL(5,2) NOT NULL,
    bmr DECIMAL(8,2) NOT NULL,
    tdee DECIMAL(8,2) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_goals_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 4: foods
-- Standardized nutritional reference library (Strictly per 100 grams)
-- Sourced from USDA FoodData Central and Indian Nutrient Databank
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foods (
    food_id INT AUTO_INCREMENT PRIMARY KEY,
    food_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    calories_per_100g DECIMAL(8,2) NOT NULL,
    protein_per_100g DECIMAL(8,2) NOT NULL,
    carbs_per_100g DECIMAL(8,2) NOT NULL,
    fat_per_100g DECIMAL(8,2) NOT NULL,
    fibre_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    serving_size VARCHAR(100) DEFAULT '100g',
    source VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_foods_name (food_name),
    INDEX idx_foods_category (category),
    FULLTEXT INDEX idx_foods_fulltext (food_name, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 5: meals
-- Meal headers logged by users for specific dates and meal slots
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meals (
    meal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    meal_date DATE NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snacks') NOT NULL,
    total_calories DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    total_protein DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    total_carbs DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    total_fat DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    total_fibre DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meals_user_date (user_id, meal_date),
    CONSTRAINT fk_meals_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 6: meal_items
-- Granular food items associated with a logged meal, scaled by gram weight
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_items (
    meal_item_id INT AUTO_INCREMENT PRIMARY KEY,
    meal_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity_grams DECIMAL(8,2) NOT NULL,
    calories DECIMAL(8,2) NOT NULL,
    protein DECIMAL(8,2) NOT NULL,
    carbs DECIMAL(8,2) NOT NULL,
    fat DECIMAL(8,2) NOT NULL,
    fibre DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_meal_items_meal (meal_id),
    INDEX idx_meal_items_food (food_id),
    CONSTRAINT fk_items_meal
        FOREIGN KEY (meal_id) REFERENCES meals(meal_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_items_food
        FOREIGN KEY (food_id) REFERENCES foods(food_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 7: water_intake
-- Hydration tracking logs per user per date
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_intake (
    water_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    intake_date DATE NOT NULL,
    amount_ml INT NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_water_user_date (user_id, intake_date),
    CONSTRAINT fk_water_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 8: weight_history
-- Historical weight tracking over time for progress visualization
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weight_history (
    weight_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recorded_date DATE NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_weight_user_date (user_id, recorded_date),
    CONSTRAINT fk_weight_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 9: meal_plans
-- Planned dietary schedules for future dates or meal planning routines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plans (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_date DATE NOT NULL,
    plan_name VARCHAR(150) NOT NULL,
    target_calories DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    target_protein DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    target_carbs DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    target_fat DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_plans_user_date (user_id, plan_date),
    CONSTRAINT fk_plans_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 10: meal_plan_items
-- Food items allocated to a meal plan slot (breakfast, lunch, dinner, snacks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plan_items (
    plan_item_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    food_id INT NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snacks') NOT NULL,
    quantity_grams DECIMAL(8,2) NOT NULL,
    calculated_calories DECIMAL(8,2) NOT NULL,
    calculated_protein DECIMAL(8,2) NOT NULL,
    calculated_carbs DECIMAL(8,2) NOT NULL,
    calculated_fat DECIMAL(8,2) NOT NULL,
    INDEX idx_plan_items_plan (plan_id),
    INDEX idx_plan_items_food (food_id),
    CONSTRAINT fk_plan_items_plan
        FOREIGN KEY (plan_id) REFERENCES meal_plans(plan_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_plan_items_food
        FOREIGN KEY (food_id) REFERENCES foods(food_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table 11: ai_recommendations
-- Audit log of generated AI recommendations, detected gaps, and rationale
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_recommendations (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recommendation_date DATE NOT NULL,
    gap_type VARCHAR(100) NOT NULL,
    current_calories DECIMAL(8,2) NOT NULL,
    current_protein DECIMAL(8,2) NOT NULL,
    current_carbs DECIMAL(8,2) NOT NULL,
    current_fat DECIMAL(8,2) NOT NULL,
    target_calories DECIMAL(8,2) NOT NULL,
    target_protein DECIMAL(8,2) NOT NULL,
    target_carbs DECIMAL(8,2) NOT NULL,
    target_fat DECIMAL(8,2) NOT NULL,
    food_suggestions_json JSON NOT NULL,
    rationale TEXT NOT NULL,
    model_version VARCHAR(50) NOT NULL DEFAULT 'v1.0-rule_and_ml',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recommendations_user_date (user_id, recommendation_date),
    CONSTRAINT fk_recommendations_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 12: nutrition_goals_history (tracks historical goal snapshots per profile update)
CREATE TABLE IF NOT EXISTS nutrition_goals_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    daily_calories DECIMAL(8,2) NOT NULL,
    protein_g DECIMAL(8,2) NOT NULL,
    carbs_g DECIMAL(8,2) NOT NULL,
    fat_g DECIMAL(8,2) NOT NULL,
    water_ml DECIMAL(8,2) NOT NULL,
    bmi DECIMAL(5,2),
    bmr DECIMAL(8,2),
    tdee DECIMAL(8,2),
    effective_from DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_goals_history_user (user_id),
    CONSTRAINT fk_goals_history_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 13: custom_foods (user-created foods, private per user)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_foods (
    custom_food_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    calories_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    protein_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    carbs_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    fat_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    fibre_per_100g DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    serving_size VARCHAR(50) DEFAULT '100g',
    serving_weight_g DECIMAL(8,2) DEFAULT 100.00,
    unit VARCHAR(20) DEFAULT 'grams',
    ingredients_json TEXT,
    is_estimated TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_custom_foods_user (user_id),
    CONSTRAINT fk_custom_foods_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
