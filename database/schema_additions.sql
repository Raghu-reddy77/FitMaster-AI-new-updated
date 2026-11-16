

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

-- Alter meal_items to allow nullable food_id and add custom_food_id
-- Run once on existing databases (safe with IF NOT EXISTS equivalent guard)
ALTER TABLE meal_items
    MODIFY COLUMN food_id INT NULL,
    ADD COLUMN IF NOT EXISTS custom_food_id INT NULL,
    ADD INDEX IF NOT EXISTS idx_meal_items_custom_food (custom_food_id),
    ADD CONSTRAINT fk_items_custom_food
        FOREIGN KEY (custom_food_id) REFERENCES custom_foods(custom_food_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;

