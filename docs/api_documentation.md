# REST API Documentation - FitMaster AI

All endpoints accept and return `application/json` unless otherwise specified.
Authenticated routes require the header:
`Authorization: Bearer <jwt_token>`

## 1. Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user (`name`, `email`, `password`) | No |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token | No |
| `POST` | `/api/auth/logout` | Invalidate token / client session clearance | Yes |

## 2. User Profile (`/api/users`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/users/profile` | Retrieve the authenticated user's profile | Yes |
| `PUT` | `/api/users/profile` | Create or update profile attributes (age, gender, height, weight, activity, goal) | Yes |

## 3. Nutrition & Goal Calculator (`/api/nutrition`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/nutrition/goals` | Retrieve saved nutrition targets (Calories, Macros, BMI, BMR, TDEE) | Yes |
| `POST` | `/api/nutrition/calculate` | Compute and store goals based on current profile metrics | Yes |

## 4. Foods Reference (`/api/foods`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/foods` | Paginated listing of foods from the database | Yes |
| `GET` | `/api/foods/search` | Search foods by substring name and/or category (`?q=...&category=...`) | Yes |
| `GET` | `/api/foods/:id` | Fetch specific food details and per-100g nutritional profile | Yes |

## 5. Meals Logging (`/api/meals`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/meals` | Retrieve logged meals for a specific date (`?date=YYYY-MM-DD`) | Yes |
| `POST` | `/api/meals` | Log a meal (date, meal_type, items array with `food_id` and `quantity_grams`) | Yes |
| `PUT` | `/api/meals/:id` | Update quantities or items in a logged meal | Yes |
| `DELETE` | `/api/meals/:id` | Delete a logged meal and its associated items | Yes |

## 6. Hydration Tracker (`/api/water`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/water` | Fetch hydration status for a given date (`?date=YYYY-MM-DD`) | Yes |
| `POST` | `/api/water` | Add water intake entry (in milliliters) | Yes |
| `DELETE` | `/api/water/:id` | Delete a specific water intake log entry | Yes |

## 7. Progress & Weight Tracking (`/api/progress`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/progress/daily` | Daily summary of calories, macros, and hydration vs target | Yes |
| `GET` | `/api/progress/weekly` | Aggregated 7-day intake history | Yes |
| `GET` | `/api/progress/monthly`| Aggregated 30-day nutrition trends | Yes |
| `POST` | `/api/progress/weight` | Log a new weight measurement (`weight_kg`, `recorded_date`) | Yes |

## 8. AI Recommendations (`/api/ai`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `POST` | `/api/ai/chat` | Generate a Gemini nutrition and fitness response using the authenticated user's saved profile and goals | Yes |
| `POST` | `/api/ai/recommendations` | Trigger AI gap analysis and generate ranked food suggestions | Yes |
| `GET` | `/api/ai/recommendations/history` | Retrieve historical AI recommendations for the user | Yes |

### Gemini chat request and configuration
`POST /api/ai/chat` accepts `{ "message": "...", "history": [{ "role": "user" | "assistant", "content": "..." }] }`. The message is required and limited to 1,200 characters; history is optional and bounded to 8 entries. Successful responses return `data.reply`, `data.model`, and `data.generated_at`. Requests require a JWT bearer token. The user ID, profile, and saved nutrition targets are loaded server-side from the authenticated account; client-supplied identity or profile fields are ignored.

The backend calls Google's official Gemini `generateContent` REST API at `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. The configured default is the stable `gemini-3.5-flash-lite` model. Set `GEMINI_API_KEY` only in the backend environment, optionally configure `GEMINI_MODEL` and `GEMINI_TIMEOUT_MS`, and never place the key in frontend code or browser storage. The endpoint allows only nutrition and fitness-related questions, enforces per-user request limits, and does not provide simulated answers if Gemini is unavailable.

## 9. Analytics & Matplotlib Visualizations (`/api/analytics`)
| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/analytics/daily` | Generate / retrieve daily breakdown chart PNG | Yes |
| `GET` | `/api/analytics/weekly` | Generate / retrieve 7-day trend chart PNG | Yes |
| `GET` | `/api/analytics/monthly` | Generate / retrieve monthly trend chart PNG | Yes |
| `GET` | `/api/analytics/weight` | Generate / retrieve weight trajectory chart PNG | Yes |
| `GET` | `/api/analytics/nutrition-charts` | Fetch all available chart metadata & URLs for active user | Yes |
| `GET` | `/api/analytics/model-performance` | Fetch ML training/evaluation loss, accuracy, and confusion matrix charts | Yes |
