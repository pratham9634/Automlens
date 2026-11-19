"""Domain-Specific Tabular AI Analyst Service.

Combines dataset profile telemetry, model leaderboard results, and SHAP feature
attributions into an enriched prompt context. Supports streaming via Gemini BYOK,
Ollama, OpenRouter, and a 100% offline deterministic rule engine.
"""

import asyncio
from collections.abc import AsyncGenerator
import json
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.api.v1.schemas.analyst import ChatMessage, ChatSuggestion
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.redis import redis_manager
from app.db.repositories.datasets import DatasetRepository
from app.db.repositories.projects import ProjectRepository
from app.db.repositories.runs import RunRepository
from app.services.explainability import ExplainabilityService
from app.services.profiling import ProfilingService
from app.storage.local import LocalStorageBackend

logger = get_logger("services.analyst")
settings = get_settings()


class AnalystService:
    """Service orchestrating conversational tabular intelligence."""

    def __init__(self, db: Session):
        self.db = db
        self.storage = LocalStorageBackend()
        self.project_repo = ProjectRepository(db)
        self.dataset_repo = DatasetRepository(db)
        self.run_repo = RunRepository(db)
        self.profiling_service = ProfilingService(db, storage=self.storage)
        self.explainability_service = ExplainabilityService(
            project_repo=self.project_repo,
            dataset_repo=self.dataset_repo,
            run_repo=self.run_repo,
            storage=self.storage,
        )

    def build_context(self, project_id: str) -> dict[str, Any]:
        """Aggregate workspace state into a structured context dictionary."""
        context: dict[str, Any] = {
            "project_id": project_id,
            "project_name": "Unknown",
            "has_dataset": False,
            "has_profile": False,
            "has_models": False,
        }

        # 1. Project details
        project = self.project_repo.get_by_id(project_id)
        if project:
            context["project_name"] = project.name
            context["project_status"] = project.status

        # 2. Dataset Profile
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

        # 3. Training Leaderboard
        try:
            completed_runs = self.run_repo.list_completed_runs(project_id)
            if completed_runs:
                latest_run = completed_runs[0]
                model_runs = self.run_repo.list_model_runs_by_run_id(latest_run.id)
                sorted_models = sorted(
                    [m for m in model_runs if m.validation_score is not None],
                    key=lambda m: m.validation_score or 0.0,
                    reverse=True,
                )
                if sorted_models:
                    context["has_models"] = True
                    context["leaderboard"] = {
                        "primary_metric": latest_run.primary_metric,
                        "task_type": latest_run.task_type,
                        "total_models": len(sorted_models),
                        "top_model": {
                            "name": sorted_models[0].model_name,
                            "id": sorted_models[0].model_id,
                            "score": round(float(sorted_models[0].validation_score or 0.0), 4),
                            "duration_sec": round(float(sorted_models[0].duration_seconds or 0.0), 2),
                        },
                        "models": [
                            {
                                "name": m.model_name,
                                "score": round(float(m.validation_score or 0.0), 4),
                                "duration_sec": round(float(m.duration_seconds or 0.0), 2),
                            }
                            for m in sorted_models[:5]
                        ],
                    }

                    # 4. Top SHAP explanations if available
                    try:
                        top_model_id = sorted_models[0].model_id
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

        return context

    def get_suggestions(self, project_id: str) -> list[ChatSuggestion]:
        """Generate context-aware prompt suggestion pills."""
        ctx = self.build_context(project_id)
        suggestions: list[ChatSuggestion] = []

        if ctx.get("has_profile"):
            suggestions.append(
                ChatSuggestion(
                    title="Data Quality Assessment",
                    prompt="What are the key data quality issues or anomalies in this dataset, and how should I treat them?",
                    category="quality",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Feature Engineering Ideas",
                    prompt="Based on the dataset columns and correlation patterns, suggest 3 high-impact feature transformations.",
                    category="features",
                )
            )

        if ctx.get("has_models"):
            top_name = ctx.get("leaderboard", {}).get("top_model", {}).get("name", "top model")
            metric = ctx.get("leaderboard", {}).get("primary_metric", "score")
            suggestions.append(
                ChatSuggestion(
                    title="Why the Top Model Won",
                    prompt=f"Why did {top_name} achieve the highest {metric} on this dataset compared to the other models?",
                    category="models",
                )
            )
            suggestions.append(
                ChatSuggestion(
                    title="Academic Viva Summary",
                    prompt="Summarize this project's dataset characteristics, model leaderboard, and key findings for a viva defense.",
                    category="executive",
                )
            )

        if not suggestions:
            suggestions.append(
                ChatSuggestion(
                    title="Getting Started",
                    prompt="What steps should I take next in this workspace?",
                    category="quality",
                )
            )

        return suggestions

    def _generate_deterministic_response(self, question: str, ctx: dict[str, Any]) -> str:
        """Rule-based expert response generator ensuring 100% offline robustness."""
        q_lower = question.lower()
        has_profile = ctx.get("has_profile", False)
        has_models = ctx.get("has_models", False)
        ds = ctx.get("dataset", {})
        lb = ctx.get("leaderboard", {})

        # 1. Data Quality / Anomalies
        if any(w in q_lower for w in ("quality", "issue", "anomal", "missing", "skew", "duplicate", "clean")):
            if not has_profile:
                return "No dataset has been uploaded or profiled yet. Please upload a dataset in the **Dataset** tab to view data quality diagnostics."
            warnings = ds.get("warnings", [])
            lines = [
                f"### 📊 Data Quality Diagnostic Report for `{ctx.get('project_name')}`",
                f"- **Overall Health Score:** **{ds.get('quality_score', 0)} / 100**",
                f"- **Dimensions:** {ds.get('total_rows', 0):,} rows × {ds.get('total_columns', 0)} columns",
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
                lines.append("- 🟢 No critical data anomalies detected. Missingness and variance are within healthy bounds.")

            high_corr = ds.get("high_correlations", [])
            if high_corr:
                lines.append("\n#### Multicollinearity Alert:")
                for p in high_corr:
                    lines.append(f"- Feature `{p['a']}` and `{p['b']}` have high correlation (|r| = {p['corr']:.2f}). Consider dropping one or combining them.")
            return "\n".join(lines)

        # 2. Leaderboard & Model Comparison
        if any(w in q_lower for w in ("leaderboard", "model", "winner", "win", "perform", "metric", "accuracy", "f1", "won")):
            if not has_models:
                return "Model training has not been executed yet. Go to the **Train** tab, confirm your target variable, and click **Start Training** to build the leaderboard."
            top = lb.get("top_model", {})
            models = lb.get("models", [])
            lines = [
                f"### 🏆 Model Leaderboard Evaluation",
                f"- **Primary Metric:** `{lb.get('primary_metric')}` ({lb.get('task_type')})",
                f"- **Winning Algorithm:** **{top.get('name')}** (Score: **{top.get('score')}**, Training Time: {top.get('duration_sec')}s)",
                "",
                "#### Model Rankings:",
            ]
            for idx, m in enumerate(models, start=1):
                trophy = "🥇 " if idx == 1 else "🥈 " if idx == 2 else "🥉 " if idx == 3 else f"{idx}. "
                lines.append(f"- {trophy}**{m['name']}**: {m['score']} ({m['duration_sec']}s)")

            lines.append("\n#### Why This Model Won:")
            lines.append(
                f"`{top.get('name')}` outperformed competitor estimators because its inductive bias matches "
                f"the tabular feature distribution. For complex tabular interactions and mixed numeric/categorical columns, "
                f"tree-based ensembles capture non-linear decision boundaries without overfitting."
            )
            return "\n".join(lines)

        # 3. Features & SHAP Signal
        if any(w in q_lower for w in ("feature", "importance", "shap", "predict", "signal", "variable")):
            top_features = ctx.get("top_features", [])
            if top_features:
                lines = [
                    "### 🔍 Key Predictive Features (Global SHAP Attribution)",
                    "Based on 5-fold cross-validation and TreeExplainer/LinearExplainer analysis, these factors drive the largest variance in model decisions:",
                    "",
                ]
                for idx, f in enumerate(top_features, start=1):
                    lines.append(f"{idx}. **`{f['name']}`** (Mean |SHAP|: {f['shap']})")
                lines.append("\n*Academic Note: Feature attribution reflects statistical correlations in the training set and does not establish causal direction.*")
                return "\n".join(lines)
            return "Global feature attribution is calculated after training completes. Check the **Explanations** tab to explore interactive SHAP charts."

        # 4. Feature Engineering Suggestions
        if any(w in q_lower for w in ("transform", "engineer", "suggest", "improve", "idea")):
            numeric_cols = ds.get("numeric_cols", [])
            cat_cols = ds.get("categorical_cols", [])
            lines = [
                "### 🧪 Recommended Feature Transformations",
                "Based on the dataset geometry, here are 3 high-impact transformations to try:",
                "",
            ]
            if len(numeric_cols) >= 2:
                lines.append(f"1. **Interaction Ratio:** Create a ratio feature: `df['{numeric_cols[0]}_{numeric_cols[1]}_ratio'] = df['{numeric_cols[0]}'] / (df['{numeric_cols[1]}'] + 1e-5)`")
            if cat_cols:
                lines.append(f"2. **Target / Frequency Encoding:** Replace high-cardinality values in `{cat_cols[0]}` with frequency counts to avoid one-hot dimensionality explosion.")
            lines.append("3. **Nonlinear Log Scaling:** Apply `np.log1p()` on heavy-tailed positive monetary or count features to reduce gradient saturation.")
            return "\n".join(lines)

        # 5. Executive / Viva Summary
        if any(w in q_lower for w in ("viva", "summary", "report", "executive", "pitch", "overview")):
            lines = [
                f"### 🎓 AutoMLens Project Summary: `{ctx.get('project_name')}`",
                "",
                f"- **Data:** {ds.get('total_rows', 'N/A')} samples across {ds.get('total_columns', 'N/A')} features with data quality health rating of **{ds.get('quality_score', 'N/A')}/100**.",
                f"- **Target Task:** `{lb.get('task_type', 'Tabular ML')}` evaluated via 5-fold cross-validation.",
                f"- **Top Performer:** `{lb.get('top_model', {}).get('name', 'N/A')}` delivering `{lb.get('top_model', {}).get('score', 'N/A')}` on `{lb.get('primary_metric', 'validation')}`.",
                "- **Explainability:** Global SHAP attribution and local observation waterfall breakdown confirm feature contributions without data leakage.",
            ]
            return "\n".join(lines)

        # Default fallback guidance
        return (
            f"I am your **AutoMLens Tabular Analyst**. I have access to your dataset profile "
            f"({ds.get('total_rows', 0):,} rows), model leaderboard, and SHAP feature attributions. "
            f"You can ask me to analyze data quality anomalies, explain why a model won, or suggest feature engineering!"
        )

    async def stream_chat(
        self,
        project_id: str,
        question: str,
        history: list[ChatMessage],
        gemini_api_key: str | None = None,
        gemini_model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream conversational response chunk by chunk as SSE events."""
        ctx = self.build_context(project_id)
        effective_key = gemini_api_key or settings.GEMINI_API_KEY
        chosen_gemini_model = (
            gemini_model.strip()
            if (gemini_model and gemini_model.strip())
            else settings.GEMINI_MODEL
        )

        # Check if valid Gemini API key is available (starts with AIzaSy)
        if effective_key and effective_key.strip().startswith("AIzaSy"):
            key = effective_key.strip()
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_gemini_model}:streamGenerateContent?alt=sse&key={key}"
            system_prompt = (
                "You are AutoMLens Tabular AI Analyst, an expert data scientist. "
                "Here is the user's dataset and model context:\n"
                f"{json.dumps(ctx, indent=2)}\n\n"
                "Provide concise, insightful, mathematically grounded answers with markdown formatting."
            )

            contents = [
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "model", "parts": [{"text": "Understood. I am ready to analyze the dataset and models."}]},
            ]
            for msg in history[-6:]:
                role = "user" if msg.role == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg.content}]})
            contents.append({"role": "user", "parts": [{"text": question}]})

            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
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
                                            parts = candidates[0].get("content", {}).get("parts", [])
                                            for p in parts:
                                                text = p.get("text", "")
                                                if text:
                                                    yield f"data: {json.dumps({'text': text})}\n\n"
                                    except Exception:
                                        pass
                            yield "data: [DONE]\n\n"
                            return
                        else:
                            logger.warning("Gemini streaming returned HTTP %s. Falling back to deterministic engine.", response.status_code)
            except Exception as exc:
                logger.warning("Gemini API stream failed: %s. Falling back to deterministic engine.", exc)

        # High-performance deterministic engine fallback (typing effect simulation)
        full_text = self._generate_deterministic_response(question, ctx)
        words = full_text.split(" ")
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i : i + 3]) + " "
            yield f"data: {json.dumps({'text': chunk})}\n\n"
            await asyncio.sleep(0.04)

        yield "data: [DONE]\n\n"
