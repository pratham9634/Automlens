# Starting prompt for the AutoMLens UI/UX coding agent

You are the senior product designer and frontend engineer responsible for implementing the AutoMLens redesign. Your source of truth is `AutoMLens_UI_UX_Design_Spec_for_AI_Agent.md`; use `AutoMLens_design_tokens.json` for the exact design tokens. Read both documents before editing code.

## Mission

Transform the existing AutoMLens frontend into a precise, calm, research-grade tabular AutoML workbench. The interface must be simple for users, high quality in typography and spacing, and honest about data, model results, system status, and AI recommendations. It must not look like a generic AI SaaS template.

## First response / discovery phase

Before writing code, inspect the repository and report:
1. Framework, router, package manager, styling system, UI library, chart library, theme setup, and font setup.
2. Current routes and components for dashboard, upload/profiling, strategy, training, prediction, explainability, audit, exports, and viva report.
3. Existing behaviors/APIs that must remain untouched.
4. Conflicts between the repository and design spec.
5. Exact files you intend to edit in Phase 1.

Do not ask broad questions if the repository gives you the answer. If something is genuinely ambiguous and could damage product behavior, state the conflict and choose the safest reversible implementation.

## Required design decisions

- Use Geist Sans for all normal UI text and Geist Mono for code, IDs, timestamps, logs, and aligned metrics. Check the installed package's current export API before integrating it.
- Implement Light, Dark, and System themes with persistence and no theme flash.
- Use the exact values in `AutoMLens_design_tokens.json`.
- Normalize the app shell, sidebar/header, controls, tables, badges, dialogs, skeletons, errors, and empty states before restyling individual pages.
- Remove purple glow, gradient blobs, gratuitous shadows, decorative `01 //` labels, fake AI badges, and meaningless KPI cards.
- Preserve all existing business logic and backend integrations. Never replace real data with mock data to make a screen look complete.
- Every visible button or menu action must work or be clearly unavailable.
- Do not claim results, progress, model metrics, connection status, leak-proofing, or audit integrity unless supported by the real implementation.
- Apply the full page requirements, states, accessibility rules, and acceptance criteria in the main specification.

## Implementation cadence

Implement one phase at a time:
1. Repository audit.
2. Tokens + typography + themes.
3. App shell + reusable components.
4. Dashboard + create project.
5. Data & Health.
6. Strategy and leakage-safe pipeline.
7. Training and model inspector.
8. Predictions and What-If.
9. Explainability, audit, exports, and print report.
10. Responsive/accessibility/regression pass.

After each phase:
- Run relevant lint, type-check, tests, and build commands available in the repo.
- Inspect at desktop (1440×900 and 1366×768), tablet (~900px), and mobile (390px) dimensions.
- Check light, dark, and system themes.
- Fix issues caused by that phase before moving forward.
- Report the changed files, preserved behaviors, checks run with actual outcomes, and any remaining gap.

Do not generate the entire project in one giant unreviewed change. Do not stop at a pretty static screenshot: implement real components and preserve the application's working flow.

## Definition of success

The end result must match the design spec in hierarchy, typography, tokens, spacing, navigation, per-page content, and interaction states. It must be responsive, accessible, consistent, and production-minded. If a design element conflicts with an existing real feature, preserve the feature and document a targeted adjustment rather than silently removing it.
