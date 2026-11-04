# FitMaster AI – Intelligent Nutrition Tracker
> **Academic Capstone Project in Computer Science and Engineering**

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-v4.19-lightgrey.svg)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://www.mysql.com)
[![Python](https://img.shields.io/badge/Python-3.10+-yellow.svg)](https://www.python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.110+-teal.svg)](https://fastapi.tiangolo.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15+-orange.svg)](https://www.tensorflow.org)
[![Scikit--Learn](https://img.shields.io/badge/Scikit--Learn-1.4+-blueviolet.svg)](https://scikit-learn.org)
[![Matplotlib](https://img.shields.io/badge/Matplotlib-Visualization-red.svg)](https://matplotlib.org)

---

## 1. Project Introduction
**FitMaster AI** is an intelligent, full-stack nutrition and hydration management system engineered to provide personalized dietary guidance, real-time metabolic target calculation, manual meal logging with dynamic scaling, server-side Matplotlib data analytics, and machine learning-powered food recommendation.

Built with an academic focus on architectural modularity, mathematical rigor, clean separation of concerns, and data integrity, FitMaster AI strictly uses verified nutritional datasets normalized to per-100g standards and enforces strict security best practices (JWT authentication, bcrypt password hashing, and parameterized SQL queries).

---

## 2. Key Modules & Features
1. **User Authentication & Authorization**: Secure registration, login, logout, password hashing with bcrypt, JWT authorization header validation.
2. **Interactive User Profile Management**: Age, gender, height (cm), weight (kg), physical activity tier, and fitness goals with dual interactive sliders, real-time Mifflin-St Jeor calculations, and live BMI gauge.
3. **Metabolic Nutrition Calculator**: Scientific BMI, BMR, TDEE, and personalized calorie/macro targets with explicit health disclaimers.
4. **Interactive Food & Nutrition Tracker**: Instant substring search across verified databanks, live serving size adjustment in grams ($g$), dynamic calorie/macro meters, and meal slot allocation (Breakfast, Lunch, Dinner, Snacks).
5. **Interactive Hydration Tracker**: Fluid intake monitoring with animated circular wave gauge, interactive goal adjustments, quick-add volumes (ml), and intake history ledger.
6. **Interactive Progress Analytics**: Responsive Chart.js client-side visualizations for daily/weekly macronutrients, bodyweight trajectory tracking with weigh-in log, and hydration consistency.
7. **AI Nutrition Assistant Bot**: Conversational AI bot offering interactive quick questions and comprehensive answers on protein requirements, Indian high-protein meals, workout nutrition timing, fat loss plateaus, and calorie deficits.

---

## 3. Technology Stack
- **Frontend**: HTML5, Vanilla CSS3 (Custom Design System, Glassmorphic Navy Theme), Vanilla JavaScript (ES6+), Chart.js, Fetch API.
- **Primary Backend**: Node.js, Express.js, JWT, bcryptjs, mysql2/promise, express-validator, dotenv.
- **Database**: MySQL 8.0+, 3NF Relational Schema, Foreign Keys, Indexes.
- **AI Microservice**: Python, FastAPI, Scikit-learn, TensorFlow/Keras, Pandas, NumPy.
- **Visualization**: Interactive Client-side Chart.js Engine.

---

## 4. Project Directory Structure
```
FitMaster-AI/
├── frontend/               # Vanilla HTML5, CSS3, JavaScript interface
│   ├── css/                # Custom CSS design system and module styles
│   ├── js/                 # API client, auth controller, module controllers
│   ├── assets/             # Images and SVG icons
│   └── *.html              # Standalone module views (dashboard, tracker, etc.)
├── backend/                # Primary Node.js/Express REST API server
│   ├── src/
│   │   ├── config/         # Database connection pool and env configuration
│   │   ├── controllers/    # Request handlers for auth, profile, foods, meals
│   │   ├── middleware/     # JWT authentication, error handling
│   │   ├── routes/         # Express API route declarations
│   │   ├── services/       # Core business logic and Python AI integration
│   │   └── validators/     # Express-validator validation chains
├── ai-service/             # Python FastAPI microservice
│   ├── app/                # Endpoints, gap analysis, recommendation logic
│   ├── app/analytics/      # Server-side Matplotlib chart generators
│   ├── cv_research/        # Standalone OpenCV research scripts
│   ├── training/           # ML/DL training and evaluation scripts
│   ├── saved_models/       # Serialized models (.pkl, .keras)
│   └── generated_charts/   # Dynamic PNG charts
├── dataset/                # Dataset ingestion and preprocessing pipeline
│   ├── raw/                # Untouched raw dataset files
│   ├── processed/          # Standardized per-100g nutritional CSVs
│   └── scripts/            # Python preprocessor and MySQL import scripts
├── database/               # Relational database artifacts
│   ├── schema.sql          # 3NF DDL schema with constraints and indexes
│   └── seed.sql            # Nutritional food seed and sample records
├── docs/                   # Detailed academic architecture and design docs
└── tests/                  # Automated unit and integration test suites
```

---

## 5. Development Phases & Current Status
- [x] **Phase 1: Workspace Inspection & Directory Structure Setup** (Completed)
- [x] **Phase 2: MySQL Schema Design & Dual-Mode Database Connection** (Completed)
- [x] **Phase 3: Node.js & Express REST Backend Implementation** (Completed)
- [x] **Phase 4: Authentication & User Profile Services** (Completed)
- [x] **Phase 5: Nutritional Dataset Preprocessing & Ingestion** (Completed - 95 verified foods)
- [x] **Phase 6: Food Tracker & Meal Planner Modules** (Completed)
- [x] **Phase 7: Nutrition Calculator & Hydration Tracker** (Completed)
- [x] **Phase 8: Python AI Microservice (FastAPI)** (Completed)
- [x] **Phase 9: ML / DL Training & Evaluation Pipeline** (Completed - RF & DNN Models Serialized)
- [x] **Phase 10: Server-Side Matplotlib Data Analytics** (Completed - 7 Publication-Grade Visualizations)
- [x] **Phase 11: Frontend UI/UX Design & Implementation** (Completed - 9 Glassmorphic Navy Views)
- [x] **Phase 12: End-to-End System Integration** (Completed)
- [x] **Phase 13: Full Integration Testing & Documentation Finalization** (Completed - 16 Node tests & 4 AI test suites passed)

---

## 6. Getting Started & Running the Application

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.10 or higher) with `pip`

### Step 1: Start the Python AI Microservice
```bash
cd ai-service
source ../.venv/bin/activate  # or activate your python virtualenv
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
*Health Check*: `http://localhost:8000/health`  
*Interactive Docs*: `http://localhost:8000/docs`

### Step 2: Start the Primary Node.js Backend Gateway
In a second terminal window:
```bash
cd backend
npm start
# or npm run dev for auto-reload
```
*Port*: `http://localhost:5000` (Backend automatically serves the frontend static client at root `/`)

---

## 7. Demo Credentials
The database is pre-seeded with a complete sample user, biometric history, and today's meal records:
- **Email**: `demo@fitmaster.ai`
- **Password**: `Password@123`
- *Or click "1-Click Demo Login" directly on the login / landing page.*

---

## 8. Machine Learning Model Performance

| Metric | Random Forest Classifier | Deep Neural Network (MLP) |
| :--- | :--- | :--- |
| **Architecture** | 100 Estimators, max_depth=12 | 4-layer Dense (128-64-32-Output) + Dropout |
| **Accuracy** | **97.00%** | **95.83%** |
| **Precision (Weighted)** | **0.9698** | **0.9412** |
| **Recall / F1-Score** | **0.9686 (F1)** | **0.9407 (Macro F1)** |
| **Artifacts** | `rf_nutrition_classifier.pkl` | `keras_nutrition_model.keras` |

Training convergence curves and confusion matrix charts are generated server-side into `ai-service/generated_charts/` and viewable under the **AI Nutrition Assistant** and **Progress Analytics** tabs.

---

## 9. Academic Integrity & Architectural Constraints
- **Strict Per-100g Standardization**: All nutritional calculations adhere to standard biochemical formulas: $\text{Nutrient Intake} = \frac{\text{Grams Consumed}}{100} \times \text{Nutrient Value per 100g}$.
- **Isolated Research Module**: In compliance with academic guidelines, OpenCV is used strictly for an isolated edge detection and image segmentation benchmarking research paper module (`ai-service/cv_research/`), with **no** camera-based food recognition scanner in the core application.
- **Dual-Mode Persistence**: The backend features automated fallback to an embedded SQLite database (`database/fitmaster.sqlite`) containing all 11 tables and 95 verified foods, ensuring seamless portability and immediate zero-configuration grading.
