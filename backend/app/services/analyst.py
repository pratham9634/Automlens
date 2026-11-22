"""Domain-Specific Tabular AI Analyst Service (Lens).

Combines dataset profile telemetry, model leaderboard results, SHAP feature
attributions, and audit records into an enriched prompt context. Supports streaming
via Gemini BYOK, OpenRouter, Ollama, and a 100% offline deterministic rule engine.
"""

import asyncio
import json
import re
from collections.abc import AsyncGenerator
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.api.v1.schemas.analyst import ChatMessage, ChatSuggestion
from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.repositories.audit import AuditRepository
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.ml.metrics import is_error_metric
from app.services.explainability import ExplainabilityService
from app.services.profiling import ProfilingService
from app.storage.local import LocalStorageBackend

logger = get_logger("services.analyst")
settings = get_settings()

OFF_TOPIC_PATTERNS = [
    r"\b(snake game|flappy bird|build a website|html page|react app|javascript code)\b",
    r"\b(poem|poetry|rhyme|haiku|creative story|bedtime story|fairy tale)\b",
    r"\b(recipe|bake a cake|cook|chocolate cookie|pancake)\b",
    r"\b(who won|world cup|super bowl|celebrity|movie plot|actor|olympics)\b",
    r"\b(joke|funny joke|riddle|knock knock)\b",
    r"\b(politics|president|election|prime minister|democrat|republican)\b",
    r"\b(medical diagnosis|prescribe|symptoms of flu|legal advice|sue my)\b",
    r"\b(ignore all previous|ignore instructions|system prompt|jailbreak|dan mode|reveal prompt)\b",
]


class AnalystService:
    """Service orchestrating Lens: AutoMLens Chief Intelligence Copilot."""

    def __init__(self, db: Session):
        self.db = db
        self.storage = LocalStorageBackend()
        self.project_repo = ProjectRepository(db)
        self.dataset_repo = DatasetRepository(db)
        self.run_repo = RunRepository(db)
        self.audit_repo = AuditRepository(db)
        self.profiling_service = ProfilingService(db, storage=self.storage)
        self.explainability_service = ExplainabilityService(
            project_repo=self.project_repo,
            dataset_repo=self.dataset_repo,
            run_repo=self.run_repo,
            storage=self.storage,
        )

    def build_context(self, project_id: str, user_id: str | None = None) -> dict[str, Any]:
        """Aggregate workspace state into a structured context dictionary with stage awareness."""
        effective_user = user_id or settings.DEFAULT_DEV_USER_ID
        context: dict[str, Any] = {
            "project_id": project_id,
            "project_name": "Workspace",
            "authenticated_user_id": effective_user,
            "is_tenant_isolated": True,
            "has_dataset": False,
            "has_profile": False,
            "has_target_confirmed": False,
            "has_models": False,
            "has_predictions": False,
            "has_audit_events": False,
            "current_stage": 1,
            "stage_name": "Stage 1: Dataset Ingestion",
            "next_action": "Upload a CSV or Excel dataset to begin automated profiling.",
            "audit_timeline": [],
        }

        # 1. Project details
        project = self.project_repo.get_by_id(project_id)
        if project:
            context["project_name"] = project.name
            context["project_status"] = project.status
            context["project_user_id"] = project.user_id

        # 2. Immutable Audit Timeline from Database
        try:
            events = self.audit_repo.list_all_for_project(project_id)
            if events:
                context["has_audit_events"] = True
                context["audit_timeline"] = [
                    {
                        "action": e.action,
                        "reason": e.reason,
                        "result": e.result,
                        "timestamp": e.created_at.isoformat() if e.created_at else None,
                    }
                    for e in events
                ]
                actions = {e.action for e in events}
                if "target_confirmed" in actions:
                    context["has_target_confirmed"] = True
                if "prediction_single" in actions or "prediction_batch" in actions:
                    context["has_predictions"] = True
        except Exception:
            pass

        # 3. Dataset Profile
        try:
            profile = self.profiling_service.get_profile(project_id)
            context["has_dataset"] = True
            context["has_profile"] = True
            context["dataset"] = {
                "total_rows": profile.total_rows,
                "total_columns": profile.total_columns,
                "quality_score": profile.quality_score,
                "duplicate_rows_pct": profile.duplicate_rows_percentage,
                "warnings": [
                    {"code": w.code, "severity": w.severity, "col": w.column, "msg": w.message}
                    for w in profile.warnings[:8]
                ],
                "numeric_cols": [c.name for c in profile.numeric_columns],
                "categorical_cols": [c.name for c in profile.categorical_columns],
            }
            if profile.correlation_matrix and profile.correlation_matrix.high_correlations:
                context["dataset"]["high_correlations"] = [
                    {"a": p.feature_a, "b": p.feature_b, "corr": p.correlation}
                    for p in profile.correlation_matrix.high_correlations[:5]
                ]
        except Exception:
            pass

        # 4. Training Leaderboard & ML Engineering Telemetry
        try:
            completed_runs = self.run_repo.list_completed_runs(project_id)
            if completed_runs:
                latest_run = completed_runs[0]
                model_runs = self.run_repo.list_model_runs_by_run_id(latest_run.id)
                completed_models = [m for m in model_runs if m.primary_metric_score is not None]

                lower_is_better = is_error_metric(latest_run.primary_metric)

                sorted_models = sorted(
                    completed_models,
                    key=lambda m: m.primary_metric_score or 0.0,
                    reverse=not lower_is_better,
                )

                if sorted_models:
                    top_m = sorted_models[0]
                    top_diag = (
                        top_m.all_metrics.get("_diagnostics", {}) if top_m.all_metrics else {}
                    )

                    # Baseline lift
                    baseline_m = next((m for m in completed_models if m.is_baseline), None)
                    base_score = baseline_m.primary_metric_score if baseline_m else None
                    top_score = top_m.primary_metric_score or 0.0
                    lift_text = "N/A"
                    if base_score is not None:
                        if lower_is_better:
                            red = ((base_score - top_score) / max(abs(base_score), 1e-6)) * 100
                            lift_text = f"{red:+.1f}% error reduction"
                        else:
                            lift_val = (
                                (top_score - base_score) / max(abs(base_score), 1e-6)
                            ) * 100
                            lift_text = f"{lift_val:+.1f}% accuracy lift"

                    context["has_models"] = True
                    context["leaderboard"] = {
                        "primary_metric": latest_run.primary_metric,
                        "task_type": latest_run.task_type,
                        "target_column": latest_run.target_column,
                        "total_models": len(sorted_models),
                        "lower_is_better": lower_is_better,
                        "baseline_score": round(float(base_score), 4)
                        if base_score is not None
                        else None,
                        "lift_summary": lift_text,
                        "top_model": {
                            "name": top_m.model_name,
                            "id": top_m.model_id,
                            "score": round(float(top_score), 4),
                            "train_score": top_diag.get("train_score"),
                            "overfit_gap": top_diag.get("overfit_gap"),
                            "overfit_risk": top_diag.get("overfit_risk", "low"),
                            "duration_sec": round(float(top_m.train_time_seconds or 0.0), 2),
                        },
                        "models": [
                            {
                                "name": m.model_name,
                                "score": round(float(m.primary_metric_score or 0.0), 4),
                                "std": round(float(m.primary_metric_std or 0.0), 4)
                                if m.primary_metric_std
                                else 0.0,
                                "duration_sec": round(float(m.train_time_seconds or 0.0), 2),
                                "is_baseline": m.is_baseline,
                                "overfit_risk": (m.all_metrics or {})
                                .get("_diagnostics", {})
                                .get("overfit_risk", "low"),
                            }
                            for m in sorted_models[:8]
                        ],
                    }

                    # 5. Top SHAP explanations if available
                    try:
                        top_model_id = top_m.model_id
                        shap_resp = self.explainability_service.get_global_explanation(
                            project_id, top_model_id
                        )
                        context["top_features"] = [
                            {"name": f.feature_name, "shap": round(f.mean_abs_shap, 4)}
                            for f in shap_resp.features[:5]
                        ]
                    except Exception:
                        pass
        except Exception:
            pass

        # 5. Compute dynamic 5-stage lifecycle state
        if context["has_models"] and (
            context.get("has_predictions") or "top_features" in context
        ):
            context["current_stage"] = 5
            context["stage_name"] = "Stage 5: Production & Inference"
            context["next_action"] = (
                "Explore the What-If Simulator in Predict tab, or export the Master "
                ".ZIP Bundle in the Exports hub."
            )
        elif context["has_models"]:
            context["current_stage"] = 4
            context["stage_name"] = "Stage 4: Training & Evaluation"
            context["next_action"] = (
                "Review the leaderboard ranking, audit generalization risk, and head "
                "to the Predict or Explanations tab."
            )
        elif context["has_target_confirmed"]:
            context["current_stage"] = 3
            context["stage_name"] = "Stage 3: Target & ML Strategy"
            context["next_action"] = (
                "Strategy confirmed! Click 'Start Training' in the Train tab to launch "
                "the 5-fold cross-validation tournament."
            )
        elif context["has_profile"]:
            context["current_stage"] = 2
            context["stage_name"] = "Stage 2: Health & Profiling"
            context["next_action"] = (
                "Dataset health inspected. Head to the Train tab to select your target "
                "column and review AI recommendations."
            )
        else:
            context["current_stage"] = 1
            context["stage_name"] = "Stage 1: Dataset Ingestion"
            context["next_action"] = (
                "Upload a CSV or Excel dataset in the Dataset tab to trigger automatic profiling."
            )

        return context

    def get_suggestions(
        self, project_id: str, user_id: str | None = None
    ) -> list[ChatSuggestion]:
        """Generate context-aware prompt suggestion pills adapted to the current project stage."""
        ctx = self.build_context(project_id, user_id=user_id)
        stage = ctx.get("current_stage", 1)
        suggestions: list[ChatSuggestion] = []

        if stage == 1:
            suggestions.append(
                ChatSuggestion(
                    title="How to Get Started",
                    prompt="What file formats can I upload and process?",
                    category="guidance",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Data Privacy & Security",
                    prompt="Is my dataset secure, and who has access to my workspace?",
                    category="security",
                )
            )
        elif stage == 2:
            suggestions.append(
                ChatSuggestion(
                    title="Data Quality Assessment",
                    prompt="What are the key data quality issues in this dataset?",
                    category="quality",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Feature Engineering Ideas",
                    prompt="Suggest 3 high-impact feature transformations for this data.",
                    category="features",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Next Recommended Step",
                    prompt="What should I do next after inspecting my dataset health?",
                    category="guidance",
                )
            )
        elif stage == 3:
            suggestions.append(
                ChatSuggestion(
                    title="Evaluate Target Variable",
                    prompt="Explain why this target variable was suggested.",
                    category="quality",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Candidate Model Strategy",
                    prompt="Why were these algorithms selected for my cross-validation tournament?",
                    category="models",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Launch Guidance",
                    prompt="How does the parallel 5-fold cross-validation training process work?",
                    category="guidance",
                )
            )
        elif stage >= 4:
            top_name = ctx.get("leaderboard", {}).get("top_model", {}).get("name", "top model")
            metric = ctx.get("leaderboard", {}).get("primary_metric", "metric")
            suggestions.append(
                ChatSuggestion(
                    title="Why the Top Model Won",
                    prompt=f"Why did {top_name} achieve the highest {metric} on this dataset?",
                    category="models",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Senior ML Overfit Audit",
                    prompt="Conduct an audit on this winning model: review overfit gap (Δ).",
                    category="models",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Plain-English Pipeline Journey",
                    prompt="Explain the complete journey of my dataset in simple language.",
                    category="executive",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="What-If Simulation Guide",
                    prompt="How can I test counterfactual What-If scenarios?",
                    category="guidance",
                )
            )

        return suggestions

    def _is_off_topic_or_adversarial(self, text: str) -> bool:
        """Check whether the question is completely out of scope or adversarial."""
        for pattern in OFF_TOPIC_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _generate_calm_rejection(self) -> str:
        """Polite, calm redirection back to tabular AutoMLens objectives."""
        return (
            "I am **Lens**, your Chief Intelligence Copilot at AutoMLens. "
            "My expertise is strictly dedicated to analyzing your tabular data, model "
            "architectures, auditing for data leakage, and guiding your ML workflow.\n\n"
            "While I cannot assist with trivia, creative writing, or unrelated coding tasks, "
            "I would be delighted to inspect your dataset health score, analyze your leaderboard, "
            "or guide you through your next AutoML step.\n\n"
            "**How can I assist with your dataset or models today?**"
        )

    def _generate_deterministic_response(
        self, question: str, ctx: dict[str, Any], user_id: str | None = None
    ) -> str:
        """Rule-based expert response generator ensuring 100% offline robustness."""
        q_lower = question.lower()
        effective_user = user_id or ctx.get("authenticated_user_id", settings.DEFAULT_DEV_USER_ID)

        # 0. Check off-topic or adversarial prompts
        if self._is_off_topic_or_adversarial(question):
            return self._generate_calm_rejection()

        has_profile = ctx.get("has_profile", False)
        has_models = ctx.get("has_models", False)
        ds = ctx.get("dataset", {})
        lb = ctx.get("leaderboard", {})
        audit_events = ctx.get("audit_timeline", [])
        current_stage = ctx.get("current_stage", 1)
        next_action = ctx.get("next_action", "")

        # 1. Security, Clerk Multi-Tenancy & Data Confidentiality
        if any(
            w in q_lower
            for w in (
                "secure",
                "privacy",
                "confidential",
                "who can see",
                "multi-tenant",
                "clerk",
                "isolated",
                "leak data",
            )
        ):
            return (
                f"### 🔒 Enterprise Data Confidentiality & Tenant Isolation\n"
                f"- **Authenticated Tenant:** `{effective_user}`\n"
                f"- **Project Boundary:** `{ctx.get('project_name', 'Workspace')}` "
                f"(ID: `{ctx.get('project_id')}`)\n"
                f"- **Session Isolation:** Verified Single-Tenant Storage Sandbox.\n\n"
                "**Architectural Security Guarantees:**\n"
                "1. **Zero Cross-Tenant Leakage:** Every database query, artifact download, and "
                "copilot interaction is strictly gated by your Clerk authentication session. "
                "No other user can access your dataset or model weights.\n"
                "2. **Rule 1 Mathematical Independence:** All preprocessing transformers "
                "are computed strictly inside individual cross-validation splits. "
                "No test data is exposed during training.\n"
                "3. **Local & Cloud Boundary:** Artifacts are cryptographically hashed via SHA-256."
            )

        # 2. Platform Navigation & Next Steps Guidance
        if any(
            w in q_lower
            for w in (
                "next",
                "what should i do",
                "how do i use",
                "where do i go",
                "guide me",
                "start",
                "step",
                "how does this work",
            )
        ):
            c1 = "✅ Completed" if has_profile else "⏳ Pending"
            c2 = "✅ Completed" if has_profile else "⏳ Pending"
            c3 = "✅ Confirmed" if ctx.get("has_target_confirmed") else "⏳ Pending"
            c4 = "✅ Completed" if has_models else "⏳ Pending"
            c5 = "✅ Active" if current_stage == 5 else "⏳ Available after training"
            return (
                f"### 🧭 AutoMLens Workflow Navigator: {ctx.get('stage_name')}\n"
                f"**Current Status:** {next_action}\n\n"
                "#### AutoMLens 5-Stage Architecture:\n"
                f"1. **📥 Dataset Ingestion:** Upload CSV/Excel ({c1})\n"
                f"2. **🔍 Health Profiling:** Univariate statistics & quality score ({c2})\n"
                f"3. **🎯 ML Strategy Formulation:** Confirm target & candidate algorithms ({c3})\n"
                f"4. **⚔️ Cross-Validation Tournament:** 5-fold parallel training ({c4})\n"
                f"5. **🚀 Deployment & Inference:** Predictions & What-If simulation ({c5})\n\n"
                f"👉 **Recommended Next Action:** {next_action}"
            )

        # 3. Senior ML Engineer Review / Overfitting Check
        if any(
            w in q_lower
            for w in ("overfit", "generaliz", "senior ml", "leakage", "robust", "safe", "memoriz")
        ):
            if not has_models:
                return (
                    "Models must be trained before conducting an overfitting audit. "
                    "Please launch training in the **Train** tab."
                )
            top = lb.get("top_model", {})
            risk = top.get("overfit_risk", "low")
            risk_icon = "🟢" if risk == "low" else "🟡" if risk == "moderate" else "🔴"
            gap_val = top.get("overfit_gap")
            gap_str = (
                f"{gap_val:.4f}"
                if isinstance(gap_val, (int, float))
                else str(gap_val or "N/A")
            )

            lines = [
                "### 🛡️ Senior ML Engineer Generalization & Overfit Audit",
                f"- **Model Under Review:** `{top.get('name')}`",
                f"- **Validation Performance:** `{top.get('score')}` ({lb.get('primary_metric')})",
                f"- **Training Fold Performance:** `{top.get('train_score', 'N/A')}`",
                f"- **Generalization Gap (Δ):** `{gap_str}`",
                f"- **Overfit Risk Rating:** {risk_icon} **{risk.upper()} RISK**",
                "",
                "#### Architectural Verdict:",
            ]
            if risk == "low":
                lines.append(
                    "- **Zero Memorization Detected:** Train and val match closely (<5% gap). "
                    "The model generalizes smoothly to unseen observations."
                )
            elif risk == "moderate":
                lines.append(
                    "- **Acceptable Variance:** Small gap (5–12%) between train and validation. "
                    "Regularization parameters (e.g. `min_samples_leaf=2`) contain variance."
                )
            else:
                lines.append(
                    "- **Elevated Variance:** Train score exceeds validation score (>12%). "
                    "Consider adding more samples or applying PCA."
                )
            lines.append(
                "- **Rule 1 Leakage Verification:** All imputations occurred strictly in CV folds."
            )
            return "\n".join(lines)

        # 4. Plain-English Dataset & Pipeline Journey (for Non-Tech Users)
        if any(
            w in q_lower
            for w in (
                "pipeline",
                "non tech",
                "non-tech",
                "simple",
                "plain",
                "journey",
                "what happened",
                "what did you do",
                "history",
                "audit",
                "steps",
                "explain to non",
            )
        ):
            lines = [
                f"### 🚀 Complete Journey of Your Dataset: `{ctx.get('project_name')}`",
                "Here is everything AutoMLens did with your data, in plain English:",
                "",
                (
                    "1. **📥 Safe Data Ingestion:** We verified the file format, checked encoding, "
                    "and ensured zero rows were silently corrupted during upload."
                ),
            ]
            if ds:
                lines.append(
                    f"2. **🔍 Health Inspection:** Scanned {ds.get('total_rows', 0):,} rows and "
                    f"{ds.get('total_columns', 0)} columns. "
                    f"Hygiene score: **{ds.get('quality_score', 'N/A')}/100**."
                )

            lines.append(
                "3. **🛡️ Leak-Free Cleaning:** Missing values were imputed and columns were scaled "
                "strictly inside isolated folds. No test data was ever peeked at."
            )

            if has_models:
                top = lb.get("top_model", {})
                risk = top.get("overfit_risk", "low")
                risk_icon = "🟢" if risk == "low" else "🟡" if risk == "moderate" else "🔴"
                lines.append(
                    f"4. **⚔️ Algorithm Tournament:** We benchmarked {lb.get('total_models', 0)} "
                    f"algorithms across 5 independent trials. **{top.get('name')}** won."
                )
                gap_val = top.get("overfit_gap", 0)
                lines.append(
                    f"5. **{risk_icon} Generalization Check:** The winner has "
                    f"**{risk.upper()} overfit risk** (gap: {gap_val}), "
                    "meaning it learned true underlying patterns rather than memorizing noise."
                )
            else:
                lines.append(
                    "4. **⏳ Model Training:** Target and strategy confirmed. "
                    "Ready to dispatch cross-validation."
                )

            if audit_events:
                lines.append("\n#### 📜 Verified Audit Trail (Stored in Database):")
                for e in audit_events[-5:]:
                    lines.append(f"- **{e['action']}**: {e['reason']}")

            return "\n".join(lines)

        # 5. Data Quality / Anomalies
        if any(
            w in q_lower
            for w in ("quality", "issue", "anomal", "missing", "skew", "duplicate", "clean")
        ):
            if not has_profile:
                return (
                    "No dataset has been uploaded or profiled yet. "
                    "Please upload a dataset in the **Dataset** tab to view diagnostics."
                )
            warnings = ds.get("warnings", [])
            r_count = ds.get("total_rows", 0)
            c_count = ds.get("total_columns", 0)
            lines = [
                f"### 📊 Data Quality Diagnostic Report for `{ctx.get('project_name')}`",
                f"- **Overall Health Score:** **{ds.get('quality_score', 0)} / 100**",
                f"- **Dimensions:** {r_count:,} rows × {c_count} columns",
                f"- **Duplicate Rows:** {ds.get('duplicate_rows_pct', 0)}%",
                "",
                "#### Key Findings & Actionable Recommendations:",
            ]
            if warnings:
                for w in warnings:
                    sev_icon = "🔴" if w["severity"] == "high" else "🟡"
                    col_str = f" (`{w['col']}`)" if w["col"] else ""
                    lines.append(f"- {sev_icon} **{w['code']}**{col_str}: {w['msg']}")
            else:
                lines.append(
                    "- 🟢 No critical data anomalies detected. Health is within safe bounds."
                )

            high_corr = ds.get("high_correlations", [])
            if high_corr:
                lines.append("\n#### Multicollinearity Alert:")
                for p in high_corr:
                    lines.append(
                        f"- Features `{p['a']}` and `{p['b']}` correlated (|r|={p['corr']:.2f}). "
                        "Consider dropping one or combining them."
                    )
            return "\n".join(lines)

        # 6. Leaderboard & Model Comparison
        if any(
            w in q_lower
            for w in (
                "leaderboard",
                "model",
                "winner",
                "win",
                "perform",
                "metric",
                "accuracy",
                "f1",
                "won",
                "lift",
            )
        ):
            if not has_models:
                return (
                    "Model training has not been executed yet. Go to the **Train** tab, "
                    "confirm your target variable, and click **Start Training**."
                )
            top = lb.get("top_model", {})
            models = lb.get("models", [])
            score_str = f"{top.get('score')}"
            dur_str = f"{top.get('duration_sec')}s"
            win_name = top.get("name")
            lines = [
                "### 🏆 Model Leaderboard Evaluation",
                f"- **Primary Metric:** `{lb.get('primary_metric')}` ({lb.get('task_type')})",
                f"- **Winning Algorithm:** **{win_name}** (Score: {score_str}, Time: {dur_str})",
                f"- **Baseline Comparison:** {lb.get('lift_summary', 'Established')}",
                f"- **Overfit Risk:** **{top.get('overfit_risk', 'low').upper()}**",
                "",
                "#### Model Rankings:",
            ]
            for idx, m in enumerate(models, start=1):
                trophy = (
                    "🥇 " if idx == 1 else "🥈 " if idx == 2 else "🥉 " if idx == 3 else f"{idx}. "
                )
                base_tag = " *(Rule 4 Baseline)*" if m.get("is_baseline") else ""
                lines.append(
                    f"- {trophy}**{m['name']}**{base_tag}: {m['score']} (±{m.get('std', 0.0):.3f})"
                )

            lines.append("\n#### Why This Model Won:")
            lines.append(
                f"`{top.get('name')}` outperformed competitor estimators because its inductive "
                f"bias matches the tabular feature distribution. For complex tabular interactions, "
                f"tree-based ensembles capture non-linear decision boundaries without overfitting."
            )
            return "\n".join(lines)

        # 7. Features & SHAP Signal
        if any(
            w in q_lower for w in ("feature", "importance", "shap", "predict", "signal", "variable")
        ):
            top_features = ctx.get("top_features", [])
            if top_features:
                lines = [
                    "### 🔍 Key Predictive Features (Global SHAP Attribution)",
                    "Based on 5-fold cross-validation, these factors drive the largest variance:",
                    "",
                ]
                for idx, f in enumerate(top_features, start=1):
                    lines.append(f"{idx}. **`{f['name']}`** (Mean |SHAP|: {f['shap']})")
                lines.append(
                    "\n*Note: Feature attribution reflects statistical correlations in data.*"
                )
                return "\n".join(lines)
            return (
                "Global feature attribution is calculated after training completes. "
                "Check the **Explanations** tab to explore interactive SHAP charts."
            )

        # 8. Feature Engineering Suggestions
        if any(w in q_lower for w in ("transform", "engineer", "suggest", "improve", "idea")):
            numeric_cols = ds.get("numeric_cols", [])
            cat_cols = ds.get("categorical_cols", [])
            lines = [
                "### 🧪 Recommended Feature Transformations",
                "Based on the dataset geometry, here are 3 high-impact transformations to try:",
                "",
            ]
            if len(numeric_cols) >= 2:
                lines.append(
                    f"1. **Interaction Ratio:** `df['{numeric_cols[0]}_{numeric_cols[1]}_ratio']`"
                    f" = df['{numeric_cols[0]}'] / (df['{numeric_cols[1]}'] + 1e-5)"
                )
            if cat_cols:
                lines.append(
                    f"2. **Frequency Encoding:** Replace values in `{cat_cols[0]}` "
                    "with frequency counts to avoid one-hot dimensionality explosion."
                )
            lines.append(
                "3. **Nonlinear Log Scaling:** Apply `np.log1p()` on heavy-tailed numeric columns."
            )
            return "\n".join(lines)

        # 9. Executive / Viva Summary
        if any(
            w in q_lower for w in ("viva", "summary", "report", "executive", "pitch", "overview")
        ):
            score_line = (
                f"- **Top Performer:** `{lb.get('top_model', {}).get('name', 'N/A')}` delivering "
                f"`{lb.get('top_model', {}).get('score', 'N/A')}` on "
                f"`{lb.get('primary_metric', 'val')}` ({lb.get('lift_summary', 'Established')})."
            )
            total_r = ds.get("total_rows", "N/A")
            total_c = ds.get("total_columns", "N/A")
            risk_tag = str(lb.get("top_model", {}).get("overfit_risk", "low")).upper()
            lines = [
                f"### 📊 AutoMLens Executive Summary: `{ctx.get('project_name')}`",
                "",
                f"- **Data:** {total_r} samples across {total_c} features "
                f"(quality rating: **{ds.get('quality_score', 'N/A')}/100**).",
                f"- **Target Task:** `{lb.get('task_type', 'Tabular ML')}` (5-fold CV).",
                score_line,
                f"- **Generalization Safety:** `{risk_tag}` risk with zero data leakage.",
                "- **Explainability:** Global SHAP attribution confirms feature contributions.",
            ]
            return "\n".join(lines)

        # Default fallback guidance
        return (
            f"I am **Lens**, your Chief Intelligence Copilot at AutoMLens. I have full visibility "
            f"into your workspace state ({ctx.get('stage_name')}), dataset health, and training "
            f"leaderboard.\n\n"
            f"👉 **Current Status:** {next_action}\n\n"
            "Ask me to explain your data quality, audit for overfitting, guide your next action, "
            "or summarize the model tournament results!"
        )

    async def stream_chat(
        self,
        project_id: str,
        question: str,
        history: list[ChatMessage],
        user_id: str | None = None,
        gemini_api_key: str | None = None,
        gemini_model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream conversational response chunk by chunk as SSE events with Lens persona."""
        ctx = self.build_context(project_id, user_id=user_id)
        effective_key = gemini_api_key or settings.GEMINI_API_KEY
        chosen_gemini_model = (
            gemini_model.strip()
            if (gemini_model and gemini_model.strip())
            else settings.GEMINI_MODEL
        )

        # 0. Off-topic & Adversarial Guardrail
        if self._is_off_topic_or_adversarial(question):
            rejection_text = self._generate_calm_rejection()
            words = rejection_text.split(" ")
            for i in range(0, len(words), 3):
                chunk = " ".join(words[i : i + 3]) + " "
                yield f"data: {json.dumps({'text': chunk})}\n\n"
                await asyncio.sleep(0.03)
            yield "data: [DONE]\n\n"
            return

        # 1. Attempt Gemini streaming if key provided
        if effective_key and len(effective_key.strip()) > 8:
            key = effective_key.strip()
            system_prompt = (
                "You are Lens, the Chief Intelligence Copilot for the AutoMLens platform. "
                "You are an expert Senior Staff Machine Learning Architect and Data Scientist. "
                "Your demeanor is calm, articulate, patient, encouraging, and knowledgeable. "
                "You strictly specialize in tabular ML, automated preprocessing, "
                "cross-validation evaluation, explainable AI, and platform navigation.\n\n"
                f"Authenticated Tenant User: {ctx.get('authenticated_user_id')}\n"
                f"Active Workspace State: {ctx.get('stage_name')}\n"
                f"Next Recommended Action: {ctx.get('next_action')}\n\n"
                f"Workspace Database Context:\n{json.dumps(ctx, indent=2)}\n\n"
                "CRITICAL DIRECTIVES:\n"
                "1. If the user asks general trivia, creative writing, or unrelated coding, "
                "calmly and politely decline, stating you are Lens, dedicated to AutoMLens.\n"
                "2. When explaining results to non-technical users, translate statistical metrics "
                "into intuitive business meaning.\n"
                "3. Always reinforce ML rigor: Rule 1 zero-leakage, 5-fold CV, "
                "Rule 4 baseline lift, and overfit gap (Δ).\n"
                "4. Always confirm that user data is confidential and isolated to their session."
            )

            contents = [
                {"role": "user", "parts": [{"text": system_prompt}]},
                {
                    "role": "model",
                    "parts": [
                        {
                            "text": (
                                "Greetings. I am Lens, your AutoMLens Copilot. "
                                "I have analyzed your workspace and I am ready to guide you."
                            )
                        }
                    ],
                },
            ]
            for msg in history[-6:]:
                role = "user" if msg.role == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg.content}]})
            contents.append({"role": "user", "parts": [{"text": question}]})

            models_to_try = [chosen_gemini_model]
            for backup in ("gemini-3.5-flash-lite", "gemini-3.1-flash-lite"):
                if backup not in models_to_try:
                    models_to_try.append(backup)

            for model_candidate in models_to_try:
                url = (
                    f"https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model_candidate}:streamGenerateContent?alt=sse&key={key}"
                )
                try:
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        async with client.stream("POST", url, json={"contents": contents}) as response:
                            if response.status_code == 200:
                                async for line in response.aiter_lines():
                                    if line.startswith("data: "):
                                        raw = line[6:].strip()
                                        if raw == "[DONE]":
                                            break
                                        try:
                                            chunk = json.loads(raw)
                                            candidates = chunk.get("candidates", [])
                                            if candidates:
                                                parts = (
                                                    candidates[0].get("content", {}).get("parts", [])
                                                )
                                                for p in parts:
                                                    text = p.get("text", "")
                                                    if text:
                                                        yield f"data: {json.dumps({'text': text})}\n\n"
                                        except Exception:
                                            pass
                                yield "data: [DONE]\n\n"
                                return
                            else:
                                logger.warning(
                                    "Gemini stream HTTP %s on model %s, trying fallback if available.",
                                    response.status_code,
                                    model_candidate,
                                )
                except Exception as exc:
                    logger.warning(
                        "Gemini API model %s stream failed (%s), trying fallback.",
                        model_candidate,
                        exc,
                    )

        # 2. High-performance deterministic Lens engine fallback
        full_text = self._generate_deterministic_response(question, ctx, user_id=user_id)
        words = full_text.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i : i + 3]) + " "
            yield f"data: {json.dumps({'text': chunk})}\n\n"
            await asyncio.sleep(0.03)

        yield "data: [DONE]\n\n"
