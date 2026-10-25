> **Developer:** Pratham Petwal (solo)
> **Timeline:** 12 weeks starting October 2026
> **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui | FastAPI + Python 3.11+ | PostgreSQL via SQLAlchemy 2.0 | ProcessPoolExecutor + SSE | Hybrid AI Decision Engine (Heuristics + LLM Rationale)

---

## Phase 0: Repository Setup & Architecture Plan
**Duration:** 2–3 days | **Week 1**

### Goal
Set up the monorepo, initialize both frontend and backend projects, configure tooling, and establish the project structure.

### Tasks
1. Initialize git repository
2. Create monorepo structure: `frontend/` and `backend/`
3. **Frontend:** Initialize Next.js 14+ with App Router, TypeScript, Tailwind CSS, shadcn/ui
4. **Backend:** Initialize Python project with `pyproject.toml`, FastAPI, uvicorn
5. Set up `.gitignore`, `.env.example`, `README.md`
6. Configure linters: ESLint + Prettier (frontend), Ruff (backend)
7. Configure type checking: TypeScript strict mode, mypy/pyright (backend)
8. Create `data/` and `artifacts/` directories (gitignored)
9. Document local setup instructions in README

### Files Created
```
automlens/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   ├── lib/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── .eslintrc.json
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── core/
│   │       ├── config.py
│   │       └── logging.py
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── tests/
│       └── __init__.py
├── data/                  # gitignored
├── artifacts/             # gitignored
├── .gitignore
├── .env.example
└── README.md
```

### Acceptance Criteria
- [ ] `npm run dev` starts frontend on localhost:3000
- [ ] `uvicorn app.main:app --reload` starts backend on localhost:8000
- [ ] Frontend shows a placeholder page
- [ ] Backend responds to `GET /api/v1/health` with `{"status": "ok"}`
- [ ] ESLint, Prettier, Ruff pass with no errors
- [ ] TypeScript builds without errors
- [ ] Git repo initialized with first commit
- [ ] README has setup instructions

---

## Phase 1: Project Skeleton & API Client
**Duration:** 3–4 days | **Week 1–2**

### Goal
Build the core application shell: database setup, project CRUD, API client, error handling conventions, and the Dashboard UI shell.

### Tasks

#### Backend
1. Set up PostgreSQL database with SQLAlchemy 2.0 (with connection pooling and environment variable `DATABASE_URL`)
2. Create `Project` model: `id (UUID)`, `name`, `description`, `status`, `created_at`, `updated_at`
3. Create project repository (data access layer)
4. Create project service (business logic)
5. Create API routes: `POST /api/v1/projects`, `GET /api/v1/projects`, `GET /api/v1/projects/{id}`, `DELETE /api/v1/projects/{id}`
6. Define Pydantic request/response schemas
7. Set up consistent error response format: `{"error": {"code": "...", "message": "..."}}`
8. Add CORS middleware (localhost origins for dev)
9. Write tests for project CRUD

#### Frontend
1. Create typed API client (`lib/api-client.ts`) with error handling
2. Create shared types (`lib/types.ts`) matching backend schemas
3. Build Dashboard page: project list with cards
4. Build "Create Project" modal/dialog
5. Empty state, loading state, error state for dashboard
6. Set up shadcn/ui components: Button, Card, Dialog, Input, Toast
7. Navigation sidebar component

### New Files
```
backend/
  app/
    api/v1/routes/projects.py
    api/v1/schemas/projects.py
    db/models.py
    db/session.py
    db/repositories/projects.py
    services/projects.py
    core/errors.py
  tests/test_projects.py

frontend/
  app/
    projects/page.tsx
  components/
    layout/sidebar.tsx
    layout/header.tsx
    projects/project-card.tsx
    projects/create-project-dialog.tsx
  lib/
    api-client.ts
    types.ts
```

### Acceptance Criteria
- [ ] Can create a project via API and see it in the dashboard
- [ ] Can delete a project
- [ ] Project list shows loading, empty, and populated states
- [ ] API returns proper error responses for invalid input
- [ ] Backend tests pass for all CRUD operations
- [ ] Frontend successfully calls backend API
- [ ] Database persists across server restarts

---

## Phase 2: Dataset Upload & Validation
**Duration:** 4–5 days | **Week 2–3**

### Goal
Implement CSV/Excel file upload with validation, safe storage, and basic dataset metadata persistence.

### Tasks

#### Backend
1. Create `Dataset` model: `id`, `project_id`, `original_filename`, `storage_path`, `file_size`, `row_count`, `column_count`, `status`, `created_at`
2. Create storage abstraction (`storage/base.py`, `storage/local.py`)
   - Generate storage names from UUIDs (prevent path traversal)
   - Store files under `data/datasets/{project_id}/{uuid}.{ext}`
3. Create upload endpoint: `POST /api/v1/projects/{id}/dataset`
   - Validate file extension (`.csv`, `.xlsx`)
   - Validate file size (configurable limit, default 50MB)
   - Parse with pandas, validate encoding
   - Handle Excel sheet selection
   - Check for: empty files, duplicate column names, all-null columns
   - Store file and create dataset record
4. Create dataset info endpoint: `GET /api/v1/projects/{id}/dataset`
5. Create dataset delete endpoint: `DELETE /api/v1/projects/{id}/dataset`
6. Write validation tests (success + 8+ failure cases)

#### Frontend
1. Build upload area component (drag & drop + file picker)
2. Upload progress indicator
3. File validation feedback (client-side pre-checks)
4. Dataset info display after upload
5. Error state handling for all failure cases

### Acceptance Criteria
- [ ] Valid CSV uploads successfully
- [ ] Valid XLSX uploads successfully (with sheet selection)
- [ ] Empty file → clear error
- [ ] Wrong extension → clear error
- [ ] Oversized file → clear error
- [ ] Malformed CSV → clear error with details
- [ ] Duplicate column names → clear error
- [ ] Uploaded files stored with UUID names (no user-supplied paths)
- [ ] Dataset metadata persists in database
- [ ] Delete removes both file and DB record
- [ ] Tests cover all success and failure paths

---

## Phase 3: Dataset Profiling & Data Quality
**Duration:** 5–6 days | **Week 3–4**

### Goal
Generate comprehensive dataset profile and data quality report with real computed statistics.

### Tasks

#### Backend
1. Create profiling service (`services/profiling.py`):
   - Dataset dimensions (rows × columns)
   - Per-column: dtype, missing count/%, unique count, min/max/mean/median/std/quartiles
   - Value distribution data (histogram bins for numerical, value counts for categorical)
   - Duplicate row count
2. Create data quality service (`services/quality.py`):
   - Missing value summary (columns with missing, percentages)
   - Duplicate row detection
   - Constant columns (zero variance)
   - High-cardinality categoricals (potential identifiers)
   - Suspicious type detection (numeric stored as string)
   - Conservative outlier flags (IQR method, **reported only**)
3. Create profile endpoint: `POST /api/v1/projects/{id}/dataset/profile`
4. Create profile retrieval: `GET /api/v1/projects/{id}/dataset/profile`
5. Store profile results as JSON artifact (not in DB blob)
6. Write tests with a known test dataset (Titanic)

#### Frontend
1. Summary stat cards (rows, columns, missing columns, duplicates)
2. Column-level data table with:
   - Color-coded status badges (clean/warning/critical)
   - Inline sparkline distributions (using Recharts)
   - Expandable column details
3. Data quality report section
4. Loading state during profile computation
5. Handle large datasets gracefully (show computing indicator)

### Acceptance Criteria
- [ ] Profile generates correct stats for Titanic dataset (manually verified)
- [ ] Missing values reported accurately (Age: ~19.8%, Cabin: ~77.1%)
- [ ] Duplicate count is correct
- [ ] High-cardinality columns flagged (Name, Ticket, Cabin)
- [ ] Outlier flags present but NOT auto-removed
- [ ] Distribution charts render correctly
- [ ] Profile persists and can be re-fetched without recomputation
- [ ] Edge cases: single-column dataset, all-numeric, all-categorical
- [ ] Tests verify stat calculations

---

## Phase 4: Target Selection, AI Decision Engine & Preprocessing

### Goal
Implement target column selection, task type detection/confirmation, leakage-safe preprocessing pipeline, and the **Hybrid AI Decision Engine** that automatically selects candidate models and justifies preprocessing decisions.

### Tasks

#### Backend — Target & Task
1. Create task detection service (`ml/task_detection.py`):
   - Analyze target column dtype and cardinality
   - Suggest classification vs. regression
   - Validate: not all null, classification has ≥2 classes
   - Check class counts for CV feasibility
2. Create target confirmation endpoint: `POST /api/v1/projects/{id}/target`
   - Accept: `target_column`, `task_type` (user can override suggestion)
   - Validate target is a real column
   - Store decision in DB

#### Backend — Hybrid AI Decision Engine
3. Create Decision Engine service (`services/decision_engine.py`):
   - **Deterministic Rules (Default / Offline)**:
     - Dataset size & feature count rules (e.g. $N < 500$ recommends simpler models like Ridge/LogisticRegression to avoid overfitting; $N > 10,000$ selects HistGradientBoosting over slow standard ensembles).
     - Missing value heuristics (skewness > 1.0 → median imputation; low skewness → mean; high cardinality categoricals > 50 → flag memory hazard).
     - Candidate model selection: automatically recommends top candidate algorithms for the user.
   - **LLM Enrichment (When API key is provided)**:
     - Prompts Gemini / OpenAI with dataset fingerprint and suggested choices to generate crisp, natural language explanations ("*Imputed 'Age' using median because distribution is right-skewed with significant outliers...*").
     - Seamless offline fallback if no API key is provided.
   - Automatically writes each decision to the persistent audit store.

#### Backend — Preprocessing Pipeline
4. Create pipeline factory (`ml/pipeline_factory.py`):
   - Auto-detect numerical vs. categorical features (exclude target)
   - Numerical: `SimpleImputer(strategy='median')` + `StandardScaler` (for models that need it)
   - Categorical: `SimpleImputer(strategy='most_frequent')` + `OneHotEncoder(handle_unknown='ignore')`
   - Use `ColumnTransformer` to combine
   - Wrap in `sklearn.pipeline.Pipeline` with estimator
5. Create preprocessing preview endpoint: `GET /api/v1/projects/{id}/preprocessing-preview`
   - Returns: what transformations will be applied to each column, AI decision justification, and evidence
6. **Critical: Pipeline is fitted INSIDE each CV fold, never on full data**
7. Identifier column detection (warn, don't auto-drop)
8. Write leakage-prevention tests

#### Frontend
1. Target column selector (dropdown from column list)
2. Task type display with "Suggested: Classification" + confirm/override
3. AI Recommendation cards: "Recommended Models for this Dataset" with "Why AI selected this" expandable rationale
4. Preprocessing preview table with inline AI Decision Badges (Column → Action → AI Justification)

### Acceptance Criteria
- [ ] Selecting "Survived" on Titanic → suggests Classification ✓
- [ ] Selecting "Fare" on Titanic → suggests Regression ✓
- [ ] Decision Engine recommends suitable models with transparent justification
- [ ] Works 100% offline using deterministic heuristics without crashing if API key is absent
- [ ] When API key is present, enriches rationale with contextual natural language
- [ ] User can override suggestions at any time
- [ ] Pipeline factory produces valid sklearn Pipeline fitted strictly inside folds
- [ ] Tests verify deterministic decisions and leakage prevention

---

## Phase 5: Parallel Model Training, Cross-Validation & Live SSE Streaming
**Duration:** 6–7 days | **Week 6–8**

### Goal
Implement multi-core parallel model training across CPU cores using `ProcessPoolExecutor`, live real-time status streaming via Server-Sent Events (SSE), and comprehensive 5-fold cross-validation.

### Tasks

#### Backend — Model Registry
1. Create model registry (`ml/model_registry.py`):
   - Classification: DummyClassifier (baseline), LogisticRegression, RandomForestClassifier, GradientBoostingClassifier, SVC, KNeighborsClassifier
   - Regression: DummyRegressor (baseline), LinearRegression, Ridge, RandomForestRegressor, GradientBoostingRegressor, SVR
   - Each model: name, description, sklearn class, default hyperparameters

#### Backend — Parallel Training Engine & SSE Streaming
2. Create parallel training worker (`services/training.py`):
   - Use Python `concurrent.futures.ProcessPoolExecutor(max_workers=AUTOMLENS_MAX_WORKERS)`
   - Dispatches candidate models as independent worker processes to utilize all CPU cores
   - Each worker runs full 5-fold CV inside its isolated process
   - Worker emits step-by-step progress callbacks (`fold_start`, `fold_done`, `metric_computed`, `error`)
3. Create real-time SSE stream (`api/v1/routes/training.py`):
   - Endpoint: `GET /api/v1/projects/{id}/runs/{run_id}/stream`
   - Streams live JSON events: worker status, current fold, real-time decision logs, model completion
4. Persist run results in PostgreSQL:
   - Save fold-level metrics, mean, std deviation, training time per model
   - Save run manifest (seed, folds, model configs, dataset fingerprint, package versions)
5. Non-blocking API:
   - `POST /api/v1/projects/{id}/runs` triggers background training immediately and returns `run_id`

#### Backend — Metrics
6. Create metrics module (`ml/metrics.py`):
   - Classification: accuracy, precision, recall, f1, roc_auc (binary)
   - Regression: mae, rmse, r2
   - Handle undefined metrics gracefully (e.g., ROC-AUC for multiclass)

#### Frontend
1. Training configuration page (model toggles with AI recommendations pre-selected, metric selector)
2. "Start Parallel Training" button → triggers background job & connects to SSE stream
3. **Live Activity Console / Terminal**:
   - Streams live system status: "Worker 2 running Fold 3/5 on Random Forest...", "Model LogisticRegression finished in 1.4s"
4. Real-time progress bars for each model
5. Leaderboard updates dynamically as individual models finish training

### Acceptance Criteria
- [ ] Models train in parallel across CPU cores using `ProcessPoolExecutor`
- [ ] SSE connection delivers live status and fold progress without polling lag
- [ ] Dummy baseline is always trained and compared against
- [ ] If a single model fails (e.g. SVR times out), other parallel workers continue undisturbed
- [ ] Results and fold scores persist cleanly in PostgreSQL
- [ ] Tests verify parallel worker dispatch and metric calculations
- [ ] 5-fold CV produces 5 fold scores per model
- [ ] Metrics are computed correctly (verify against manual sklearn CV)
- [ ] Dummy baseline is always included
- [ ] Individual model failure doesn't crash entire run
- [ ] Run manifest records: seed, folds, model configs, dataset fingerprint, versions
- [ ] Stratified folds for classification, shuffle folds for regression
- [ ] Same random seed → reproducible results
- [ ] Tests: training with valid data, training with too-small data, metric calculations

---

## Phase 6: Model Leaderboard & Selection
**Duration:** 3–4 days | **Week 8–9**

### Goal
Build the model comparison leaderboard and model selection mechanism.

### Tasks

#### Backend
1. Create leaderboard endpoint: `GET /api/v1/projects/{id}/runs/{run_id}/leaderboard`
   - Returns all models ranked by primary metric
   - Includes: all metrics, fold means, fold std, training time
2. Create model selection endpoint: `POST /api/v1/projects/{id}/runs/{run_id}/select-model`
   - Saves the fitted pipeline artifact (`.joblib`)
   - Records selection in DB with timestamp and reason
3. Persist fitted Pipeline for the selected model:
   - Refit on full training data (after CV evaluation)
   - Save via `joblib.dump()` to artifact storage
   - Record artifact path and checksum

#### Frontend
1. Leaderboard table with sortable columns
2. Metric comparison bar chart (Recharts)
3. Fold-level performance sparklines
4. "Select Model" button with confirmation
5. Visual indicator for best model (crown icon)
6. Handle edge cases: all models failed, only baseline succeeded

### Acceptance Criteria
- [ ] Leaderboard ranks models correctly by primary metric
- [ ] All metrics displayed with proper formatting
- [ ] CV std deviation shown alongside means
- [ ] Selected model's pipeline artifact saved and loadable
- [ ] Leaderboard matches backend computation exactly
- [ ] Bar chart renders correctly with proper labels

---

## Phase 7: Prediction with Saved Pipeline
**Duration:** 4–5 days | **Week 9**

### Goal
Generate predictions using the saved preprocessing+model pipeline, supporting both single-row and batch prediction.

### Tasks

#### Backend
1. Create prediction service (`services/predictions.py`):
   - Load saved pipeline artifact
   - **Single prediction**: accept feature values as JSON → validate → predict → return result
   - **Batch prediction**: accept CSV upload → validate columns → predict all → return results
   - Feature schema validation:
     - Check all expected columns present
     - Warn on extra columns (ignored)
     - Error on missing required columns
     - Type validation
   - For classification: return predicted class + probabilities
   - For regression: return predicted value
2. Create prediction endpoints:
   - `POST /api/v1/projects/{id}/predict` (single row, JSON body)
   - `POST /api/v1/projects/{id}/predict/batch` (CSV upload)
   - `GET /api/v1/projects/{id}/predictions` (list past predictions)
3. Create `Prediction` DB model for history
4. Store batch prediction results as CSV artifacts
5. Handle pipeline load failures gracefully

#### Frontend
1. Single prediction form (auto-generated from feature schema)
   - Dropdowns for categorical features
   - Number inputs for numerical features
   - Pre-populated with example/median values
2. Prediction result display with probability
3. Batch prediction tab with CSV upload + download
4. "View Explanation" link on prediction results
5. Prediction history list

### Acceptance Criteria
- [ ] Single prediction produces correct result
- [ ] Batch prediction handles 100+ rows
- [ ] **Predictions work after server restart** (pipeline loads from disk)
- [ ] Missing column → actionable error
- [ ] Extra column → warning (ignored)
- [ ] Type mismatch → clear error
- [ ] Probabilities sum to ~1.0 for classification
- [ ] Prediction matches what `pipeline.predict()` would give in a notebook
- [ ] Tests: valid prediction, missing columns, type errors, pipeline load failure

---

## Phase 8: Feature Importance & SHAP
**Duration:** 5–6 days | **Week 10**

### Goal
Implement global feature importance, global SHAP, and local SHAP explanations with proper labeling and fallbacks.

### Tasks

#### Backend
1. Create explainability service (`services/explainability.py`):
   
   **Global Feature Importance:**
   - For tree models: use `model.feature_importances_`
   - For linear models: use coefficient magnitudes
   - For all models: offer permutation importance as alternative
   - Label the method used
   
   **Global SHAP:**
   - For tree models: use `shap.TreeExplainer` (fast)
   - For linear models: use `shap.LinearExplainer`
   - For others: use `shap.KernelExplainer` with sample limit (slow)
   - Compute on a sample (100–200 rows max) for performance
   - Return mean |SHAP| per feature
   - Map transformed feature names back to original names
   
   **Local SHAP:**
   - Explain one prediction's feature contributions
   - Return: base value, feature values, SHAP values, prediction
   - Waterfall-style data for visualization

2. Create explanation endpoints:
   - `GET /api/v1/projects/{id}/explanations/importance` (global importance)
   - `GET /api/v1/projects/{id}/explanations/shap/global` (global SHAP)
   - `POST /api/v1/projects/{id}/explanations/shap/local` (local SHAP for specific input)

3. Handle failures:
   - SHAP computation timeout → return partial results or fallback to importance
   - Unsupported model → clear message
   - Never fabricate values

4. Cache global SHAP results (expensive to recompute)

#### Frontend
1. Global feature importance bar chart
2. Global SHAP summary bar chart with method label
3. Local SHAP waterfall chart for individual predictions
4. Loading states (SHAP can take 10–30 seconds)
5. Fallback display when SHAP unavailable
6. Disclaimer: "Feature attribution explains model behavior, not causation"

### Acceptance Criteria
- [ ] Global importance renders for tree and linear models
- [ ] Global SHAP computes within 30 seconds for sample of 100 rows
- [ ] Local SHAP explains individual predictions correctly
- [ ] Method is labeled (TreeExplainer, KernelExplainer, etc.)
- [ ] Feature names mapped back to original (not one-hot encoded names)
- [ ] SHAP failure → graceful fallback, no crash
- [ ] Unsupported model → clear message, not error
- [ ] Tests: SHAP values for a known model/dataset, fallback behavior

---

## Phase 9: Audit Timeline, History & Exports
**Duration:** 4–5 days | **Week 10–11**

### Goal
Implement the audit event system, experiment history view, and data export functionality.

### Tasks

#### Backend — Audit System
1. Create audit service (`services/audit.py`):
   - `record_event(project_id, action, reason, evidence, result)`
   - Store events in `AuditEvent` DB model
2. Integrate audit recording into ALL existing services:
   - Project created/deleted
   - Dataset uploaded/deleted
   - Profile generated
   - Target confirmed
   - Training started/completed/failed
   - Model selected
   - Prediction generated
   - Explanation generated
   - Export created
3. Create audit endpoints:
   - `GET /api/v1/projects/{id}/audit` (paginated timeline)

#### Backend — Exports
4. Create export service (`services/exports.py`):
   - Data quality report (JSON)
   - Model leaderboard (CSV)
   - Predictions (CSV)
   - Run manifest (JSON)
   - Trained pipeline artifact (`.joblib`)
   - Audit log (JSON)
5. Create export endpoints:
   - `GET /api/v1/projects/{id}/exports/{type}` (download specific export)
6. Generate safe filenames, add checksums

#### Frontend
1. Audit timeline component (vertical timeline with expandable cards)
2. Event filtering by type
3. Export page with download buttons for each type
4. Download progress indicators

### Acceptance Criteria
- [ ] Every major operation creates an audit event
- [ ] Timeline shows events in chronological order (newest first)
- [ ] Each event has: action, reason, evidence, result, timestamp
- [ ] All export types download successfully
- [ ] Exported CSV can be opened in Excel
- [ ] Exported pipeline can be loaded with `joblib.load()`
- [ ] Run manifest contains: seed, folds, metrics, configs, dataset fingerprint, versions
- [ ] Audit log doesn't contain secrets or raw data
- [ ] Tests: audit event creation, export generation

---

## Phase 10: End-to-End Testing, Polish & Demo Readiness
**Duration:** 7–10 days | **Week 11–12**

### Goal
Complete integration testing, fix edge cases, polish UI, optimize performance, prepare documentation, and create demo scenarios.

### Tasks

#### Testing
1. End-to-end test: Classification workflow (Titanic dataset)
   - Upload → Profile → Target → Train → Leaderboard → Predict → Explain → Audit
2. End-to-end test: Regression workflow (Boston Housing or California Housing)
   - Same flow with regression-specific metrics
3. Error path testing:
   - Upload invalid files (10+ failure cases)
   - Train with insufficient data
   - Predict with wrong schema
   - SHAP on unsupported model
4. Edge case testing:
   - Single-column dataset
   - All-numeric dataset
   - High-missing-value dataset
   - Very small dataset (20 rows)
   - Large dataset (50K+ rows)

#### Performance
5. Profile loading time for large datasets
6. Training timeout handling
7. SHAP computation limits
8. API response time benchmarks

#### UI Polish
9. Responsive design review
10. Loading states on every data-dependent screen
11. Error messages are user-friendly
12. Chart labels, legends, axis titles on all visualizations
13. Consistent styling and spacing

#### Documentation
14. Complete README with:
    - Project description
    - Architecture overview
    - Setup instructions (step by step)
    - Environment variables
    - How to run tests
    - How to use the application
    - Known limitations
15. API documentation (auto-generated from FastAPI + manual notes)
16. Architecture decision records

#### Demo Preparation
17. Prepare Titanic dataset for classification demo
18. Prepare California Housing for regression demo
19. Write demo script (step-by-step walkthrough)
20. Prepare viva talking points

### Acceptance Criteria
- [ ] Full classification workflow works end-to-end without errors
- [ ] Full regression workflow works end-to-end without errors
- [ ] All error states show user-friendly messages
- [ ] No console errors in browser
- [ ] No unhandled exceptions in backend logs
- [ ] README allows a new person to set up and run the project
- [ ] Demo can be completed in 15–20 minutes
- [ ] All tests pass
- [ ] Build succeeds without warnings

---

## Timeline Summary

| Phase | What | Duration | Week |
|-------|------|----------|------|
| 0 | Repo Setup & Architecture | 2–3 days | Week 1 |
| 1 | Project Skeleton & API Client | 3–4 days | Week 1–2 |
| 2 | Dataset Upload & Validation | 4–5 days | Week 2–3 |
| 3 | Dataset Profiling & Quality | 5–6 days | Week 3–4 |
| 4 | Target Selection & Preprocessing | 5–6 days | Week 5–6 |
| 5 | Model Training & CV | 6–7 days | Week 6–8 |
| 6 | Model Leaderboard & Selection | 3–4 days | Week 8–9 |
| 7 | Prediction with Pipeline | 4–5 days | Week 9 |
| 8 | Feature Importance & SHAP | 5–6 days | Week 10 |
| 9 | Audit Timeline & Exports | 4–5 days | Week 10–11 |
| 10 | Testing, Polish & Demo | 7–10 days | Week 11–12 |

> [!WARNING]
> **Buffer:** This plan has ~2 weeks of buffer built in. Phases 5 (training) and 8 (SHAP) are the highest-risk phases. If anything slips, reduce model count or simplify SHAP scope first.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| SHAP too slow for some models | High | Medium | Limit to TreeExplainer; fall back to feature importance |
| Training blocks API | Medium | High | BackgroundTasks + polling; thread pool if needed |
| Scope creep on UI polish | High | Medium | Functionality first, polish in Phase 10 only |
| sklearn version incompatibility | Low | High | Pin versions in requirements.txt |
| Large dataset OOM | Medium | Medium | Enforce row/column limits at upload |
| Pipeline serialization issues | Low | High | Test joblib save/load early in Phase 5 |
| CORS/API integration bugs | Medium | Medium | Test frontend↔backend early in Phase 1 |

---

## Decision Log (Initial)

| ID | Topic | Decision | Status | Reasoning |
|----|-------|----------|--------|-----------|
| D-001 | DuckDB | Dropped | ✅ Approved | Pandas sufficient for project scale; reduces complexity |
| D-002 | Auth (Clerk) | Deferred to post-minor | Proposed | Focus on ML workflow first; add auth after core works |
| D-003 | Database | SQLite via SQLAlchemy | ✅ Approved | Simple, file-based, sufficient for single-user |
| D-004 | Background training | FastAPI BackgroundTasks | Proposed | Simplest option; upgrade to Celery only if needed |
| D-005 | XGBoost | Optional (add if time permits) | Proposed | Synopsis mentions it; sklearn models sufficient for demo |
| D-006 | Deployment | Local first | ✅ Approved | Server deployment planned for later |
| D-007 | Multi-user | Not for minor | ✅ Approved | Solo demo; multi-user is a major-project concern |
