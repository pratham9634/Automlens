# AutoMLens — Human-Assisted AutoML Platform for Tabular Data

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014%20(App%20Router)-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)](https://www.typescriptlang.org/)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn%201.5%2B-orange.svg)](https://scikit-learn.org/)
[![Ollama](https://img.shields.io/badge/Local%20AI-Ollama%20(qwen2.5%3A3b)-purple.svg)](https://ollama.ai/)
[![SHAP](https://img.shields.io/badge/Explainability-SHAP%20XAI-green.svg)](https://shap.readthedocs.io/)
[![Tests](https://img.shields.io/badge/Tests-66%2F66%20Passing-brightgreen.svg)]()
[![Code Style](https://img.shields.io/badge/Lint-Ruff%20%7C%20ESLint-blueviolet.svg)]()

> **B.Tech Final-Year Minor Project** (October–December 2026)  
> **Author & Solo Developer:** Pratham Petwal  
> **Project Repository:** [https://github.com/pratham9634/Automlens.git](https://github.com/pratham9634/Automlens.git)

---

## 📖 Executive Summary

Most automated machine learning (AutoML) frameworks operate as opaque black boxes: they fit preprocessing steps across the entire dataset prior to cross-validation (introducing severe **data leakage**), train complex black-box models without evaluating whether they beat simple heuristic baselines, fail to explain their engineering decisions, and lack verifiable audit trails.

**AutoMLens** is an academically rigorous, human-in-the-loop AutoML platform engineered specifically for tabular data. It guarantees mathematical correctness across the entire machine learning lifecycle:
1. **Zero Data Leakage:** All imputation, encoding, scaling, custom feature extractions, and dimensionality reduction are encapsulated inside `sklearn.Pipeline` objects and fitted strictly within each cross-validation fold.
2. **Intent-Guided AI & Real-Time Reasoning:** Users can specify a natural language modeling goal. A local Ollama instance running **`qwen2.5:3b`** streams its step-by-step reasoning tokens live over Server-Sent Events (SSE).
3. **Automated Feature Extraction & Cleaning:** Automated temporal date decomposition (`DateTimeFeatureExtractor`), numeric interaction ratios (`InteractionFeatureExtractor`), and outlier winsorization (`OutlierCapper`).
4. **Comprehensive 24-Model Suite:** Evaluates up to 24 diverse algorithms across linear models, tree ensembles, gradient boosting, support vector machines, nearest neighbors, and neural networks.
5. **Interactive Human Approval Gate:** Prepares all preprocessing and model recommendations autonomously, pausing at a single-click checkpoint where humans can review, add extra models, or modify evaluation metrics before training.
6. **Mandatory Baseline Benchmark:** Every model leaderboard is measured against a deterministic Dummy Baseline (`DummyClassifier` / `DummyRegressor`) to mathematically prove empirical learning (Rule 4).
7. **Game-Theoretic Explainability:** Local and global model interpretability using SHAP (`TreeExplainer` & `LinearExplainer`) with academic causation disclaimers.
8. **Immutable Audit Ledger:** Every transformation, training event, and prediction is timestamped and recorded in an audit trail for viva defense and compliance.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Frontend ["Frontend Layer (Next.js 14 App Router + Tailwind + shadcn/ui)"]
        UI["Modern Responsive Workspace UI"]
        Terminal["Live AI Reasoning Terminal (qwen2.5:3b Stream)"]
        ApprovalGate["Human Approval Gate (24 Models)"]
        SSE_Client["SSE Subscriber (Real-Time Telemetry)"]
        API_Client["Typed API Client (lib/api-client.ts)"]
        Charts["Recharts Visualizations (SHAP, Metrics, Distributions)"]
    end

    subgraph Backend ["Backend API Layer (FastAPI + Pydantic v2)"]
        Router["API v1 Aggregator (/api/v1)"]
        SSE_Hub["In-Memory Event Hub (app/core/events.py)"]
        
        subgraph Services ["Modular Business Logic Services"]
            Proj_Svc["ProjectService"]
            Data_Svc["DatasetService"]
            Prof_Svc["ProfilingService"]
            Dec_Svc["DecisionEngineService (Ollama / OpenRouter / Offline)"]
            Train_Svc["TrainingService (ProcessPoolExecutor)"]
            Pred_Svc["PredictionService"]
            Exp_Svc["ExplainabilityService (SHAP)"]
            Audit_Svc["AuditService"]
            Export_Svc["ExportService"]
        end

        subgraph Repositories ["Database Abstraction (SQLAlchemy 2.0)"]
            DB_Repos["Project, Dataset, Run, Prediction & Audit Repositories"]
        end
    end

    subgraph ML_Engine ["Core ML Execution Engine (Zero-Leakage)"]
        Factory["PipelineFactory (ColumnTransformer + Custom Transformers)"]
        Registry["ModelRegistry (24 Tabular Algorithms)"]
        CV_Engine["5-Fold Stratified / K-Fold Engine"]
        Baseline["Dummy Baseline Estimators (Rule 4)"]
        WorkerPool["Multi-Core ProcessPoolExecutor"]
        ShapEngine["SHAP Explainers (Tree / Linear)"]
    end

    subgraph Storage ["Persistence & AI Layer"]
        DB[(PostgreSQL / SQLite Storage)]
        ArtifactStore["Local Filesystem Artifact Store (artifacts/)"]
        Ollama["Local Ollama API (qwen2.5:3b at localhost:11434)"]
        OpenRouter["OpenRouter LLM API (Fallback Rationale)"]
    end

    UI --> API_Client
    UI --> Terminal
    Terminal -.-> SSE_Hub
    ApprovalGate --> API_Client
    API_Client --> Router
    Router --> Services
    Services --> DB_Repos
    DB_Repos --> DB
    Dec_Svc --> Ollama
    Dec_Svc -.-> OpenRouter
    Train_Svc --> WorkerPool
    WorkerPool --> Factory
    Factory --> Registry
    Factory --> CV_Engine
    CV_Engine --> Baseline
    Train_Svc -.-> SSE_Hub
    Exp_Svc --> ShapEngine
    Services --> ArtifactStore
```

---

## ⚡ Core Features & Capabilities

### 1. Intent-Guided AI Modeling & Live Streaming Terminal
- **Natural Language Objective Guidance:** Users can specify modeling goals (e.g., *"Predict customer churn risk and extract tenure from signup date"*).
- **Live AI Reasoning Terminal:** Real-time token streaming from local **`qwen2.5:3b`** via Server-Sent Events (SSE). Users watch the AI analyze metadata, distributions, and formulate feature extraction steps live.
- **Resilient Offline Fallback:** If Ollama is offline, automatically switches to the deterministic heuristic rule engine without throwing errors.

### 2. Zero-Intervention Automated Feature Extraction (Rule 1)
- **`DateTimeFeatureExtractor`:** Automatically detects datetime columns and extracts calendar components (`year`, `month`, `day`, `dayofweek`, `is_weekend`) with fold-safe imputation.
- **`InteractionFeatureExtractor`:** Computes numeric ratios, products, and differences with robust zero-division protection.
- **`OutlierCapper`:** Learns Tukey IQR bounds strictly on training folds and winsorizes values during transformation.
- **Dynamic Dimensionality Reduction:** Automatic `PCA` / `SelectKBest` integration when feature count is high ($P > 30$ or $P > N$).

### 3. Expanded 24-Model Algorithm Catalog
- **Classification (12):** Dummy Classifier (Rule 4 Baseline), Logistic Regression, Ridge Classifier, Random Forest, Extra Trees, HistGradientBoosting, LightGBM, XGBoost, Linear SVC (Calibrated), K-Nearest Neighbors, MLP Neural Network, AdaBoost.
- **Regression (12):** Dummy Regressor (Rule 4 Baseline), Ridge, Lasso, ElasticNet, Random Forest, Extra Trees, HistGradientBoosting, LightGBM, XGBoost, Linear SVR, K-Nearest Neighbors, MLP Regressor.

### 4. Interactive Human Approval Gate
- Automates data cleaning, scaling, feature extraction, and algorithm recommendations with zero human effort.
- Pauses at an approval threshold: users inspect the AI's blueprint, check/uncheck any of the 24 models, adjust metrics, and click **"Approve & Launch Model Training"**.

### 5. Parallel Multi-Core 5-Fold Cross-Validation
- Multi-process worker pool (`ProcessPoolExecutor`) distributes model training across CPU cores.
- Evaluates macro-averaged metrics (Accuracy, F1 Macro, Precision Macro, Recall Macro, ROC-AUC for classification; $R^2$, RMSE, MAE for regression) with mean and standard deviation across folds.

### 6. Game-Theoretic Explainability (SHAP XAI)
- **Global Feature Importance:** Top features ranked by Mean $|SHAP|$ attribution using `TreeExplainer` or `LinearExplainer`.
- **Local Waterfall Attributions:** Single-observation waterfall breakdown revealing which features influenced the prediction.
- Academic disclaimer banner: *"Feature attribution explains model behavior, not causation."*

### 7. Immutable Audit Ledger & Reproducibility Hub
- Persistent chronological audit trail (`AuditEvent`) with SHA-256 integrity checksums.
- Downloadable artifacts: `quality_report.json`, `leaderboard.csv`, `predictions.csv`, `run_manifest.json`, `pipeline.joblib`, and `audit_ledger.json`.

---

## 🛠️ Technology Stack

```
AutoMLens
├── Frontend
│   ├── Framework: Next.js 14+ (App Router)
│   ├── Language: TypeScript (Strict Mode)
│   ├── Styling: Tailwind CSS
│   ├── Components: Radix UI / shadcn/ui
│   ├── Charts: Recharts
│   └── Real-Time: Server-Sent Events (SSE) EventSource & ReadableStream
│
├── Backend
│   ├── Framework: FastAPI 0.111+
│   ├── Language: Python 3.11+
│   ├── Validation: Pydantic v2
│   ├── Concurrency: ProcessPoolExecutor + BackgroundTasks
│   ├── Database: PostgreSQL via SQLAlchemy 2.0 (SQLite for tests)
│   ├── Code Quality: Ruff (100-char line limit, strict rules)
│   └── Testing: pytest + httpx (66 automated tests)
│
└── Machine Learning & AI
    ├── Core ML: scikit-learn (Pipelines, ColumnTransformer, StratifiedKFold)
    ├── Boosters: XGBoost, LightGBM
    ├── Custom Transformers: DateTimeFeatureExtractor, InteractionFeatureExtractor, OutlierCapper
    ├── Model Registry: 24 Tabular Models (Classification & Regression)
    ├── Local AI: Ollama (qwen2.5:3b) via OpenAI SDK (AsyncOpenAI)
    ├── Explainability: SHAP (TreeExplainer, LinearExplainer)
    └── Serialization: joblib
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Ollama** installed with `qwen2.5:3b` pulled:
  ```bash
  ollama pull qwen2.5:3b
  ollama serve
  ```

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows

pip install -r requirements.txt
cp .env.example .env

# Run Backend
python -m uvicorn app.main:app --reload --port 8000
```
Backend API will be live at `http://localhost:8000` (Swagger docs: `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at `http://localhost:3000`.

---

## 🧪 Automated Test Suite Verification

AutoMLens includes **66 automated tests** verifying every component from custom transformers to full end-to-end workflows:

```bash
# Run complete test suite in backend
cd backend
python -m pytest

# Run Ruff linter
python -m ruff check .

# Verify frontend types, ESLint, and production build
cd ../frontend
npx tsc --noEmit
npm run lint
npm run build
```

---

## 👤 Author & Acknowledgments

- **Pratham Petwal** — Developer, Machine Learning Engineering, System Architecture.
- B.Tech Computer Science & Engineering (Final-Year Minor Project, 2026).
