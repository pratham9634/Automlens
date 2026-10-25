"""Statistical profiling and data quality service for tabular datasets.

Computes univariate metrics, distribution histograms, IQR-based outlier boundaries,
and correlation matrices. Persists deterministic profiles as JSON artifacts.
"""

import io
import json
import math
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.api.v1.schemas.profiling import (
    CategoricalColumnProfile,
    CategoryFrequency,
    CorrelationMatrix,
    DataQualityWarning,
    DatasetProfileResponse,
    HighCorrelationPair,
    HistogramBin,
    NumericColumnProfile,
)
from app.core.errors import (
    DatasetNotFoundError,
    DatasetValidationError,
    ProfileNotFoundError,
    ProjectNotFoundError,
)
from app.core.logging import get_logger
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.storage.base import StorageBackend
from app.storage.local import LocalStorageBackend

logger = get_logger("services.profiling")

PROFILE_SUBFOLDER = "profiles"
PROFILE_FILENAME = "profile.json"


def _safe_float(val: float | None) -> float | None:
    """Sanitize float values to guarantee valid JSON serialization (no NaN / Inf)."""
    if val is None or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)


def _is_numeric_feature(series: pd.Series) -> bool:
    """Return True if series is a genuine continuous/discrete number (excluding bool & datetime)."""
    return (
        pd.api.types.is_numeric_dtype(series)
        and not pd.api.types.is_bool_dtype(series)
        and not pd.api.types.is_datetime64_any_dtype(series)
    )


class ProfilingService:
    """Orchestrates deep statistical analysis and data quality scoring."""

    def __init__(self, db: Session, storage: StorageBackend | None = None):
        self.db = db
        self.storage = storage or LocalStorageBackend()
        self.project_repo = ProjectRepository(db)
        self.dataset_repo = DatasetRepository(db)

    def _load_dataframe(self, project_id: str, filename: str, raw_bytes: bytes) -> pd.DataFrame:
        """Parse raw file bytes into a Pandas DataFrame using robust encodings."""
        lower_name = filename.lower()
        try:
            if lower_name.endswith(".csv"):
                try:
                    return pd.read_csv(io.BytesIO(raw_bytes), encoding="utf-8")
                except UnicodeDecodeError:
                    return pd.read_csv(io.BytesIO(raw_bytes), encoding="latin1")
            elif lower_name.endswith((".xlsx", ".xls")):
                return pd.read_excel(io.BytesIO(raw_bytes))
            else:
                raise DatasetValidationError(f"Cannot parse unsupported file format: {filename}")
        except Exception as exc:
            logger.error("Failed to parse dataset for profiling: %s", exc)
            raise DatasetValidationError(
                f"Could not load data for statistical profiling: {exc}"
            ) from exc

    def generate_profile(self, project_id: str) -> DatasetProfileResponse:
        """Compute full statistical profile and data quality assessment for a project's dataset."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        dataset = self.dataset_repo.get_latest_by_project_id(project_id)
        if not dataset:
            raise DatasetNotFoundError(project_id)

        # Read dataset raw content from storage abstraction
        storage_filename = Path(dataset.storage_path).name
        raw_bytes = self.storage.read_file(project_id, "datasets", storage_filename)
        df = self._load_dataframe(project_id, dataset.filename, raw_bytes)

        total_rows = int(len(df))
        total_columns = int(len(df.columns))
        duplicate_rows_count = int(df.duplicated().sum())
        duplicate_rows_pct = (
            round((duplicate_rows_count / total_rows) * 100.0, 2) if total_rows > 0 else 0.0
        )

        warnings: list[DataQualityWarning] = []
        numeric_profiles: list[NumericColumnProfile] = []
        categorical_profiles: list[CategoricalColumnProfile] = []

        # Duplicate row warning
        if duplicate_rows_count > 0:
            severity = "medium" if duplicate_rows_pct > 5.0 else "low"
            warnings.append(
                DataQualityWarning(
                    severity=severity,
                    code="DUPLICATE_ROWS",
                    column=None,
                    message=(
                        f"Dataset contains {duplicate_rows_count:,} duplicate rows "
                        f"({duplicate_rows_pct}% of total)."
                    ),
                )
            )

        # Identify numeric vs categorical columns
        numeric_cols = [c for c in df.columns if _is_numeric_feature(df[c])]
        categorical_cols = [c for c in df.columns if c not in numeric_cols]

        constant_columns_count = 0
        columns_with_high_outliers = 0
        total_null_cells = int(df.isnull().sum().sum())

        # 1. Profile Numeric Columns
        for col_name in numeric_cols:
            series = df[col_name]
            non_null_series = pd.to_numeric(series.dropna(), errors="coerce")
            non_null_count = int(len(non_null_series))
            null_count = int(series.isnull().sum())
            null_pct = round((null_count / total_rows) * 100.0, 2) if total_rows > 0 else 0.0
            unique_count = int(non_null_series.nunique())
            is_constant = unique_count <= 1

            if is_constant:
                constant_columns_count += 1
                warnings.append(
                    DataQualityWarning(
                        severity="high",
                        code="CONSTANT_COLUMN",
                        column=col_name,
                        message=(
                            f"Numeric feature '{col_name}' has 0 variance (constant value). "
                            "It provides zero predictive signal and should be dropped."
                        ),
                    )
                )

            if null_pct > 30.0:
                warnings.append(
                    DataQualityWarning(
                        severity="high" if null_pct > 50.0 else "medium",
                        code="HIGH_MISSINGNESS",
                        column=col_name,
                        message=(
                            f"Feature '{col_name}' has {null_pct}% missing values. "
                            "Requires robust imputation or column dropping."
                        ),
                    )
                )

            mean_val = _safe_float(non_null_series.mean()) if non_null_count > 0 else None
            std_val = _safe_float(non_null_series.std(ddof=1)) if non_null_count > 1 else 0.0
            min_val = _safe_float(non_null_series.min()) if non_null_count > 0 else None
            max_val = _safe_float(non_null_series.max()) if non_null_count > 0 else None
            q25_val = _safe_float(non_null_series.quantile(0.25)) if non_null_count > 0 else None
            median_val = _safe_float(non_null_series.median()) if non_null_count > 0 else None
            q75_val = _safe_float(non_null_series.quantile(0.75)) if non_null_count > 0 else None

            # Skewness and kurtosis
            skew_val = (
                _safe_float(non_null_series.skew())
                if non_null_count > 2 and (std_val or 0) > 0
                else 0.0
            )
            kurt_val = (
                _safe_float(non_null_series.kurt())
                if non_null_count > 3 and (std_val or 0) > 0
                else 0.0
            )

            # IQR Outlier Detection (Rule 6: Report only; user decides)
            outlier_count = 0
            outlier_pct = 0.0
            if q25_val is not None and q75_val is not None and non_null_count > 4:
                iqr = q75_val - q25_val
                if iqr > 0:
                    lower_bound = q25_val - 1.5 * iqr
                    upper_bound = q75_val + 1.5 * iqr
                    outlier_mask = (non_null_series < lower_bound) | (non_null_series > upper_bound)
                    outlier_count = int(outlier_mask.sum())
                    outlier_pct = round((outlier_count / non_null_count) * 100.0, 2)

                    if outlier_pct > 5.0:
                        columns_with_high_outliers += 1
                        warnings.append(
                            DataQualityWarning(
                                severity="low" if outlier_pct <= 10.0 else "medium",
                                code="OUTLIERS_DETECTED",
                                column=col_name,
                                message=(
                                    f"Feature '{col_name}' contains {outlier_count:,} IQR "
                                    f"outliers ({outlier_pct}%). Never auto-removed."
                                ),
                            )
                        )

            # 10-bin histogram calculation
            histogram_bins: list[HistogramBin] = []
            if non_null_count >= 2 and min_val is not None and max_val is not None:
                if min_val < max_val:
                    counts, bin_edges = np.histogram(non_null_series.to_numpy(), bins=10)
                    for i in range(len(counts)):
                        histogram_bins.append(
                            HistogramBin(
                                bin_start=round(float(bin_edges[i]), 3),
                                bin_end=round(float(bin_edges[i + 1]), 3),
                                count=int(counts[i]),
                            )
                        )
                else:
                    histogram_bins.append(
                        HistogramBin(
                            bin_start=min_val,
                            bin_end=max_val,
                            count=non_null_count,
                        )
                    )

            numeric_profiles.append(
                NumericColumnProfile(
                    name=col_name,
                    dtype=str(series.dtype),
                    count=non_null_count,
                    null_count=null_count,
                    null_percentage=null_pct,
                    unique_count=unique_count,
                    mean=mean_val,
                    std=std_val,
                    min=min_val,
                    max=max_val,
                    q25=q25_val,
                    median=median_val,
                    q75=q75_val,
                    skewness=skew_val,
                    kurtosis=kurt_val,
                    outlier_count=outlier_count,
                    outlier_percentage=outlier_pct,
                    histogram=histogram_bins,
                    is_constant=is_constant,
                )
            )

        # 2. Profile Categorical Columns
        for col_name in categorical_cols:
            series = df[col_name]
            non_null_series = series.dropna().astype(str)
            non_null_count = int(len(non_null_series))
            null_count = int(series.isnull().sum())
            null_pct = round((null_count / total_rows) * 100.0, 2) if total_rows > 0 else 0.0
            unique_count = int(non_null_series.nunique())
            is_constant = unique_count <= 1

            if is_constant:
                constant_columns_count += 1
                warnings.append(
                    DataQualityWarning(
                        severity="high",
                        code="CONSTANT_COLUMN",
                        column=col_name,
                        message=(
                            f"Categorical feature '{col_name}' has 1 distinct category. "
                            "It has zero variance and should be dropped."
                        ),
                    )
                )

            is_high_cardinality = unique_count > 50 or (
                unique_count > 20 and (unique_count / total_rows) > 0.5
            )
            if is_high_cardinality:
                warnings.append(
                    DataQualityWarning(
                        severity="medium",
                        code="HIGH_CARDINALITY",
                        column=col_name,
                        message=(
                            f"Categorical feature '{col_name}' has high cardinality "
                            f"({unique_count:,} unique values). May require encoding."
                        ),
                    )
                )

            if null_pct > 30.0:
                warnings.append(
                    DataQualityWarning(
                        severity="high" if null_pct > 50.0 else "medium",
                        code="HIGH_MISSINGNESS",
                        column=col_name,
                        message=(
                            f"Feature '{col_name}' has {null_pct}% missing values. "
                            "Requires imputation before modeling."
                        ),
                    )
                )

            # Top 10 categories frequency
            top_cats: list[CategoryFrequency] = []
            if non_null_count > 0:
                for val, cnt in non_null_series.value_counts().head(10).items():
                    pct = round((cnt / non_null_count) * 100.0, 2)
                    top_cats.append(
                        CategoryFrequency(
                            value=str(val),
                            count=int(cnt),
                            percentage=pct,
                        )
                    )

            categorical_profiles.append(
                CategoricalColumnProfile(
                    name=col_name,
                    dtype=str(series.dtype),
                    count=non_null_count,
                    null_count=null_count,
                    null_percentage=null_pct,
                    unique_count=unique_count,
                    top_categories=top_cats,
                    is_high_cardinality=is_high_cardinality,
                    is_constant=is_constant,
                )
            )

        # 3. Pearson Correlation Matrix (for numeric features >= 2)
        corr_matrix: CorrelationMatrix | None = None
        if len(numeric_cols) >= 2:
            corr_df = df[numeric_cols].corr(method="pearson")
            matrix_values: list[list[float | None]] = []
            high_corr_pairs: list[HighCorrelationPair] = []

            for i, row_col in enumerate(numeric_cols):
                row_vals: list[float | None] = []
                for j, col_col in enumerate(numeric_cols):
                    raw_val = corr_df.loc[row_col, col_col]
                    val = _safe_float(raw_val)
                    row_vals.append(val)

                    # Multicollinearity check (deduplicated upper triangle)
                    if i < j and val is not None and abs(val) >= 0.85:
                        high_corr_pairs.append(
                            HighCorrelationPair(
                                feature_a=row_col,
                                feature_b=col_col,
                                correlation=val,
                            )
                        )
                        warnings.append(
                            DataQualityWarning(
                                severity="medium",
                                code="HIGH_MULTICOLLINEARITY",
                                column=f"{row_col} & {col_col}",
                                message=(
                                    f"High linear correlation (|r| = {val:.2f}) between "
                                    f"'{row_col}' and '{col_col}'. Risk of multicollinearity."
                                ),
                            )
                        )
                matrix_values.append(row_vals)

            corr_matrix = CorrelationMatrix(
                columns=numeric_cols,
                values=matrix_values,
                high_correlations=high_corr_pairs,
            )

        # 4. Overall Data Quality Health Score (0.0 to 100.0)
        total_cells = max(total_rows * total_columns, 1)
        missing_penalty = min((total_null_cells / total_cells) * 100.0 * 0.5, 30.0)
        dup_penalty = min(duplicate_rows_pct * 0.3, 15.0)
        constant_penalty = min(constant_columns_count * 10.0, 25.0)
        outlier_penalty = min(columns_with_high_outliers * 4.0, 15.0)

        quality_score = max(
            0.0,
            round(100.0 - (missing_penalty + dup_penalty + constant_penalty + outlier_penalty), 1),
        )

        profile_response = DatasetProfileResponse(
            project_id=project_id,
            dataset_id=dataset.id,
            total_rows=total_rows,
            total_columns=total_columns,
            duplicate_rows_count=duplicate_rows_count,
            duplicate_rows_percentage=duplicate_rows_pct,
            quality_score=quality_score,
            warnings=warnings,
            numeric_columns=numeric_profiles,
            categorical_columns=categorical_profiles,
            correlation_matrix=corr_matrix,
            created_at=datetime.now(UTC).isoformat(),
        )

        # 5. Persist Profile JSON artifact
        json_content = profile_response.model_dump_json(indent=2)
        self.storage.save_file(
            project_id,
            PROFILE_SUBFOLDER,
            PROFILE_FILENAME,
            json_content.encode("utf-8"),
        )
        logger.info("Persisted statistical profile for project '%s'", project_id)

        # Update Project status to 'profiled' if currently 'dataset_uploaded'
        if project.status == "dataset_uploaded":
            project.status = "profiled"
            self.project_repo.update(project)

        try:
            from app.services.audit import AuditService

            AuditService(self.db).record_event(
                project_id=project_id,
                action="profile_generated",
                reason=(
                    f"Computed statistical profile for {profile_response.row_count:,} rows "
                    f"and {profile_response.column_count} columns"
                ),
                evidence={
                    "row_count": profile_response.row_count,
                    "column_count": profile_response.column_count,
                    "duplicate_rows": profile_response.duplicate_rows_count,
                    "quality_warnings_count": len(profile_response.quality_warnings),
                },
                result="success",
            )
        except Exception as audit_err:
            logger.warning("Failed to record profile_generated audit event: %s", audit_err)

        return profile_response

    def get_profile(self, project_id: str) -> DatasetProfileResponse:
        """Fetch previously persisted profile artifact from storage."""
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if not self.storage.file_exists(project_id, PROFILE_SUBFOLDER, PROFILE_FILENAME):
            raise ProfileNotFoundError(project_id)

        try:
            raw_bytes = self.storage.read_file(project_id, PROFILE_SUBFOLDER, PROFILE_FILENAME)
            data_dict = json.loads(raw_bytes.decode("utf-8"))
            return DatasetProfileResponse.model_validate(data_dict)
        except Exception as exc:
            logger.error("Failed to read profile artifact for %s: %s", project_id, exc)
            raise ProfileNotFoundError(project_id) from exc
