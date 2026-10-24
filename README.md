# AutoMLens

> **Human-Assisted AutoML Platform for Tabular Data**  
> *A transparent, leakage-safe automated machine learning system with human-in-the-loop decision auditing, multi-core parallel cross-validation, and game-theoretic SHAP explainability.*

---

## 🚀 Key Features

- **Automated Data Profiling & Quality Engine:** Automatic detection of skewness, missingness, outliers, and data types with strict leakage prevention.
- **Hybrid AI Decision System:** Deterministic heuristic rules for candidate algorithm selection combined with LLM-powered engineering rationale.
- **Multi-Core Parallel Training:** Asynchronous 5-fold cross-validation running across CPU cores via Python `ProcessPoolExecutor`.
- **Real-Time Activity Streaming:** Live Server-Sent Events (SSE) console broadcasting data cleaning steps, candidate evaluations, and fold-level metrics.
- **Model Leaderboard & Selection:** Transparent evaluation across macro metrics against a strict dummy baseline benchmark.
- **Explainable AI (XAI):** Game-theoretic global and local SHAP feature attribution (via `TreeExplainer` & `LinearExplainer`).
- **Audit Timeline:** Complete immutable ledger tracking every decision, transformation reason, and empirical evidence.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** FastAPI, Python 3.11+, Pydantic v2, SQLAlchemy 2.0
- **Database:** PostgreSQL (Docker / Supabase)
- **ML & Explainability:** scikit-learn, Pandas, NumPy, SHAP, joblib
- **Real-Time:** Server-Sent Events (SSE)

---

## 📜 Git Branch Hierarchy

- `main` — Production & stable releases only
- `develop` — Active integration and staging branch
- `feature/<name>` — Isolated feature development branches
