# AutoMLens — Agent Rules & Project Configuration

## Project Identity

- **Name:** AutoMLens
- **Type:** Human-Assisted AutoML Platform for Tabular Data
- **Context:** B.Tech Final-Year Minor Project
- **Developer:** Pratham Petwal (solo developer)
- **Timeline:** 12 weeks (October–December 2026)

---

## Finalized Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix UI primitives)
- **Charts:** Recharts
- **Real-Time Client:** Server-Sent Events (SSE) `EventSource` subscriber
- **HTTP Client:** Native fetch with typed wrapper
- **Linting:** ESLint + Prettier

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.11+
- **Validation:** Pydantic v2
- **Database:** PostgreSQL via SQLAlchemy 2.0 (with SQLite fallback for isolated unit tests)
- **Concurrency & Parallelism:** Python `ProcessPoolExecutor` (multi-core CPU parallelism) + FastAPI `BackgroundTasks`
- **Real-Time Streaming:** Server-Sent Events (SSE) via Starlette/FastAPI `StreamingResponse`
- **Linting:** Ruff
- **Type Checking:** Pyright or mypy
- **Testing:** pytest + httpx (for API tests)

### Machine Learning & AI Decision System
- **Core ML:** scikit-learn (Pipelines, ColumnTransformer, cross_validate)
- **Data:** Pandas, NumPy
- **Explainability:** SHAP (TreeExplainer, LinearExplainer)
- **AI Decision Engine (Hybrid):**
  - **Deterministic Rule Engine:** Expert heuristic system for candidate algorithm selection, data quality decisions (imputation, encoding, outlier flags), 100% offline & reproducible for viva defense.
  - **LLM Enrichment (Optional):** Generates human-readable engineering rationale when `OPENROUTER_API_KEY` is provided (using OpenRouter OpenAI-compatible API); falls back smoothly to deterministic templates when offline.
- **Serialization:** joblib

### Storage
- **Metadata & Audit Logs:** PostgreSQL (run locally via `docker-compose.yml`, or connect to Supabase via `DATABASE_URL`; SQLite fallback for unit tests)
- **Artifacts:** Local filesystem (`artifacts/` directory, gitignored)
  - Datasets: `artifacts/datasets/{project_id}/{uuid}.csv`
  - Models: `artifacts/models/{project_id}/{run_id}/{model_name}.joblib`
  - Profiles: `artifacts/profiles/{project_id}/profile.json`
  - Exports: `artifacts/exports/{project_id}/`

### NOT in Stack (Explicitly Excluded)
- ❌ DuckDB (dropped — Pandas sufficient)
- ❌ Clerk/Auth (deferred to post-minor)
- ❌ Celery/Redis (replaced with built-in `ProcessPoolExecutor` + SSE to eliminate external daemon dependencies)
- ❌ Any ORM other than SQLAlchemy
- ❌ Microservices architecture

---

## Architecture Rules

### Separation of Concerns
```
Routes (thin) → Services (business logic) → Repositories (DB) → Models (schema)
                     ↓
              ML Module (pipeline, metrics, training)
                     ↓
              Storage Abstraction (file I/O)
```

1. **Routes** validate input and return responses. No business logic in route handlers.
2. **Services** contain all business logic. Services are testable without HTTP.
3. **Repositories** handle database queries. No SQL in services.
4. **ML module** is independent of the web framework. It accepts DataFrames and returns results.
5. **Storage** abstracts file I/O behind an interface. Never use raw file paths in services.

### API Design
- All endpoints prefixed with `/api/v1/`
- Use consistent error responses: `{"error": {"code": "VALIDATION_ERROR", "message": "..."}}`
- Use proper HTTP status codes (400, 404, 422, 500)
- Long-running operations (training) must NOT block the request
- Response schemas defined in Pydantic; frontend types must mirror them

### Frontend Architecture
- API calls go through `lib/api-client.ts` — never raw fetch in components
- Types defined in `lib/types.ts` — must match backend schemas
- Components are reusable; page-specific logic stays in page files
- Every data-dependent screen must handle: loading, empty, success, error states
- No hardcoded/fabricated data in production components

---

## Project File Structure

```
automlens/
├── frontend/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout with sidebar
│   │   ├── page.tsx                  # Dashboard (project list)
│   │   ├── globals.css               # Global styles
│   │   └── projects/
│   │       └── [projectId]/
│   │           ├── page.tsx          # Project overview
│   │           ├── dataset/
│   │           │   └── page.tsx      # Dataset profile & quality
│   │           ├── train/
│   │           │   └── page.tsx      # Target + config + progress
│   │           ├── results/
│   │           │   └── page.tsx      # Leaderboard + model details
│   │           ├── predict/
│   │           │   └── page.tsx      # Single + batch prediction
│   │           ├── explanations/
│   │           │   └── page.tsx      # SHAP + feature importance
│   │           ├── audit/
│   │           │   └── page.tsx      # Audit timeline
│   │           └── exports/
│   │               └── page.tsx      # Export downloads
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── layout/                   # Sidebar, Header, Breadcrumb
│   │   ├── projects/                 # Project cards, create dialog
│   │   ├── dataset/                  # Upload, profile, quality
│   │   ├── training/                 # Config, progress, models
│   │   ├── predictions/              # Forms, results, batch
│   │   ├── explanations/             # SHAP charts, importance
│   │   └── audit/                    # Timeline component
│   ├── lib/
│   │   ├── api-client.ts            # Typed API client
│   │   ├── types.ts                 # Shared TypeScript types
│   │   └── utils.ts                 # Utility functions
│   ├── hooks/                        # Custom React hooks
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── .eslintrc.json
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app creation & SSE hub
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py         # Aggregate v1 routes
│   │   │       ├── routes/
│   │   │       │   ├── projects.py
│   │   │       │   ├── datasets.py
│   │   │       │   ├── profiling.py
│   │   │       │   ├── training.py   # Includes /training/{id}/stream SSE
│   │   │       │   ├── predictions.py
│   │   │       │   ├── explanations.py
│   │   │       │   ├── audit.py      # Persistent audit timeline & decisions
│   │   │       │   └── exports.py
│   │   │       └── schemas/
│   │   │           ├── projects.py
│   │   │           ├── datasets.py
│   │   │           ├── profiling.py
│   │   │           ├── training.py
│   │   │           ├── predictions.py
│   │   │           ├── explanations.py
│   │   │           └── common.py      # Error schemas, pagination
│   │   ├── core/
│   │   │   ├── config.py             # Settings from env vars (DB URL, LLM key)
│   │   │   ├── logging.py            # Structured logging setup
│   │   │   ├── events.py             # SSE Event emitter / pub-sub
│   │   │   └── errors.py             # Exception classes + handlers
│   │   ├── db/
│   │   │   ├── models.py             # SQLAlchemy models (PostgreSQL)
│   │   │   ├── session.py            # DB session management (Async/Sync engine)
│   │   │   └── repositories/
│   │   │       ├── projects.py
│   │   │       ├── datasets.py
│   │   │       ├── runs.py
│   │   │       ├── predictions.py
│   │   │       └── audit.py
│   │   ├── services/
│   │   │   ├── projects.py
│   │   │   ├── datasets.py
│   │   │   ├── profiling.py
│   │   │   ├── preprocessing.py
│   │   │   ├── decision_engine.py    # Hybrid AI candidate selection & dataset reasoning
│   │   │   ├── training.py           # ProcessPoolExecutor parallel execution
│   │   │   ├── predictions.py
│   │   │   ├── explainability.py
│   │   │   ├── audit.py
│   │   │   └── exports.py
│   │   ├── ml/
│   │   │   ├── task_detection.py     # Target analysis, task suggestion
│   │   │   ├── pipeline_factory.py   # sklearn Pipeline construction
│   │   │   ├── metrics.py            # Metric computation
│   │   │   └── model_registry.py     # Available models + configs
│   │   └── storage/
│   │       ├── base.py               # Abstract storage interface
│   │       └── local.py              # Local filesystem implementation
│   ├── tests/
│   │   ├── conftest.py               # Shared fixtures
│   │   ├── test_projects.py
│   │   ├── test_datasets.py
│   │   ├── test_profiling.py
│   │   ├── test_preprocessing.py
│   │   ├── test_training.py
│   │   ├── test_predictions.py
│   │   ├── test_explainability.py
│   │   └── test_audit.py
│   ├── pyproject.toml
│   └── requirements.txt
│
├── data/                              # Runtime data (gitignored)
│   └── automlens.db                   # SQLite database
├── artifacts/                         # Runtime artifacts (gitignored)
│   ├── datasets/
│   ├── models/
│   ├── profiles/
│   └── exports/
├── docs/
│   ├── architecture.md
│   └── api.md
├── .gitignore
├── .env.example
└── README.md
```

---

## Code Conventions

### Python (Backend)
- **Type hints on all function signatures.** No `Any` unless justified.
- **Docstrings** on all public functions — explain WHY, not WHAT.
- **Pydantic models** for all request/response schemas.
- **No bare `except`.** Catch specific exceptions.
- **No `print()` for logging.** Use Python `logging` module.
- **Constants** in `config.py`, not hardcoded in functions.
- **f-strings** for string formatting.
- **Ruff** for formatting and linting.

### TypeScript (Frontend)
- **Strict mode enabled.** No `any` type unless justified.
- **Interface/type** for all API response shapes.
- **Named exports** preferred over default exports.
- **Components use `.tsx` extension.**
- **Hooks** for shared stateful logic.
- **ESLint + Prettier** enforced.

### Both
- **Meaningful names.** `create_training_run()` not `run()`.
- **Small files.** If a file exceeds 300 lines, consider splitting.
- **No dead code.** Remove commented-out code before committing.
- **No TODO in completed features.** If deferred, document explicitly.

---

## ML Correctness Rules (NON-NEGOTIABLE)

These rules are critical for academic credibility. Violating them makes the project fail the viva.

1. **Never fit preprocessing on full dataset before CV.**
   - All imputation, encoding, scaling happens INSIDE each CV fold via `sklearn.Pipeline`.

2. **Require explicit target confirmation.**
   - Task detection is a SUGGESTION. User must confirm or override.

3. **Use 5-fold CV when feasible.**
   - Classification: `StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)`
   - Regression: `KFold(n_splits=5, shuffle=True, random_state=seed)`
   - If class count < 5 per class: reduce folds with warning or reject.

4. **Always include a Dummy Baseline.**
   - Classification: `DummyClassifier(strategy='most_frequent')`
   - Regression: `DummyRegressor(strategy='mean')`
   - If real models don't beat baseline, that's a valid finding.

5. **Record everything for reproducibility.**
   - Random seed, fold count, metric name, model configs, dataset fingerprint, library versions.

6. **Never auto-remove outliers.** Report them; user decides.

7. **Never fabricate metrics, SHAP values, or progress.**
   - If a computation fails, show the failure. Don't show fake success.

8. **Persist the full Pipeline (preprocessing + model).**
   - Predictions must use the EXACT same transformations as training.

9. **Label everything.**
   - "F1 Score (macro)" not just "F1"
   - "Mean |SHAP| via TreeExplainer on 100 samples" not just "SHAP"
   - "Feature importance from model.feature_importances_" not just "importance"

10. **Explain, don't claim.**
    - "Feature attribution explains model behavior, not causation."

---

## Git Workflow Rules (STRICT INDUSTRY FLOW)

### 🚨 ABSOLUTE ZERO-AUTO-GIT RULE:
- **THE AGENT MUST NEVER RUN `git add`, `git commit`, `git push`, `git checkout`, `git branch`, or `git merge` DIRECTLY.**
- Whenever git operations are required (e.g. at the end of a phase or task), the agent must output the exact formatted command block for the USER to review and execute manually in their terminal.

### Remote & Branch Hierarchy
- **Remote Repository:** `https://github.com/pratham9634/Automlens.git`
- **Branch Hierarchy:**
  ```
  main (Production / Stable Releases only)
    ▲
  develop (Active integration & testing branch)
    ▲
  feature/<phase-or-feature-name> (Individual phase/feature work)
  ```
- **Rules:**
  1. **NEVER commit or push directly to `main`.**
  2. All features originate from `develop` (`git checkout -b feature/... develop`).
  3. Feature branches are tested and verified before merging into `develop`.
  4. Only stable, fully tested releases are merged from `develop` into `main`.

### Commit Convention
```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore, style
Scope: backend, frontend, ml, db, api, ui, docker

Examples:
feat(backend): add project CRUD endpoints
feat(frontend): build dataset upload component  
fix(ml): prevent preprocessing leakage in CV folds
test(backend): add profiling edge case tests
docs: update README with setup instructions
```

---

## Phase Execution Protocol

### Before Starting Any Phase or Implementation Increment:
1. State the phase number, goal, and acceptance criteria
2. List the exact files to create/modify with architectural reasons
3. Detail the exact next steps and commands planned
4. **STOP AND WAIT FOR USER APPROVAL** before executing any code, creating files, or installing packages.

### During a Phase:
1. Implement the smallest coherent increment
2. Add tests alongside implementation
3. Run after every significant change:
   - Backend: `pytest`, `ruff check .`, `pyright`
   - Frontend: `npm run lint`, `npm run build`, `npx tsc --noEmit`
4. Fix failures before moving forward

### After Completing a Phase:
1. Run all tests and report results
2. List all files changed
3. List all commands run and their outcomes
4. List known limitations
5. Provide the exact manual git commands for the user to review and execute
6. **STOP and wait for approval before starting the next phase**

### Never Do:
- Begin executing code or installing packages without the user's explicit prior approval of the step plan
- Skip to a later phase
- Implement features not in the current phase
- Claim tests passed without running them
- Leave broken tests or builds
- Silently expand scope
- Replace working code without justification

---

## Mandatory Confirmation Steps

### Ask the user before:
- Starting any phase or code generation increment
- Any git operation (always provide the manual command blocks)
- Changing the database schema after Phase 1
- Adding a new dependency not in the approved stack
- Modifying a previously approved API contract
- Deleting any user data or artifacts
- Making any irreversible architectural change

### Don't ask, just do:
- Running tests
- Running linters
- Creating new files within the approved structure
- Fixing bugs in the current phase
- Adding type hints or docstrings
- Refactoring within a single module

---

## Environment Variables

```env
# Backend
AUTOMLENS_ENV=development
# Local Docker Postgres (or Supabase postgresql://postgres:[pwd]@[host]:5432/postgres)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automlens
AUTOMLENS_MAX_WORKERS=4
AUTOMLENS_ARTIFACT_DIR=./artifacts
AUTOMLENS_MAX_UPLOAD_MB=50
AUTOMLENS_MAX_ROWS=100000
AUTOMLENS_MAX_COLUMNS=200
AUTOMLENS_CORS_ORIGINS=http://localhost:3000
AUTOMLENS_LOG_LEVEL=INFO

# AI Enrichment via OpenRouter (Hybrid fallback works 100% offline without this)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| ML Logic | pytest | Pipeline construction, metrics, task detection, leakage prevention |
| Services | pytest | Business logic with mock repositories |
| API | pytest + httpx | Request/response, validation, error codes |
| Frontend | TypeScript compiler | Type correctness |
| Frontend | ESLint | Code quality |
| Frontend | Next.js build | No build errors |
| E2E | Manual + script | Full workflow with test datasets |

### Test datasets:
- **Titanic** (classification, mixed types, missing values)
- **California Housing** (regression, all numeric)
- **Edge case datasets** (empty, single column, all missing, tiny)

---

## Scope Boundaries

### ✅ In Scope (Minor Project)
- Project CRUD
- CSV/Excel upload with validation
- Dataset profiling & data quality report
- Target selection & task confirmation
- Leakage-safe preprocessing pipeline
- Multi-model training with 5-fold CV
- Model leaderboard & selection
- Single & batch prediction
- Global feature importance
- Global & local SHAP (with limits)
- Audit timeline (action/reason/evidence/result)
- Basic exports
- Responsive web UI

### ❌ Out of Scope (Major Project / Future)
- Conversational AI analyst / chatbot
- Advanced hyperparameter tuning
- What-if / counterfactual analysis
- Model cards & reliability views
- Multi-experiment comparison
- Advanced MLOps / monitoring
- Multi-user authentication (Clerk)
- Docker / Kubernetes deployment
- Time-series or image data
- Deep learning models
- Automated feature engineering
