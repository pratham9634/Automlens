export interface StorySceneData {
  id: string;
  chapterLabel: string;
  chapterNumber: string;
  headline: string;
  narrative: string;
  technicalAnnotation: string;
  badge: string;
}

export const STORY_SCENES: StorySceneData[] = [
  {
    id: "arrival",
    chapterLabel: "01 / INGESTION",
    chapterNumber: "01",
    headline: "Every great model starts with data.",
    narrative:
      "Bring your tabular dataset into AutoMLens. Your data becomes the foundation for every experiment that follows.",
    technicalAnnotation:
      "customer_churn.csv · 10,000 rows × 18 columns · Mixed numerical & categorical types",
    badge: "RAW DATA INGESTION",
  },
  {
    id: "discovery",
    chapterLabel: "02 / DATA PROFILING",
    chapterNumber: "02",
    headline: "Understand your data before you train.",
    narrative:
      "Automatically inspect statistical summaries, distributions, missing values, outliers and potential data-quality issues.",
    technicalAnnotation:
      "Distribution: Right-skewed (MonthlyCharges) · 11 missing cells in TotalCharges · 24 outlier flags",
    badge: "AUTOMATED PROFILING",
  },
  {
    id: "decision",
    chapterLabel: "03 / TARGET SELECTION",
    chapterNumber: "03",
    headline: "Define what your model needs to learn.",
    narrative:
      "AutoMLens suggests the prediction task based on your data. You stay in control of the target column, problem type and evaluation metric.",
    technicalAnnotation:
      "Target: 'Churn' (Binary 0/1) · Suggested: Classification · Metric: Macro F1 · Confirmed by user",
    badge: "HUMAN IN THE LOOP",
  },
  {
    id: "experiment",
    chapterLabel: "04 / MODEL TRAINING",
    chapterNumber: "04",
    headline: "One dataset. Multiple experiments.",
    narrative:
      "Leakage-safe preprocessing and five-fold cross-validation evaluate candidate models through consistent validation workflows.",
    technicalAnnotation:
      "StratifiedKFold (k=5) · In-Fold Preprocessing (Impute + Encode + Scale) · DummyClassifier Baseline",
    badge: "LEAKAGE-SAFE 5-FOLD CV",
  },
  {
    id: "competition",
    chapterLabel: "05 / MODEL EVALUATION",
    chapterNumber: "05",
    headline: "Compare. Validate. Choose your champion.",
    narrative:
      "Compare candidate models using consistent evaluation metrics, inspect fold-level performance and select your preferred model.",
    technicalAnnotation:
      "Champion: HistGradientBoosting (Macro F1: 0.862) · Baseline: DummyClassifier (0.380) · 5/5 Folds Validated",
    badge: "LEADERBOARD TOURNAMENT",
  },
  {
    id: "explanation",
    chapterLabel: "06 / EXPLAINABILITY",
    chapterNumber: "06",
    headline: "A prediction should never be a mystery.",
    narrative:
      "Explore feature importance and SHAP explanations to understand which variables contribute to model predictions.",
    technicalAnnotation:
      "TreeExplainer SHAP Values (100 background samples) · Feature attribution explains model behavior, not causation",
    badge: "TREEEXPLAINER SHAP",
  },
  {
    id: "outcome",
    chapterLabel: "07 / INFERENCE & EXPORT",
    chapterNumber: "07",
    headline: "From experimentation to reproducible predictions.",
    narrative:
      "Use your selected model for predictions, inspect its experiment history and export reusable artifacts.",
    technicalAnnotation:
      "Artifact: model.joblib (14.2 MB) · Seed: 42 · Scikit-Learn 1.4 · Full Pipeline Serialized",
    badge: "AUDIT & EXPORT ARTIFACTS",
  },
];

export const DEMO_DATASET_ROWS = [
  { tenure: 12, monthly: 65.4, total: "784.80", contract: "Month-to-month", internet: "Fiber optic", churn: "No" },
  { tenure: 48, monthly: 92.15, total: "4423.20", contract: "One year", internet: "DSL", churn: "No" },
  { tenure: 2, monthly: 29.85, total: "NaN", contract: "Month-to-month", internet: "DSL", churn: "Yes" },
  { tenure: 70, monthly: 104.2, total: "7294.00", contract: "Two year", internet: "Fiber optic", churn: "No" },
];

export const LEADERBOARD_ROWS = [
  {
    rank: "01",
    model: "HistGradientBoosting",
    family: "Boosting",
    macroF1: "0.862",
    accuracy: "0.894",
    status: "5/5 Folds",
    isChampion: true,
  },
  {
    rank: "02",
    model: "Random Forest",
    family: "Ensemble",
    macroF1: "0.844",
    accuracy: "0.881",
    status: "5/5 Folds",
    isChampion: false,
  },
  {
    rank: "03",
    model: "Logistic Regression",
    family: "Linear",
    macroF1: "0.792",
    accuracy: "0.835",
    status: "5/5 Folds",
    isChampion: false,
  },
  {
    rank: "04",
    model: "DummyClassifier",
    family: "Baseline",
    macroF1: "0.380",
    accuracy: "0.510",
    status: "Baseline Anchor",
    isChampion: false,
  },
];

export const SHAP_FEATURE_ITEMS = [
  { name: "Tenure", impact: "+0.34", direction: "positive", desc: "Longer tenure strongly decreases churn risk" },
  { name: "Contract Type (Month-to-month)", impact: "-0.28", direction: "negative", desc: "Monthly flexibility increases churn likelihood" },
  { name: "Monthly Charges", impact: "-0.21", direction: "negative", desc: "High monthly cost increases churn pressure" },
  { name: "Internet Service (Fiber Optic)", impact: "-0.18", direction: "negative", desc: "Higher churn rate compared to DSL" },
  { name: "Support Calls (>3)", impact: "-0.14", direction: "negative", desc: "Multiple support contacts signal customer friction" },
  { name: "Total Charges", impact: "+0.12", direction: "positive", desc: "Cumulative investment correlates with customer retention" },
];
