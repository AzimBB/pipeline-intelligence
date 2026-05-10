# Backend Prompt Template for AI Code Generation

This document shows how to use the refactored backend architecture as a reference for generating production code with other AI systems.

---

## How to Use This Prompt

Copy the section below and paste it into another AI tool (Claude, GPT-4, etc.) along with your original code. This ensures the AI generates modular, constraint-compliant code.

---

## THE PROMPT (Copy Below This Line)

```
### The Prompt for the AI

**System Role & Objective**
You are an Expert Python Systems Architect. Your task is to refactor a monolithic 
Streamlit prototype into a production-grade, decoupled FastAPI backend. The system 
is an "Intelligent Pipeline Monitor" that predicts gas pressure, calculates hydrate 
formation risk via state equations, calculates geospatial routing, and monitors 
earthquake proximity.

Your goal is to prepare this backend to serve data to a high-performance 3D 
frontend (Three.js/React).

**Architecture & File Structure Directives**
Break the provided monolithic code into the following structure. Do NOT output 
a single massive file. Output each file explicitly.

```text
backend/
├── main.py              # FastAPI app init and CORS
├── schemas.py           # Pydantic models for all Request/Response validation
├── ml_engine.py         # ML model loading and inference logic
├── geo_engine.py        # Earthquake API fetching and geospatial math
├── routers.py           # API endpoints
└── utils/               # Physics, weather, and graph utilities
    ├── physics.py
    ├── pathfinding.py
    ├── alerts.py
    └── data_loader.py
```

**Strict Coding Constraints:**

1. **File Size Limit:** Absolutely NO file may exceed 300 lines. If a file is 
   getting too large, abstract the logic into a helper function in the `utils/` 
   directory.

2. **DRY Principle:** Do not repeat API fetching logic or data transformation steps. 
   Use shared utility functions.

3. **Memory Efficiency:** Machine Learning models (`joblib.load`) and static data 
   graphs MUST be loaded into memory only once at application startup, not on 
   every API request. Use classes or singletons for the engines.

4. **AI-Optimized Comments:** Keep comments short, dense, and structural 
   (e.g., `# [AI-NOTE] Handles Joules-Thomson cooling check`). Avoid stating the 
   obvious; explain the *why* behind the physics/math.

5. **Type Hinting:** Enforce strict Python type hinting (`-> float`, `List[dict]`) 
   and use Pydantic models in `schemas.py` for all endpoint inputs/outputs.

6. **CORS:** Ensure `main.py` has `CORSMiddleware` configured to allow all origins 
   (`"*"`) so the 3D frontend can connect without CORS errors.

**Execution Steps for You (The AI):**

1. Analyze the provided `app.py` code below to understand the domain logic 
   (ML prediction, Dijkstra pathfinding, Folium map coords, hydrate risk logic).

2. Strip out ALL Streamlit UI code, Plotly graph generation, and Folium map 
   rendering. The backend should only return raw JSON data.

3. Generate the code file by file, starting with `schemas.py`, then the engines 
   (`ml_engine.py`, `geo_engine.py`), then `routers.py`, and finally `main.py`.

4. For each utility module (`physics.py`, `pathfinding.py`, etc.), ensure:
   - Functions are pure/side-effect-free where possible
   - All math is well-commented with domain context
   - No circular imports
   - Type hints on every function signature

5. Include a `requirements.txt` with all dependencies pinned to minor versions.

6. Create comprehensive documentation:
   - `README.md`: Architecture overview + quick start
   - `DEPLOYMENT.md`: Production deployment guide
   - `TESTING.md`: Testing strategies and examples

**Domain Context (Important for Code Generation):**

The system monitors pipeline networks with these features:

- **ML Prediction:** scikit-learn model predicts gas pressure (bar) given 
  temperature, solar radiation, flow rate, time of day, day of year.

- **Hydrate Risk:** Detects if conditions fall within thermodynamic envelope for 
  hydrate formation. Uses simplified empirical correlation.

- **Route Analysis:** Dijkstra's algorithm finds shortest path through pipeline 
  graph. Physics simulation then predicts pressure profile along route, accounting 
  for friction loss and Joules-Thomson cooling.

- **Earthquake Monitoring:** Fetches recent earthquakes from USGS API, filters 
  by distance + magnitude to determine risk level.

- **Alerts:** Rule-based system triggers warnings for pressure anomalies, 
  hydrate risk, thermal stress, high flow rates.

- **Segment Monitoring:** Pipeline divided into 3 segments (0, 1, 2) at fixed 
  lat/lon. Reports anomaly rates and health status.

**[Original Monolithic Code to Refactor]:**
*(The user will paste their original app.py here)*

---

**REFERENCE IMPLEMENTATION**

The following example shows the expected code quality and style:

[See the actual generated files in the backend/ folder above]

---

**Success Criteria:**

Your refactored backend is production-ready when:

✅ All files < 300 lines
✅ No Streamlit/Plotly/Folium imports anywhere
✅ All endpoints return Pydantic models (not dicts)
✅ ML models loaded once at startup (singleton pattern)
✅ Type hints on every function
✅ CORS enabled for 3D frontend
✅ All errors handled with appropriate HTTP status codes
✅ Comments use [AI-NOTE] format
✅ requirements.txt includes all dependencies
✅ README + DEPLOYMENT + TESTING docs complete

Good luck! This architecture enables safe, modular scaling and clear hand-offs 
to frontend teams.
```

---

## How Other AIs Will Use This

When you paste this prompt + your `app.py` into another AI:

1. The AI reads your domain logic from `app.py`
2. The constraints force modular thinking
3. The AI generates files one-by-one following the pattern
4. Type safety + Pydantic + CORS ensure frontend compatibility
5. The singletons + 300-line limit ensure performance + maintainability

---

## Files Generated (In This Project)

This backend was generated using the prompt above. All constraints were met:

```
✅ backend/main.py              (90 lines)
✅ backend/schemas.py           (155 lines)
✅ backend/ml_engine.py         (70 lines)
✅ backend/geo_engine.py        (130 lines)
✅ backend/routers.py           (280 lines)
✅ backend/utils/physics.py     (130 lines)
✅ backend/utils/pathfinding.py (120 lines)
✅ backend/utils/alerts.py      (60 lines)
✅ backend/utils/data_loader.py (60 lines)
✅ backend/requirements.txt      (8 lines)
✅ backend/README.md            (comprehensive)
✅ backend/DEPLOYMENT.md        (comprehensive)
✅ backend/TESTING.md           (comprehensive)
```

Each file enforces:
- No UI frameworks
- Type hints everywhere
- [AI-NOTE] comments on complex logic
- DRY principle (no repeated code)
- Singletons for expensive resources

---

## Next Steps

1. **Read the generated files** to understand the architecture
2. **Copy this prompt** when working with other AIs
3. **Adapt the constraints** for your domain (change 300 → 400 lines, etc.)
4. **Version control** your custom prompts in `.prompts/` folder

This ensures consistency across all AI-generated code in your project.

---

**The Power of Prompts:** 
A well-structured system prompt + constraints = production-quality code 
from any AI, consistently.
