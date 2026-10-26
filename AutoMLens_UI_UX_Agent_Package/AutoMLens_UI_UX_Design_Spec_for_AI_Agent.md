# AutoMLens — UI/UX Redesign & Implementation Specification

**Document type:** Source-of-truth design contract for the coding agent  
**Product:** AutoMLens — Human-Assisted Tabular AutoML  
**Audience:** AI coding agent, frontend engineer, UI/UX implementer  
**Primary implementation target:** Existing Next.js/React frontend; preserve the existing backend and API behavior unless a separate engineering task explicitly authorizes changes  
**Design version:** 1.0  
**Status:** Implementation specification

---

## 0. Read this first — non-negotiable instructions for the agent

This document is the design source of truth. Read it fully before changing code. Inspect the current repository and identify the current frontend framework, routing, component library, styling system, API clients, state management, and existing page behavior. Do not assume paths mentioned in the older audit still match the repository.

### The outcome

Build a calm, precise, high-credibility scientific ML workbench. It should look deliberately designed by a strong product design team—not like a generic AI SaaS template.

### Rules

1. **Preserve product behavior.** Do not break existing ingestion, profiling, target selection, leakage-safe pipeline construction, cross-validation, SSE progress, model comparison, prediction, SHAP, audit, export, or viva-summary functionality.
2. **Design before decorating.** Fix information hierarchy, spacing, alignment, navigation, and state handling before adding visual details.
3. **Use Geist Sans + Geist Mono as the typography system.** Do not keep Inter as the default simply because it already exists. Do not add unrelated third-party font families. Avoid decorative fonts.
4. **Support Light, Dark, and System themes.** Theme preference must persist across reloads and must not create a flash of the wrong theme when the app loads.
5. **No purple/pink ambient glow, neon gradients, blur blobs, glassmorphism, oversized hero illustrations, arbitrary floating cards, fake terminal decoration, or excessive shadow.** Do not add visual elements unless they convey state, hierarchy, or help a task.
6. **No invented data.** Use real values already provided by the application. In development-only previews, clearly identify seed/demo data. Never imply sample scores, infrastructure states, or model results are real.
7. **Do not fake functionality.** Every visible action must work, have a meaningful disabled state, or be explicitly labeled as unavailable. Do not create inert buttons, fake search, fake worker activity, or fabricated streaming logs.
8. **Build shared components and tokens first.** Do not separately style each page from scratch.
9. **Use semantic HTML and accessible controls.** Keyboard navigation, visible focus, appropriate labels, contrast, and reduced-motion handling are required.
10. **Keep the visual system restrained.** A small number of clear type sizes, consistent spacing, thin borders, and selective semantic colors are preferable to visual noise.
11. **Do not use Geist Pixel in the product UI.** Geist Sans and Geist Mono provide sufficient identity. Pixel typography would make this technical product feel gimmicky.
12. **Implementation must be phase-by-phase.** After each phase, run lint/type checks and applicable tests, inspect the result at desktop and mobile widths, summarize modified files, and fix regressions before proceeding.

### Before implementation

Produce a short audit in the agent's working notes:

- Existing route/page map.
- Existing shared component map.
- Theme/styling setup.
- Existing data/API connections and interactions that must not change.
- Any discrepancies between this specification and the actual codebase.
- A phased implementation plan.

If a specification detail conflicts with an existing functional requirement, preserve the functioning product behavior and document the conflict. Do not silently delete features.

---

## 1. Product and design intent

AutoMLens is a human-assisted AutoML platform for tabular data. It is not a generic chat product and not a promotional landing page. The interface must help people understand data quality, choose a target, review modelling strategy, train and compare models, interpret predictions, and produce evidence suitable for academic review.

### Product principles

- **Clarity over spectacle:** make the data and next action prominent; keep decoration nearly invisible.
- **Evidence over claims:** show metrics, limitations, method, and provenance where they inform a decision.
- **Human oversight over automation theatre:** recommendations must be reviewable and overridable.
- **Progressive disclosure:** give the common path a clean default; expose advanced controls when needed.
- **Consistent context:** users should always know which project, dataset, target, and model they are viewing.
- **Scientific honesty:** distinguish observed results, model estimates, simulated scenarios, and system heuristics.
- **Density without clutter:** the product contains tables and charts; use available screen area efficiently without making text tiny.
- **Predictable interaction:** one primary action per view; secondary actions stay visually secondary.

### Visual character

Use an editorial, engineering-oriented visual language:

- Neutral page canvas with white/graphite surfaces.
- Typography does most of the hierarchy work.
- Thin, consistent borders rather than shadows.
- Cobalt/sapphire used for primary actions, selection, and keyboard focus—not as a decorative wash.
- Semantic colors used only for actual state or meaning.
- Compact, information-dense tables with stable number alignment.
- Charts with restrained grid lines, clear units, readable labels, and accessible legends.
- No marketing-style “AI powered” visual tropes inside the workbench.

### Benchmark references and what to borrow

Use references as principles, not as templates:

- **Geist / Vercel:** restrained developer-facing typography and a coherent sans/mono pairing. Official font reference: https://vercel.com/font and https://vercel.com/geist/typography
- **Dataiku visual ML:** separate target/task setup, feature handling, candidate algorithms, evaluation, and diagnostics. Official documentation: https://knowledge.dataiku.com/latest/ml/model-design/index.html
- **H2O Driverless AI:** expose comparative model scores and detailed experiment results in a way suited to inspection. Official documentation: https://docs.h2o.ai/driverless-ai/latest-stable/docs/userguide/experiment-scores.html
- **Weights & Biases:** learn from consistent experiment comparison and metric presentation; do not turn every screen into an observability dashboard.

Do not reproduce any one reference product's interface. AutoMLens should have its own structure and visual identity.

---

## 2. Information architecture

### Global application navigation

Keep global navigation limited to cross-project destinations:

1. Overview
2. Projects
3. Datasets (only if this route has a real global dataset function)
4. Settings

Do not create a global navigation item merely because a feature exists within a project. Parallel training, model leaderboard, explainability, audit, and exports belong to project context unless the current codebase already provides a legitimate global cross-project view.

### Project workspace navigation

Use project-level navigation for the actual workflow:

1. **Data & Health** — upload, preview, data quality, feature distributions.
2. **Strategy** — target/task, preprocessing, leakage safety, candidate algorithms.
3. **Training** — execution progress, results table, model inspection.
4. **Predictions** — single prediction, batch prediction, What-If scenarios.
5. **Explainability** — global feature importance and local explanation.
6. **Audit & Reports** — audit ledger, exports, viva summary.

The original product description frames the core pipeline as five stages. Preserve that conceptual five-stage model in the progress indicator if useful, but the workspace may use six destination labels to prevent the highly crowded Step 5 from becoming a dumping ground. If changing navigation structure would cause excessive routing risk, keep the five stages and use internal tabs for Predictions, Explainability, and Audit & Reports. The implementation agent must pick the option that best preserves existing routes and explain the choice before editing.

### Workflow states

Every project has a visible stage state:

- Not started
- In progress
- Needs attention
- Complete
- Failed (only for a real failed process)

Do not use color alone to communicate states. Always pair a compact state label with color and, where useful, an icon.

### Route/context rules

- Breadcrumbs display the real current location, not a hardcoded branch name.
- Project switcher shows existing projects and their state.
- The current project name remains visible when deep inside project views.
- Unsaved changes must be indicated before navigation when relevant.
- Returning to a project should restore the currently valid view, filters, and selected model where existing state architecture permits.

---

## 3. Typography system — make the interface feel exceptional through precision

### Font decision

Use **Geist Sans** for the product UI and **Geist Mono** for numerical/technical content. This pairing is intentionally coherent: Geist is designed for developer/designer interfaces, and the Mono face complements the Sans face. The official project provides a Next.js-friendly package. Reference: https://vercel.com/font

Install using the package manager already used by the repository:

```bash
npm install geist
```

For a Next.js App Router project, use the package's documented import path and API compatible with the installed version:

```tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```

Apply the supplied font classes/variables at the root layout following the installed package documentation. Confirm the exact export shape against the installed package version instead of guessing. Prefer locally bundled/self-hosted fonts over a runtime dependency on a third-party font host. Do not download font files from random websites.

### Font roles

- `--font-sans`: Geist Sans; page headings, body text, form labels, navigation, buttons, tables, dialogs.
- `--font-mono`: Geist Mono; metrics when exact column alignment matters, IDs, timestamps, hashes, code snippets, Python/sklearn identifiers, terminal/log output, keyboard shortcuts.
- Do not use monospace for long paragraphs.
- Do not use all-caps labels everywhere. Sentence case is the default.
- Do not use bold for every heading. Use weight to establish hierarchy, not to make every element shout.
- Do not use font size alone to distinguish adjacent titles; combine size, weight, and spacing.

### Typography scale

Use these exact defaults, with responsive adjustments only where specified.

| Token | Size / line-height | Weight | Letter spacing | Intended usage |
|---|---:|---:|---:|---|
| `display-xl` | 36 / 42 px | 600 | -0.045em | Rare: onboarding/empty-state statement only; not every dashboard heading |
| `page-title` | 28 / 34 px | 600 | -0.035em | Main page title |
| `page-title-compact` | 24 / 30 px | 600 | -0.03em | Narrow workspace or modal title |
| `section-title` | 16 / 22 px | 600 | -0.02em | Major section title |
| `card-title` | 14 / 20 px | 550–600 | -0.01em | Card/table panel title |
| `body` | 14 / 21 px | 400 | -0.005em | Default interface copy |
| `body-strong` | 14 / 21 px | 550 | -0.005em | Important inline value/phrase |
| `body-small` | 13 / 19 px | 400 | 0 | Secondary descriptions, dense helper copy |
| `table` | 13 / 18 px | 400 | 0 | Table cells; use 500 for selected or key text |
| `label` | 12 / 16 px | 500 | 0 | Form labels, field headings, metadata keys |
| `caption` | 11 / 16 px | 450–500 | +0.005em | Fine-grained metadata only; never essential instructions |
| `metric-lg` | 26 / 30 px | 550 | -0.025em | One or two key numerical summaries, only when helpful |
| `metric-md` | 20 / 24 px | 550 | -0.02em | Secondary KPI values |
| `mono-data` | 12–13 / 18 px | 450 | 0 | Metrics, IDs, timestamps; enable tabular numbers |
| `mono-code` | 12 / 18 px | 400 | 0 | Code, hashes, technical configuration |

Values are `font-size / line-height` in pixels. Use CSS variables or typed utility classes; do not scatter arbitrary size declarations across individual components.

### Typography rules

- Page title: one per view, top aligned with the first content column.
- Intro copy: maximum width around 680px; use 14px body / 21px line-height.
- Section titles: 16px and semibold. Keep a consistent 20–24px gap before the section.
- Labels: 12px medium; do not use faint placeholder text as a label.
- Input text: at least 14px. Table text: 13px minimum for normal desktop density.
- Secondary text must remain legible; avoid low-contrast pale gray.
- Use `font-variant-numeric: tabular-nums` for metrics, dates, counts, and numeric table columns.
- Use `font-feature-settings: "tnum" 1` if required by the font/CSS setup.
- Numeric values in the same column must be right-aligned, including decimals and percentage signs.
- Use a consistent display format: percentages to an explicit precision; elapsed times in one format; missing values as `—`, not blank cells or `0`.
- Use sentence case, e.g., “Model performance” rather than “MODEL PERFORMANCE”. All-caps are acceptable only for short, genuinely technical abbreviations (ROC-AUC, SHAP, CSV).
- Avoid global negative letter spacing on all text. Apply tighter tracking to headings only.
- Avoid oversized dashboard titles. The interface is a workbench, not a landing page.
- Support browser zoom to 200% without content becoming unusable.

### Example typography recipe

```css
:root {
  --font-sans: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, monospace;
}

.page-title {
  font-family: var(--font-sans);
  font-size: 28px;
  line-height: 34px;
  font-weight: 600;
  letter-spacing: -0.035em;
}

.body-copy {
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 21px;
  font-weight: 400;
}

.metric-value {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 18px;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}
```

This snippet defines the intended styling. Integrate it into the existing system instead of duplicating tokens or introducing a second CSS strategy.

---

## 4. Color system and theme tokens

The machine-readable companion file `AutoMLens_design_tokens.json` is the source of truth for core colors, dimensions, typography, and spacing. Keep the token file and CSS variables synchronized.

### Light theme

- Page canvas: `#F8FAFC`
- Primary surface: `#FFFFFF`
- Subtle/elevated surface: `#F1F5F9`
- Hover surface: `#E2E8F0`
- Border default: `#E2E8F0`
- Border strong: `#CBD5E1`
- Text primary: `#0F172A`
- Text secondary: `#475569`
- Text muted: `#64748B`
- Text subtle: `#94A3B8`
- Primary accent: `#2563EB`
- Primary hover: `#1D4ED8`

### Dark theme

- Page canvas: `#090A0F`
- Primary surface: `#111318`
- Subtle/elevated surface: `#181B22`
- Hover surface: `#222630`
- Border default: `#252A34` (ensure enough visibility on canvas)
- Border subtle: `rgba(255,255,255,0.08)`
- Border strong: `rgba(255,255,255,0.14)`
- Text primary: `#F8FAFC`
- Text secondary: `#CBD5E1`
- Text muted: `#94A3B8`
- Text subtle: `#64748B`
- Primary accent: `#3B82F6`
- Primary hover: `#60A5FA`

### Shared semantic colors

- Success: `#059669` light theme / `#34D399` dark theme.
- Warning: `#B45309` light theme / `#FBBF24` dark theme.
- Danger: `#DC2626` light theme / `#F87171` dark theme.
- In progress/info: `#0369A1` light theme / `#38BDF8` dark theme.
- Neutral: use the theme's text-muted/border tokens.

Semantic colors must identify a meaningful state. Do not use green for generic decoration or red as a decorative chart color. Ensure text contrast on badges and status backgrounds is adequate. Use a tint background for status badges only when it improves recognition; don't fill large sections with semantic colors.

### Theme behavior

- Three-state selector: Light / Dark / System.
- System mode follows the OS preference.
- Persist explicit user preference using the existing app's preference mechanism or `localStorage` if no established mechanism exists.
- Avoid hydration flash. If the framework supports a pre-hydration theme script or a theme provider, use the established compatible approach.
- Charts, tooltips, tables, popovers, dialog surfaces, and empty states must all adapt to theme tokens. No hardcoded light-only or dark-only chart labels.
- Check light theme readability on projectors and when printed.
- Focus ring uses accent with enough contrast against both themes.

---

## 5. Layout grid, spacing, and shape

### Application shell

Desktop reference viewport: **1440 × 900**. Also validate **1366 × 768** because data-heavy layouts can fail at common laptop sizes.

- Expanded sidebar: **232px** wide.
- Collapsed sidebar: **64px** wide.
- Top header: **60px** high.
- Sidebar spans viewport height; main area scrolls independently where appropriate.
- Main content starts with **28px** horizontal padding on desktop; reduce to 20px on medium screens and 16px on small screens.
- Content should usually use the available width for tables and analytical views; avoid a narrow max-width that wastes screen space. Use a max-width of roughly 1440px only for editorial/dashboard overview content where it helps readability.
- Header and sidebar borders are 1px hairlines.
- Do not place a large rounded surface around the entire application content; the page canvas itself is the background.

### Spacing scale

Use a 4px base system:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

- Component internal spacing: mostly 8, 12, or 16px.
- Standard card padding: 16px.
- Large analytical panel padding: 20px.
- Page section gap: 28–32px.
- Compact row gap: 8px.
- Do not mix arbitrary padding values such as 17px, 23px, and 29px without a real constraint.

### Radius and elevation

- Inputs/buttons: 8px radius.
- Cards/panels: 10px radius.
- Dialogs/popovers: 12px radius.
- Status pills: fully rounded only for small labels; do not turn every control into a pill.
- Border: 1px.
- Shadows: none for regular cards. Use a restrained shadow only on floating dialogs/popovers when needed to distinguish layers.
- Avoid glass, blur, translucent cards, and glow effects.

### Responsive behavior

- `>= 1280px`: expanded sidebar default; multi-column grids where specified.
- `1024–1279px`: allow sidebar collapse; reduce grid columns; retain full-width data tables with horizontal scroll when unavoidable.
- `768–1023px`: collapse sidebar by default; use single-column panels or two-column compact grids; step navigation may become horizontally scrollable.
- `< 768px`: sidebar becomes a drawer or compact navigation; page actions wrap; tables use deliberate horizontal scrolling with sticky key columns only where technically reliable; analytical panels stack vertically.
- No content should be clipped behind fixed headers or side navigation.
- Charts should have minimum practical heights and must not collapse to tiny strips.

---

## 6. Global shell: components and behavior

### 6.1 Sidebar

**Expanded width:** 232px. **Collapsed width:** 64px.

#### Brand block

- Simple AutoMLens wordmark; no glowing gradient tile.
- If an icon exists, use a single restrained monochrome line icon in a small 28–32px area.
- Product name at 14px/20px semibold.
- Optional small version text should be low-emphasis and not presented as a prominent badge.
- Do not add “AI-powered”, “next generation”, or other marketing copy in the brand area.

#### Navigation item

- Height: 36px minimum; 8px radius.
- Icon: 16px; consistent stroke weight and size.
- Label: 13px, weight 500.
- Item horizontal padding: 10px.
- Icon-to-label gap: 10px.
- Default: transparent background, secondary text.
- Hover: subtle theme-specific neutral surface.
- Active: light blue-tint surface with strong text in light mode; slightly elevated neutral-blue surface in dark mode. Use a thin 2px accent indicator at the left if it improves recognition. Avoid large bright blocks.
- Disabled: only if truly unavailable; visually quiet and includes a tooltip/reason. Prefer not to show future or fake features in navigation.

#### Bottom area

- Compact connection/system status only if the application receives real health signals.
- Use a small dot + “Connected”/“Offline” label and an accessible explanation. Do not show fictitious worker counts or fixed health status.
- Account/settings controls, if present in the existing app, sit at the bottom.

#### Collapsed sidebar

- Icon-only navigation with tooltips and accessible labels.
- Active indicator remains apparent.
- Logo remains clickable to return to Overview only if consistent with current behavior.
- The collapse control must expose its action through `aria-label` and have a clear hover/focus state.

### 6.2 Header

**Height:** 60px.

Left area:
- Sidebar collapse control.
- Breadcrumbs. Keep labels short. Current page is non-link text.
- Project name/current project switcher when inside project context.

Right area:
- Search/command trigger (`⌘K` on macOS, `Ctrl+K` on Windows/Linux) only if a working command palette is implemented. It must search real projects and relevant navigation/action entries; otherwise omit it rather than showing fake search.
- Real system/database status indicator if backed by actual health checks.
- Theme selector: Light / Dark / System.
- Optional user/account menu if one exists.

No hardcoded development branch name in the production UI. Branch/build metadata belongs in a development-only diagnostics panel if genuinely needed.

### 6.3 Buttons

Variants:

- **Primary:** solid accent background, white text, 36px default height.
- **Secondary:** neutral surface or white/graphite surface with border.
- **Tertiary/Ghost:** transparent background; used for low-priority row and toolbar actions.
- **Danger:** used only for destructive actions, with confirmation where appropriate.
- **Icon button:** 32–36px square; tooltip for icon-only actions.

Rules:
- Button text: 13px, weight 550–600.
- Button horizontal padding: 12px; icon gap: 8px.
- Default height: 36px; compact table action: 30–32px; large CTA: 40px only when justified.
- Loading state prevents duplicate submissions and communicates progress.
- Disabled states remain readable and explain prerequisites when useful.
- Avoid gradient buttons, glow, exaggerated shadows, and oversized CTAs.

### 6.4 Inputs and forms

- Height: 36px default; multiline text areas may be taller.
- 1px border, 8px radius, background from input/surface token.
- Text 14px; placeholder is not a label.
- Focus ring: 2px visible accent ring with appropriate offset.
- Validation message appears below the relevant field; associate via `aria-describedby`.
- Error state uses border + message/icon + text; not color alone.
- Helper text should explain a constraint or expected value, not repeat the label.
- Required fields are indicated clearly; use a consistent rule.
- Keep field groups aligned to a shared 8/12/16px spacing rhythm.

### 6.5 Cards and section containers

- Use cards where content forms a meaningful group or needs independent interaction.
- Prefer simple section headers and dividers over nesting card inside card inside card.
- Card title is top-left; primary action top-right if needed.
- Standard padding: 16px; analytical panel: 20px.
- No gratuitous icons beside every heading.
- Avoid duplicate descriptions that repeat page title and card title.

### 6.6 Tabs, badges, tooltips, dialogs, dropdowns

- Tabs: 32–36px hit area; clear active underline or restrained surface; keyboard navigable.
- Badges: compact 20–24px height; 11–12px text; neutral default; semantic only for state.
- Tooltip delay modest; used for icon-only controls, truncated content, and short clarifications. Do not put essential instructions only in a tooltip.
- Dialog: 480–640px wide for ordinary forms, 800–1040px for analytical inspection; max height about 85vh; internal content scrolls while title/action areas stay reachable.
- Dialog closes by explicit cancel/close and Escape unless it is a genuinely blocking operation. Do not close on outside click if it would lose critical unsaved work.
- Menus align to their trigger, have proper keyboard behavior, and avoid being clipped by overflow containers.

---

## 7. Screen 1 — Overview / Dashboard

### User goal
Understand current projects, identify their state, and continue or create work with minimal friction.

### Page layout

1. Page header row: “Overview” or “Projects”, with a small supporting sentence if useful.
2. Primary action row: “New project” on the right or directly adjacent to heading. Refresh is secondary and only shown if data refreshing is a real manual operation.
3. Recent/active projects section as the primary content.
4. Small infrastructure status region below projects or in a compact side panel, only if actual health data exists.

Avoid oversized welcome hero banners. Do not consume the first 250px of the viewport with a large title and empty decorative space.

### Project list/card content
Show the information needed to choose a project:

- Project name.
- Concise description (one or two lines, clamp if long).
- Last updated time or created date using one consistent format.
- Workflow progress/current stage.
- Dataset dimensions and target, only when known.
- Selected optimization metric and best model score, only when trained results exist.
- Status label.
- One obvious open/continue action; secondary actions in overflow menu.

Use a compact table when there are enough projects to make scanning more important than large cards. If using project cards, keep the design close to a table row in density—not giant colorful tiles.

### Empty state

- Heading: “Create your first project”.
- One sentence explaining that a project begins with a tabular dataset.
- One primary “Create project” action.
- No mascot, illustration, confetti, or generic AI sparkle art.

### Create Project dialog
Fields, in this order:

1. Project name — required.
2. Description — optional.
3. Problem type — “Let AutoMLens detect” default if supported; otherwise Classification / Regression choice.
4. Primary metric — options depend on task type; do not show incompatible metrics.

Footer: Cancel (secondary), Create project (primary). Show field errors inline. Disable submit while submitting; protect against duplicate creation.

### Infrastructure status
If these diagnostics exist, show a compact row with four labels:

- API / Gateway.
- Database / Storage.
- Worker capacity.
- Reasoner / recommendation provider.

Each displays a real status, a concise detail, and an optional “Details” action. Do not expose ports as primary UI content. Put implementation-specific values (port, ProcessPool worker count) in a technical detail panel or tooltip only when helpful. Never hardcode “4 cores”, “Connected”, or “Hybrid AI” if the underlying configuration/status changes.

### Dashboard acceptance criteria

- New user can create a project without searching for the CTA.
- Existing user can identify and reopen a project in one obvious action.
- Status is never represented by color alone.
- Dashboard does not contain fake data or decorative metric cards with no decision value.
- At 1366×768, user sees the page title, primary action, and most of the project list without excessive scrolling.

---

## 8. Screen 2 — Data & Health

### User goal
Load a dataset and understand its structure and data quality before modelling.

### Page header

- Title: “Data & Health”.
- Dataset filename and state beneath or in a compact context row.
- Primary action changes according to state: “Upload dataset”, “Replace dataset”, or “Continue to strategy”.
- Display allowed file types and 50MB limit if those are actual backend constraints.

### Layout order

**State A: no dataset uploaded**

1. Clear upload/drop area in the top content region.
2. Supported file formats and actual size constraint.
3. Optional concise explanation: “Upload a CSV or Excel file to inspect its schema and data quality.”
4. Browse-file button as an alternative to drag/drop.

Upload region requirements:
- Dashed border only here, where drop interaction is meaningful.
- 120–160px approximate height on desktop, not a giant full-screen illustration.
- Distinguishable drag-over state.
- Upload/progress state with percent if known; spinner only if no percentage is available.
- Error state states exactly what went wrong and how to recover.
- Do not pretend an upload is complete until the server confirms success.

**State B: dataset available**

A compact summary row:
- Rows.
- Columns/features.
- Missing cells percentage.
- Duplicate rows or other quality count if measured.

Use plain metric labels and actual values; avoid a decorative gauge as the main summary.

Then:
1. Data quality findings.
2. Dataset preview table.
3. Feature distribution / column details.
4. Correlation heatmap for appropriate numeric data, as a secondary analysis section.

### Data quality findings

Findings are actionable rows, not giant warning cards. Each row contains:

- Severity / category (Info, Warning, Error).
- Column or affected scope.
- Plain description of observed evidence.
- Why it may matter for modelling.
- Suggested action, when the system can justify one.
- “Inspect column” or relevant action.

Examples are illustrative copy only—calculate real evidence from data:
- “11 missing values in `TotalCharges` (1.8%).”
- “`customer_id` has 100% unique values; consider whether it is an identifier.”
- “`cabin` is missing in 80% of rows.”

Do not label a column as leakage purely because it looks suspicious. Mark uncertain findings as candidates for review, explain why, and allow user judgment.

### Data preview table

- Show a clear “Previewing first 50 rows” caption when that's the actual limit.
- Sticky header if supported reliably.
- Column header displays name, inferred dtype, missing count/percentage as a compact secondary line or via column-inspector panel.
- Search/filter control with a visible label.
- Numeric values right aligned; text values left aligned.
- Preserve type display and date formatting consistently.
- Long cell content is truncated visually but inspectable with a detail affordance; do not silently lose data.
- Row index uses a muted, right-aligned column.
- Empty filter result has a helpful empty state.
- Table has keyboard-accessible horizontal scroll or alternate narrow-screen behavior.

### Column inspection / distribution panel

Selecting a column opens a side drawer or detail panel rather than replacing the whole page unexpectedly.

For numeric columns:
- Histogram with readable bins and axis labels.
- Summary: mean, median, standard deviation, min, max; skewness only if implemented and meaningful.
- Missing count and percentage.

For categorical columns:
- Frequency bar chart for top categories.
- Unique count and missing count.
- Clearly mark when categories are omitted/aggregated.

For any unsupported/unreliable column type, show a data-type explanation rather than a broken chart.

### Correlation heatmap

- Show only on appropriate numeric features.
- Explain the correlation method used.
- Labels must stay readable; allow scrolling/selection for wide datasets.
- Use a diverging scale with a visible legend from -1 to +1.
- Correlation does not imply causation; do not claim otherwise.
- Avoid a full heatmap on initial page load if it overwhelms the primary upload and quality tasks. Keep it below preview/quality or in an analysis tab.

### Health score

If the existing product truly calculates a score, it may appear as a secondary summary. Define the score calculation in an accessible details view. If no defensible formula exists, omit the number and show factual quality checks instead. Do not fabricate a “92/100” score merely to fill a card.

### Data & Health acceptance criteria

- User can understand what uploaded, what is wrong or noteworthy, and what action to take.
- Data preview and quality findings use the same inferred schema.
- Unsupported charts fail gracefully.
- No scores, counts, or warning claims are invented.
- Upload has complete success, progress, error, disabled, and drag-over states.

---

## 9. Screen 3 — Strategy / Target / Leakage-Safe Pipeline

### User goal
Confirm what the model should predict, understand the system's plan, and choose model candidates.

### Layout order

1. Target and task confirmation.
2. Strategy rationale.
3. Preprocessing pipeline.
4. Candidate models.
5. Continue/start training action, subject to validation prerequisites.

### Target selection panel

- Target column dropdown with searchable options for wide datasets.
- Task type: Classification / Regression, detected suggestion if the app can infer it.
- If detection suggests a task, explain the evidence succinctly (for example, number of unique classes), not as an opaque “AI detected” badge.
- User can override the suggestion where technically supported.
- Show explicit warning when the selected target has one unique value, excessive missingness, or an unsupported type—only if measured.
- Show a clear “Target: …” confirmation state.

### Recommendation/rationale panel

- Keep the rule-based/heuristic rationale distinguishable from optional LLM-generated narrative.
- Every recommendation should answer: what is proposed, why, based on what evidence, and can the user change it?
- Label uncertain suggestions as suggestions, not facts.
- If the LLM provider is unavailable, preserve deterministic recommendations and show a compact non-blocking status. Do not break the whole screen because optional narrative generation failed.
- Avoid a conversational chatbot style for every rationale. Use concise paragraphs, bullets only where useful, and disclosure links for details.

### Preprocessing pipeline diagram

Render a clean, accessible diagram with connected boxes and arrows. The graph must match the actual pipeline configuration, not hardcoded illustration text.

Example branch structure:

- Numeric features → SimpleImputer(strategy=median) → StandardScaler.
- Categorical features → SimpleImputer(strategy=most_frequent or constant, according to actual implementation) → OneHotEncoder(handle_unknown=ignore).
- Branches → estimator.

Show exact configured strategies in labels/details. Do not show `constant` in the UI if the code actually uses `most_frequent`; do not show StandardScaler if no scaler is used. Use a linear, low-decoration diagram. Box surfaces use neutral tokens; accent is reserved for selected/current nodes.

### Leakage prevention

A compact methodological evidence section must explain:

- Preprocessing is inside the sklearn pipeline.
- Transformers are fitted on training folds only during cross-validation.
- Validation fold data is not used to fit transformations.
- What guarantees are implemented and what limits remain.

Do not make an unqualified “Zero Data Leakage” guarantee unless the implementation can truly support it. Prefer “Fold-safe preprocessing” plus an explanation. The app cannot promise that the dataset itself contains no target leakage; identify this distinction explicitly.

### Candidate model selection

- Use a compact checkbox list/table grouped by model family: Baseline, Linear, Ensemble, Boosting (only show families supported by the actual backend).
- Each option: model name, one-line description if needed, availability/dependency status.
- Select a sensible default set for the target type if the app supports this behavior.
- Show dependency unavailable or unsupported clearly; do not let the user start a run that silently omits selected candidates.
- Advanced parameters go in a disclosure/accordion or later model settings area; do not overload the initial strategy screen.
- If XGBoost or LightGBM availability depends on installed optional packages, show real availability.

### Continue action

- Primary: “Continue to training” or “Start training” depending on current architecture.
- Disabled with concise prerequisite text when target/model selection is invalid.
- Before training begins, present a concise summary of target, task, metric, CV strategy, candidates, and pipeline assumptions where helpful.

### Strategy acceptance criteria

- User can tell which target is being predicted and which task type will be run.
- The diagram reflects the real pipeline configuration.
- Data leakage language is technically correct and not overclaimed.
- All recommendations can be inspected; user overrides are preserved if supported.
- Unsupported models are never silently presented as runnable.

---

## 10. Screen 4 — Training & Leaderboard

### User goal
Understand progress while training and select a model based on transparent, comparable results.

### Top area

- Page title and current run state.
- Active dataset/target/metric in a compact context line.
- Primary action changes with state: Start training / Stop run (only if cancellation is actually supported) / Retry failed models where supported.
- Display CV strategy and fold count.

### Live training status

Use a compact grid/list for actual model tasks. Each model row shows:

- Model name.
- State: Queued, Running, Completed, Failed.
- Current fold if provided by backend.
- Elapsed time if measured.
- Short error summary if failed, with details expandable.

For worker concurrency:
- Render four worker lanes only if the configured capacity is actually four.
- Worker cards show the real assigned/running task if available; don't fabricate animation.
- Progress updates must come from the real SSE/event stream.
- Reconnect/disconnected status is visible when the stream drops.
- Distinguish “waiting for update” from “training failed”.
- Keep the log/telemetry feed secondary and collapsible by default; most users need outcomes more than raw logs.

### Leaderboard

Use a real data table, not large model cards.

Recommended columns (show actual available metrics only):

1. Rank.
2. Model.
3. Primary metric (named by the project configuration).
4. ROC-AUC (only for relevant classification tasks and if calculated).
5. Accuracy.
6. Precision.
7. Recall.
8. Fit time.
9. State.
10. Action/inspect.

Avoid displaying every metric if it makes the table too wide. Put secondary scores in the model inspector or a column chooser. Respect task compatibility: classification and regression have different metrics. Never show ROC-AUC for a regression task.

- Default sort is the configured primary optimization metric in the correct direction.
- Display precision consistently (e.g., 0.8421 or 84.21%, not inconsistent formatting by row).
- Right align all metrics and use Geist Mono + tabular numbers.
- Make best score/rank clear without a giant green badge.
- “Beats baseline” is only shown when the comparison is calculated correctly and metric direction is respected.
- Table supports sorting with accessible state (`aria-sort` or equivalent), filtering if needed, and clear no-result states.
- For live changes, preserve the current sort logic and don't allow number columns to jitter.

### Model inspector dialog/panel

Show details for the selected model:

- Model name and run state.
- All available CV metrics.
- Fold-by-fold values and mean/variance or standard deviation, with definition.
- Confusion matrix for classification where appropriate.
- ROC curve only when an applicable probability-based binary/multiclass setup supports it.
- Hyperparameter settings.
- Training duration.
- Pipeline/preprocessing configuration.
- Failure cause/trace summary if the model failed.

Charts need readable labels and explanatory captions. Don't show a chart just to fill space.

### Model selection honesty

Do not label the top-ranked model “best” without context. Use “Top by [primary metric]” and surface training cost/stability when available. Make it easy to compare performance versus stability and interpretability.

### Training acceptance criteria

- Every visible progress state is backed by real run events.
- Errors are recoverable and do not disappear into logs.
- Leaderboard is stable while updates arrive.
- Metric choice and direction are explicit.
- Task-incompatible metrics are omitted.
- Inspector opens from the row and is keyboard accessible.

---

## 11. Screen 5 — Predictions & What-If

### User goal
Generate predictions and explore how the trained model responds to changed inputs without mistaking simulation for causality.

### Page structure

Use clear sub-tabs or sections:

1. Single prediction.
2. Batch prediction.
3. What-If scenario.

Keep the selected model visible throughout and disable prediction controls when no compatible trained model is selected.

### Single prediction

- Form fields generated from the selected model's feature schema, excluding the target and any unusable features as dictated by actual implementation.
- Use the right control for the data type: numeric input, categorical select, boolean toggle, date picker only where supported.
- Show min/max/allowed values only when they are known and helpful.
- Group fields logically when there are many; allow a clear reset to defaults only if sensible defaults exist.
- Validate inputs inline and identify the field causing the issue.
- Primary action “Run prediction”.
- Output region shows predicted class/value, probability/confidence only when actually produced and well-defined, and a brief reference to the model/version.
- Do not label probability as “confidence” unless the backend meaning and calibration support that label. Prefer “Predicted class probability” when accurate.

### Batch prediction

- Upload a CSV with clear schema expectations.
- Validate required features and incompatible columns before starting prediction.
- Show validation errors with missing/unexpected columns and an option to download a template if supported.
- Progress only if the backend supplies progress.
- Result state includes completed rows, failed rows, and downloadable CSV once ready.
- Disable download until the artifact actually exists.

### What-If simulator

- Show baseline input/prediction and scenario input/prediction side by side where space allows.
- Restrict slider controls to selected, meaningful features and display exact numeric values while changing them.
- Don't infer feature bounds not supported by observed data or model schema.
- Make the changed inputs explicit.
- Display the prediction delta with units and sign, where meaningful.
- Provide “Reset scenario” and “Use baseline” controls.
- If prediction recalculation is asynchronous or expensive, debounce changes and communicate calculating/error states; don't display stale results as if current.
- Label the result: “Model scenario, not a causal estimate.” This note may be a small contextual caption, not a warning banner.

### Prediction acceptance criteria

- User can distinguish observed input from hypothetical scenario input.
- Output is tied to a selected model.
- No fake probabilities, progress percentages, or result values.
- Batch validation failures explain the required correction.
- What-If never implies that changing a feature will necessarily cause the predicted real-world outcome.

---

## 12. Screen 6 — Explainability

### User goal
Understand which features influence predictions globally and why a specific prediction was made.

### Global importance

- Horizontal bar chart ranked by mean absolute SHAP value if that's the implemented aggregation.
- Show the value definition in a caption or info detail.
- Sort descending.
- Feature labels remain readable; long names truncate with accessible full-name access.
- Axis label and units/scale are explicit.
- Use one restrained primary chart hue; do not use random colors per bar unless color communicates a defined category.
- Display loading, no-model, unsupported-model, and failure states.

### Local attribution

- Select a sample/row/prediction by a valid identifier or row selector.
- Waterfall/force-style presentation is acceptable only if the chosen chart accurately represents the SHAP library's output and contribution semantics.
- Clearly distinguish base value, feature contributions, and final output.
- Positive/negative contribution color should be paired with labels/signs, not rely on color alone.
- Include the feature value and contribution for each feature.
- Explain model output scale where relevant; probabilities and raw model scores are not interchangeable.

### Interpretation rules

- Feature importance describes model behavior, not proof of real-world causality.
- Correlated features can affect interpretation; communicate relevant limitations where useful.
- Avoid overpromising the precision of explanation.
- If SHAP is unavailable for the current model or data, state why and provide supported alternatives if they exist.

### Explainability acceptance criteria

- Chart axes and values are legible in both themes.
- Feature contribution direction and base/final values are interpretable.
- Global and local explanations are clearly distinguished.
- Explanations are computed from the selected model/data; they are not decorative placeholders.

---

## 13. Screen 7 — Audit, Exports & Viva Summary

### Audit ledger

Provide a chronological event table/timeline with:

- Timestamp.
- Event type.
- User/system action.
- Rationale/evidence summary.
- Evidence hash if generated by the audit system.
- Integrity/verification state only if the application can actually verify it.

Controls:
- Search event text.
- Filter by event type/date range where supported.
- Row detail drawer for long rationale and hashes.
- Copy hash action with clear feedback.

Do not call the ledger “tamper-proof” merely because it stores hashes. Use the technically supportable wording “tamper-evident” only if hashes/chaining/verification are implemented and testable. If not, describe it as an audit log.

### Exports

Present export items as a clean list/table:

- Trained pipeline `.joblib`.
- Reproduction script `pipeline.py`.
- Metrics `metrics.json`.
- Profile `profile.json`.

Only display assets that are implemented and available for the selected project/model. Each item shows a short explanation, format, readiness state, and explicit download action. Do not make a download button look active if no file exists.

### Viva Executive Summary

Create a print-focused report preview. The preview should resemble a clear academic report, not a dashboard card.

Include, where data exists:

- Project/dataset description.
- Task/target and primary metric.
- Cross-validation strategy and fold count.
- Model comparison table.
- Winning model by configured metric, with criteria stated.
- Fold stability summary.
- Pipeline and leakage-prevention evidence.
- SHAP feature summary.
- Known limitations and notes.
- Report generated timestamp and reproducibility metadata.

Print/export requirements:
- Dedicated `@media print` stylesheet.
- White print background and dark text even when app is in dark mode.
- Hide navigation, toolbar controls, and buttons from the printed output.
- Prevent table rows/headings from splitting awkwardly across pages when possible.
- Use page margins and typography that remain readable on paper/PDF.
- Show the data/model/run identifiers needed to reproduce the result.
- Do not render unverified assertions as formal conclusions.

### Governance acceptance criteria

- User can inspect why an event occurred and copy evidence identifiers.
- Exports reflect the actual selected project/model.
- Missing exports are handled honestly.
- Print output is legible and independent of the selected app theme.

---

## 14. Data tables, charts, and scientific display rules

### Data tables

- Use a consistent table component; do not implement bespoke styling per screen.
- Header height about 36–40px; normal row height about 40px, compact table row about 36px.
- Use clear column dividers only when they improve scanning; horizontal separators should be subtle.
- Hover row background only when rows are interactive or hover helps track wide rows.
- Numeric columns right aligned and monospaced/tabular.
- IDs/timestamps can use monospace and muted color, but keep them readable.
- Empty data must say why the table is empty, with a useful action if applicable.
- Loading state uses skeleton rows that match the table geometry; avoid an unrelated spinner in the center of the page.
- Errors are distinct from empty states.
- Sorting must be stable and visibly indicated.
- Keep bulk actions in a separate toolbar, not in every row.

### Charts

- Use existing charting library if it meets requirements. Avoid adding a large new library just for small aesthetic changes.
- Chart containers need consistent padding and minimum height.
- Use legible axis ticks and explain units/metric definitions.
- Gridlines should be subtle, not invisible.
- Color palette should remain consistent across light/dark mode.
- Do not encode essential information by color alone; use labels, shapes, patterns, or values when appropriate.
- Tooltips should have a solid theme surface, clear title, formatted values, and consistent units.
- Avoid 3D charts, decorative gradients, gratuitous animation, and unsupported chart types.
- Respect reduced-motion settings; charts should not repeatedly animate on every refresh.

### Numeric formatting

- Choose one precision by metric and preserve it across rows.
- Sort using raw numeric values, not formatted strings.
- Use actual values to calculate ranks and comparisons.
- Distinguish percentages from 0–1 ratios; do not mix 0.91 and 91% in the same column.
- Use `—` for unavailable metrics and include a tooltip/legend explanation if the distinction among not-applicable, unavailable, and failed matters.

---

## 15. Interaction states and system feedback

Every interactive component needs the relevant states:

- Default.
- Hover.
- Focus-visible.
- Active/pressed.
- Disabled.
- Loading.
- Success.
- Error.
- Empty/no results where applicable.

### Notifications

- Use one existing toast/notification system if present.
- Toasts are for brief confirmations and non-blocking failures, not for displaying long error stacks.
- Form errors stay beside fields.
- Critical or destructive decisions use a dialog with explicit language.
- Do not show toast messages that claim success before the server confirms success.

### Loading

- Preserve layout dimensions to reduce layout shift.
- Use skeletons for content blocks and tables.
- Use inline loading for button submissions.
- Keep navigation and unaffected sections usable when appropriate.
- If a task is long-running, show a real progress signal or honest indeterminate state.

### Error handling

- Describe the action that failed, what was known, and what the user can do next.
- Offer Retry only if retry is valid and safe.
- Do not expose sensitive stack traces in the normal UI; put technical details in a collapsible diagnostic view or logs.
- Errors must not silently appear as empty data.

### Destructive actions

- Delete project/dataset actions require an explicit confirmation dialog.
- Dialog names the item being deleted and describes material consequences.
- Use danger styling only for the destructive action.
- Avoid moving destructive actions to the most visually prominent position.

---

## 16. Accessibility and usability requirements

Target WCAG 2.2 AA as the practical baseline.

- Body text and essential UI text should meet contrast requirements in both themes.
- Never use text below 11px for essential information; prefer 12px minimum for metadata that users need to act on.
- All controls reachable with keyboard.
- Visible focus indicators on buttons, inputs, links, menus, tabs, and dialogs.
- Correct semantic headings and labels.
- Inputs connected to labels and errors with accessible relationships.
- Dialog focus traps and returns focus to its trigger when closed.
- Buttons have labels; icon-only buttons have accessible names.
- Charts provide nearby text/table summaries or accessible descriptions for important values.
- State indicators include text, not only color.
- Honor `prefers-reduced-motion`.
- Ensure zoom to 200% and narrow viewports do not hide important actions.
- Do not require hover to reveal essential instructions/actions on touch devices.

---

## 17. Motion and animation

Use motion only for interaction feedback and status transitions.

- Typical interaction transition: 120–180ms.
- Use ease-out for entering elements and ease-in for dismissal.
- Avoid overspring/bouncy animation.
- Do not animate card positions, all numbers, or entire charts on every refresh.
- A running indicator may have a subtle pulse only when it represents a genuine live process.
- Respect reduced-motion preferences; remove nonessential animation.
- No parallax, glowing pulses across the UI, animated gradient backgrounds, or floating decorative particles.

---

## 18. Implementation guidance for the coding agent

### Phase 0 — Repository audit

1. Inspect project files, package manager, framework, CSS/Tailwind setup, and routing.
2. Find current global layout, sidebar, header, shared button/input/dialog/table components, theme setup, chart components, and main workflow pages.
3. Map each existing feature to the screen definitions above.
4. Identify design changes that can be made without changing APIs or data behavior.
5. Report the actual files to modify and any architecture mismatch. Then proceed unless a real blocker exists.

### Phase 1 — Tokens and typography

1. Add the `geist` package using the existing package manager if not installed.
2. Configure Geist Sans and Geist Mono using the installed package's actual exports and root layout API.
3. Add CSS variables for light/dark theme colors, typography, radii, spacing, border, and surfaces.
4. Add a shared typography scale and numeric-format utility/classes.
5. Implement Light/Dark/System selection with persistence and no hydration flash.
6. Remove hardcoded old purple accents only where they represent design styling; do not unintentionally alter chart semantics.
7. Verify all routes still render.

### Phase 2 — App shell and shared components

1. Redesign sidebar expanded/collapsed states.
2. Redesign header, breadcrumbs, project switcher, theme selector, and functional command palette only if implemented.
3. Normalize buttons, inputs, selects, checkbox groups, badges, tabs, dialogs, tooltips, cards, table primitives, separators, skeletons, alerts, and empty states.
4. Use shared components/tokens instead of per-page copies.
5. Verify keyboard behavior and responsive layout.

### Phase 3 — Dashboard and Create Project

Implement the Dashboard definition above. Preserve create-project data flow, validation, and loading behavior. Test first-use and populated states.

### Phase 4 — Data & Health

Implement upload, progress, error, preview, column detail, quality findings, distribution chart, and correlation view. Use actual API schema/data. Do not create mock findings in the live environment.

### Phase 5 — Strategy

Implement target/task confirmation, rationale, pipeline diagram, leakage explanation, model selection, and prerequisite states. Keep pipeline presentation synchronized with backend configuration.

### Phase 6 — Training and inspector

Implement truthful SSE progress, worker states, stable leaderboard formatting, model inspection, and recoverable errors. Confirm reconnect states and prevent duplicate training starts.

### Phase 7 — Prediction and What-If

Implement schema-aware forms, batch validation, download-ready states, simulation comparison, debounce/loading, and non-causal language.

### Phase 8 — Explainability, Audit, Exports, Print

Implement SHAP states, event history, available exports, and print stylesheet. Verify printed output in both selected themes.

### Phase 9 — Quality and regression pass

- Check desktop at 1440×900 and 1366×768.
- Check tablet at around 900px width.
- Check mobile at 390px width.
- Test light, dark, and system themes.
- Test empty, loading, success, error, disabled, and populated states.
- Test keyboard navigation and visible focus.
- Run lint, type check, unit/integration tests and build using the repository's commands.
- Do not claim checks passed unless actually run; report missing tooling clearly.
- Review the diff for dead code, unnecessary dependencies, duplicated components, and accidental backend changes.

### Code quality requirements

- Prefer small, composable components.
- Keep component responsibilities focused.
- Keep business logic/API behavior separate from styling.
- Reuse existing API clients and state management.
- Add comments only where they explain non-obvious logic; do not comment every line.
- Use types for props, API response shapes, theme tokens, and run states.
- Avoid `any` unless the existing boundary genuinely requires it; contain and document it.
- Avoid adding packages if native/installed tools already solve the problem.
- Do not make large unrelated refactors while implementing the design.
- Do not hide runtime errors with broad empty catches.

---

## 19. Definition of done

The redesign is not finished when the page merely looks different. It is finished when all relevant criteria below hold.

### Visual consistency

- [ ] Geist Sans is used for all standard UI typography.
- [ ] Geist Mono is used for code/technical identifiers and precise metric alignment.
- [ ] No lingering accidental Inter/old-font styling in common UI unless a deliberate compatibility fallback is needed.
- [ ] Typography scale and spacing scale are consistent.
- [ ] Purple glow, decorative gradients, gratuitous shadows, and “AI slop” motifs are removed.
- [ ] Light/dark/system modes work across every route and all chart surfaces.
- [ ] Numeric columns use tabular numbers and stable formatting.
- [ ] Sidebar collapses and header layout remains functional.

### Functional integrity

- [ ] Project creation and navigation still work.
- [ ] Upload, validation, preview, and profiling still work.
- [ ] Target selection and pipeline config still work.
- [ ] Training and SSE progress still work.
- [ ] Leaderboard and model inspector use actual results.
- [ ] Single and batch prediction still work.
- [ ] What-If uses the selected model and marks simulated results honestly.
- [ ] SHAP/explainability, audit, exports, and print summary work where supported by the backend.
- [ ] No placeholder actions are presented as functional.

### Accessibility/responsiveness

- [ ] Keyboard navigation and focus visibility verified.
- [ ] Inputs have labels and field errors are associated correctly.
- [ ] Status does not rely on color alone.
- [ ] 1440×900 and 1366×768 layouts are usable.
- [ ] Tablet/mobile layouts do not hide primary actions or corrupt tables.
- [ ] Reduced-motion preference is respected.
- [ ] Printed viva summary uses an intentional white-paper layout.

### Reporting

At the end of every implementation phase, state:

1. What was changed.
2. Which files changed.
3. Which behavior was preserved or affected.
4. Checks/tests run and the actual outcomes.
5. Known gaps or decisions that require a human choice.

---

## 20. Quick visual checklist — avoid “AI slop”

Before accepting any screen, ask:

- Is every card present because it groups useful content, or just to fill space?
- Does the page have one clear primary action?
- Is the most important data visible before decoration?
- Are there any gradients/glows/blurred blobs with no functional meaning? Remove them.
- Is there a decorative icon next to every single label? Remove the unnecessary ones.
- Are large metrics shown without explaining what they mean? Add definition or remove the metric.
- Is an AI recommendation displayed without evidence or override? Fix it.
- Does the screen claim success before the backend confirms it? Fix it.
- Is a dense table using several unrelated text sizes or inconsistent precision? Normalize it.
- Could two cards be a simple section and divider? Simplify it.
- Is important information hidden in a tooltip? Put it in the main UI.
- Does the dark theme have sufficient contrast, or is it just the light theme inverted? Refine it.
- Does the product resemble a landing page more than a serious tool? Remove marketing presentation.

The final UI should feel quiet, deliberate, readable, and trustworthy. It should earn visual interest from the data, visual hierarchy, and interaction quality—not from decoration.

---

## 21. Sources and rationale

These sources inform font choice and workflow principles; they do not override the AutoMLens product requirements.

1. Vercel, Geist Font — https://vercel.com/font  
   Official source for Geist Sans / Geist Mono and installation guidance.
2. Vercel, Geist Typography — https://vercel.com/geist/typography  
   Official typography system and typographic hierarchy reference.
3. Dataiku, AutoML Model Design — https://knowledge.dataiku.com/latest/ml/model-design/index.html  
   Reference for separating target selection, feature handling, algorithms, and model diagnostics.
4. H2O Driverless AI, Experiment Scores — https://docs.h2o.ai/driverless-ai/latest-stable/docs/userguide/experiment-scores.html  
   Reference for exposing experiment metrics for inspection.

**Scope note:** The detailed page structure, exact design tokens, typography scale, interaction behaviors, and implementation phases in this document are design decisions for AutoMLens, derived from the provided AutoMLens UI/UX audit and product goals. They are not claims that the reference products use the same interface.
