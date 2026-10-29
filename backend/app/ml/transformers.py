"""Leakage-Free Feature Engineering & Transformation Transformers (Rule 1 & Rule 8).

Encapsulates automated date/time decomposition, numeric interaction ratios, and outlier
winsorization into standard Scikit-Learn transformers fit exclusively inside CV folds.
"""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


class DateTimeFeatureExtractor(BaseEstimator, TransformerMixin):
    """Decomposes datetime and timestamp strings into numerical calendar components.

    Extracts: [year, month, day, dayofweek, is_weekend].
    Safely imputes missing or unparseable timestamps with training-set medians to prevent leakage.
    """

    def __init__(self, columns: list[str] | None = None) -> None:
        self.columns = columns or []
        self.medians_: dict[str, list[float]] = {}
        self.feature_names_out_: list[str] = []

    def fit(self, X: Any, y: Any = None) -> "DateTimeFeatureExtractor":
        """Compute training median values for calendar components."""
        df = pd.DataFrame(X, columns=self.columns) if not isinstance(X, pd.DataFrame) else X
        cols = self.columns if self.columns else list(df.columns)

        self.medians_ = {}
        self.feature_names_out_ = []

        for col in cols:
            dt_series = pd.to_datetime(df[col], errors="coerce")
            y_med = (
                float(dt_series.dt.year.median())
                if not dt_series.dt.year.dropna().empty
                else 2020.0
            )
            m_med = (
                float(dt_series.dt.month.median())
                if not dt_series.dt.month.dropna().empty
                else 1.0
            )
            d_med = (
                float(dt_series.dt.day.median())
                if not dt_series.dt.day.dropna().empty
                else 1.0
            )
            dow_med = (
                float(dt_series.dt.dayofweek.median())
                if not dt_series.dt.dayofweek.dropna().empty
                else 0.0
            )

            self.medians_[col] = [y_med, m_med, d_med, dow_med]
            self.feature_names_out_.extend(
                [
                    f"{col}_year",
                    f"{col}_month",
                    f"{col}_day",
                    f"{col}_dayofweek",
                    f"{col}_is_weekend",
                ]
            )

        return self

    def transform(self, X: Any) -> np.ndarray:
        """Decompose datetime columns into numeric feature matrix."""
        df = pd.DataFrame(X, columns=self.columns) if not isinstance(X, pd.DataFrame) else X
        cols = self.columns if self.columns else list(df.columns)
        extracted_arrays: list[np.ndarray] = []

        for col in cols:
            dt_series = pd.to_datetime(df[col], errors="coerce")
            med = self.medians_.get(col, [2020.0, 1.0, 1.0, 0.0])

            year = dt_series.dt.year.fillna(med[0]).to_numpy().astype(float)
            month = dt_series.dt.month.fillna(med[1]).to_numpy().astype(float)
            day = dt_series.dt.day.fillna(med[2]).to_numpy().astype(float)
            dow = dt_series.dt.dayofweek.fillna(med[3]).to_numpy().astype(float)
            is_weekend = (dow >= 5).astype(float)

            col_matrix = np.column_stack([year, month, day, dow, is_weekend])
            extracted_arrays.append(col_matrix)

        if not extracted_arrays:
            return np.empty((len(df), 0))

        return np.hstack(extracted_arrays)

    def get_feature_names_out(self, input_features: Any = None) -> np.ndarray:
        """Return generated feature names."""
        return np.array(self.feature_names_out_)


class InteractionFeatureExtractor(BaseEstimator, TransformerMixin):
    """Safely calculates interaction terms (ratios, products, differences) between numeric pairs."""

    def __init__(self, interactions: list[tuple[str, str, str]] | None = None) -> None:
        """Args: interactions: list of (col1, col2, operation) where op is 'ratio' or 'product'."""
        self.interactions = interactions or []
        self.feature_names_out_: list[str] = []

    def fit(self, X: Any, y: Any = None) -> "InteractionFeatureExtractor":
        """Validate interaction column names and configure feature names."""
        self.feature_names_out_ = []
        for c1, c2, op in self.interactions:
            self.feature_names_out_.append(f"{c1}_{op}_{c2}")
        return self

    def transform(self, X: Any) -> np.ndarray:
        """Compute mathematical interactions with robust zero-division handling."""
        df = pd.DataFrame(X) if not isinstance(X, pd.DataFrame) else X
        if not self.interactions:
            return np.empty((len(df), 0))

        results: list[np.ndarray] = []
        for c1, c2, op in self.interactions:
            v1 = pd.to_numeric(df[c1], errors="coerce").fillna(0.0).to_numpy()
            v2 = pd.to_numeric(df[c2], errors="coerce").fillna(0.0).to_numpy()

            if op == "ratio":
                # Avoid zero division and infinities
                safe_denom = np.where(np.abs(v2) < 1e-5, 1e-5, v2)
                res = v1 / safe_denom
                res = np.nan_to_num(res, nan=0.0, posinf=1e5, neginf=-1e5)
            elif op == "product":
                res = v1 * v2
            elif op == "difference":
                res = v1 - v2
            else:
                res = v1

            results.append(res.reshape(-1, 1))

        return np.hstack(results)

    def get_feature_names_out(self, input_features: Any = None) -> np.ndarray:
        """Return names of generated interaction columns."""
        return np.array(self.feature_names_out_)


class OutlierCapper(BaseEstimator, TransformerMixin):
    """Winsorizes numeric features to IQR bounds learned strictly on the training fold (Rule 1)."""

    def __init__(self, factor: float = 1.5) -> None:
        self.factor = factor
        self.lower_bounds_: np.ndarray | None = None
        self.upper_bounds_: np.ndarray | None = None

    def fit(self, X: Any, y: Any = None) -> "OutlierCapper":
        """Compute IQR clipping boundaries strictly on the training split."""
        arr = np.asarray(X, dtype=float)
        q25 = np.nanpercentile(arr, 25, axis=0)
        q75 = np.nanpercentile(arr, 75, axis=0)
        iqr = q75 - q25

        self.lower_bounds_ = q25 - self.factor * iqr
        self.upper_bounds_ = q75 + self.factor * iqr
        return self

    def transform(self, X: Any) -> np.ndarray:
        """Clip feature values to learned fold boundaries."""
        arr = np.asarray(X, dtype=float)
        if self.lower_bounds_ is None or self.upper_bounds_ is None:
            return arr

        clipped = np.clip(arr, self.lower_bounds_, self.upper_bounds_)
        return np.nan_to_num(clipped, nan=0.0)

    def get_feature_names_out(self, input_features: Any = None) -> Any:
        """Passthrough feature names."""
        return input_features
