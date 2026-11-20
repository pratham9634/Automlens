"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface ELI5Definition {
  academic: string;
  simple: string;
  analogy: string;
}

export const ELI5_DICTIONARY: Record<string, ELI5Definition> = {
  stratified_cv: {
    academic: "Stratified 5-Fold Cross-Validation",
    simple: "Tested on 5 Unseen Exam Batches",
    analogy: "Splits data into 5 fair slices so the model can't memorize the answers.",
  },
  f1_macro: {
    academic: "Macro-Averaged F1-Score",
    simple: "Balanced Fair Score",
    analogy: "Evaluates rare and common categories with equal respect.",
  },
  rmse: {
    academic: "Root Mean Squared Error (RMSE)",
    simple: "Average Prediction Error",
    analogy: "How far off predictions are on average, penalizing huge misses heavily.",
  },
  r2: {
    academic: "R² Coefficient of Determination",
    simple: "Variance Explained (0 to 100%)",
    analogy: "How much of the real-world outcome is explained by our input columns.",
  },
  multicollinearity: {
    academic: "High Multicollinearity (|r| ≥ 0.85)",
    simple: "Twin Columns Repeating Info",
    analogy: "Two features telling the exact same story, which can confuse the model.",
  },
  shap: {
    academic: "SHAP Feature Attribution (TreeExplainer)",
    simple: "Decision Tug-of-War",
    analogy: "Shows which facts pulled the final answer towards 'Yes' or pushed it towards 'No'.",
  },
  counterfactual: {
    academic: "Minimum Recourse Counterfactual Analysis",
    simple: "What-If Outcome Flipping",
    analogy: "Finds the smallest change needed to flip an outcome from Denied to Approved.",
  },
  imputation: {
    academic: "Median / Mode Imputation",
    simple: "Smart Blank-Filling",
    analogy: "Fills missing gaps with typical values so no rows have to be thrown out.",
  },
  one_hot: {
    academic: "One-Hot Categorical Encoding",
    simple: "Yes/No Checkbox Format",
    analogy: "Turns word categories into separate 1 or 0 binary columns.",
  },
  dummy_baseline: {
    academic: "Dummy Classifier / Mean Baseline",
    simple: "Naive Guessing Baseline",
    analogy: "A benchmark that always guesses the most common class to prove the real model is learning.",
  },
  data_leakage: {
    academic: "Zero-Leakage Fold Encapsulation",
    simple: "Cheat-Proof Exam Isolation",
    analogy: "Guarantees that test folds are strictly hidden until the model finishes training.",
  },
  data_quality_score: {
    academic: "Composite Data Quality Health Score",
    simple: "Overall Data Cleanliness Score",
    analogy: "A hygiene grade out of 100 based on missing values, duplicates, and outliers.",
  },
  iqr_outliers: {
    academic: "Interquartile Range (IQR) Boundary Outliers",
    simple: "Extreme Unusual Numbers",
    analogy: "Data points far outside the normal middle 50% pack, reported without auto-deletion.",
  },
  constant_columns: {
    academic: "Zero-Variance Constant Features",
    simple: "Frozen Unchanging Columns",
    analogy: "Columns where every single row has the identical value, offering zero clues to learn from.",
  },
  high_cardinality: {
    academic: "High-Cardinality Categorical Feature",
    simple: "Too Many Unique Category Names",
    analogy: "A column with dozens of distinct text values that needs smart grouping or encoding.",
  },
  high_missingness: {
    academic: "Severe Feature Missingness (>30%)",
    simple: "Lots of Blank Holes",
    analogy: "A column with more than 30% empty cells that needs automatic imputation or safe dropping.",
  },
  pearson_correlation: {
    academic: "Pairwise Pearson Linear Correlation",
    simple: "Directional Trend Lock",
    analogy: "Measures whether two numbers go up together (+1.0) or opposite ways (-1.0).",
  },
};

interface ELI5ContextType {
  isELI5: boolean;
  toggleELI5: () => void;
  getTerm: (key: string) => ELI5Definition;
}

const ELI5Context = createContext<ELI5ContextType>({
  isELI5: false,
  toggleELI5: () => {},
  getTerm: (key: string) => ELI5_DICTIONARY[key] || { academic: key, simple: key, analogy: "" },
});

export function ELI5Provider({ children }: { children: React.ReactNode }) {
  const [isELI5, setIsELI5] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("automlens_eli5_enabled");
      if (stored === "true") {
        setIsELI5(true);
      }
    }
  }, []);

  const toggleELI5 = () => {
    setIsELI5((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("automlens_eli5_enabled", String(next));
        window.dispatchEvent(new CustomEvent("automlens_eli5_toggled", { detail: next }));
      }
      return next;
    });
  };

  const getTerm = (key: string): ELI5Definition => {
    return ELI5_DICTIONARY[key] || { academic: key, simple: key, analogy: "" };
  };

  return (
    <ELI5Context.Provider value={{ isELI5, toggleELI5, getTerm }}>
      {children}
    </ELI5Context.Provider>
  );
}

export function useELI5() {
  return useContext(ELI5Context);
}
