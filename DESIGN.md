---
version: "alpha"
name: "Agent Config Studio Design System"
colors:
  canvas:
    default: "#0a0a0a"
    subtle: "#121212"
    surface: "#171717"
    surfaceHover: "#1f1f1f"
    surfaceActive: "#262626"
  border:
    subtle: "#262626"
    default: "#404040"
    strong: "#525252"
  text:
    primary: "#f5f5f5"
    secondary: "#a3a3a3"
    muted: "#737373"
    inverse: "#0a0a0a"
  accent:
    primary: "#f59e0b"
    hover: "#fbbf24"
    active: "#d97706"
    subtle: "rgba(245, 158, 11, 0.1)"
    border: "rgba(245, 158, 11, 0.25)"
  semantic:
    success: "#10b981"
    successSubtle: "rgba(16, 185, 129, 0.1)"
    warning: "#f59e0b"
    warningSubtle: "rgba(245, 158, 11, 0.1)"
    danger: "#f43f5e"
    dangerSubtle: "rgba(244, 63, 94, 0.1)"
    info: "#6366f1"
    infoSubtle: "rgba(99, 102, 241, 0.1)"
  tools:
    claude: "#d97706"
    codex: "#10b981"
    pi: "#6366f1"
    opencode: "#ec4899"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontWeight: "700"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    lineHeight: "1.5"
    fontWeight: "400"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
    fontSize: "12px"
    lineHeight: "1.6"
    fontVariantNumeric: "tabular-nums"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
components:
  button:
    primary:
      background: "{colors.accent.primary}"
      color: "{colors.text.inverse}"
      borderRadius: "{rounded.md}"
      padding: "8px 16px"
      fontWeight: "600"
    secondary:
      background: "{colors.canvas.surface}"
      border: "1px solid {colors.border.subtle}"
      color: "{colors.text.primary}"
      borderRadius: "{rounded.md}"
      padding: "8px 14px"
  card:
    background: "{colors.canvas.surface}"
    border: "1px solid {colors.border.subtle}"
    borderRadius: "{rounded.lg}"
    padding: "{spacing.lg}"
  table:
    headerBackground: "rgba(23, 23, 23, 0.6)"
    rowHoverBackground: "rgba(23, 23, 23, 0.4)"
    border: "1px solid {colors.border.subtle}"
    fontSize: "12px"
  toggle:
    activeTrack: "{colors.accent.primary}"
    inactiveTrack: "{colors.border.subtle}"
    thumb: "{colors.canvas.default}"
    borderRadius: "{rounded.full}"
  drawer:
    background: "{colors.canvas.surface}"
    borderLeft: "1px solid {colors.border.subtle}"
    backdrop: "rgba(0, 0, 0, 0.7)"
---

# Agent Config Studio Design System

## Overview

Agent Config Studio is a developer tool and local AI configuration manager inspired by the minimalist ergonomics of Linear, VS Code, and Raycast. It is engineered specifically for terminal and agent software engineers who configure MCP servers, `SKILL.md` packages, and system prompt presets for **Claude Code**, **OpenAI Codex**, **Pi Coding Agent**, and **OpenCode**.

The visual identity prioritizes **high density, extreme legibility, tabular numeric alignment, and anti-slop aesthetic restraint**. Every interactive affordance represents a real, executable configuration capability without decorative telemetry or non-functional visual noise.

---

## Colors

The palette adheres to a strict **60-30-10 distribution**:
- **60% Dominant Neutral Canvas**: Deep neutral slate blacks (`#0a0a0a` to `#121212`) providing an undistracting workspace background.
- **30% Structural Surfaces**: Clean, unembossed containers (`#171717`), hairline dividers (`#262626`), and muted typographic labels (`#a3a3a3`).
- **10% High-Intent Accent**: Warm amber (`#f59e0b`) reserved strictly for primary calls-to-action, active selection states, and key badges.

### Target Environment Colors
Each supported AI coding tool possesses an immutable indicator dot and badge token:
- **Claude Code**: `#D97706` (Warm Anthropic Amber)
- **OpenAI Codex**: `#10B981` (Emerald Terminal Green)
- **Pi Coding Agent**: `#6366F1` (Focused Indigo)
- **OpenCode**: `#EC4899` (Open Source Pink)

### Semantic Tokens
- **Success / Enabled**: `#10b981` (`emerald-500`) with `rgba(16, 185, 129, 0.1)` backgrounds.
- **Warning / Transport Caution**: `#f59e0b` (`amber-500`) with `rgba(245, 158, 11, 0.1)` backgrounds.
- **Danger / Deletion**: `#f43f5e` (`rose-500`) with `rgba(244, 63, 94, 0.1)` backgrounds.
- **Info / Blue**: `#60a5fa` (`blue-400`).

---

## Typography

The typography pairs a contemporary geometric neo-grotesque display face with a tabular monospace outlier:

- **Display & Headings**: `Plus Jakarta Sans`, font-weights `600` (SemiBold) and `700` (Bold), with optical tracking `-0.025em`.
- **Body & UI Controls**: `Plus Jakarta Sans`, 13px–14px, regular 400 and medium 500, with optical line-height `1.5`.
- **Code, File Paths & Tabular Metrics**: `JetBrains Mono`, 11px–12px with explicit `font-variant-numeric: tabular-nums` to ensure exact column alignment across tables, metrics counters, and diffs.

### Hierarchy Scale
- **H1 / View Header**: `16px`–`18px`, weight `600`, line-height `1.3`, tracking `-0.015em`.
- **H2 / Section Title**: `14px`–`15px`, weight `600`, tracking `-0.01em`.
- **H3 / Card Header**: `13px`–`14px`, weight `600`.
- **Body Text**: `12px`–`13px`, weight `400`, text-neutral-300 / text-neutral-400.
- **Metadata & Micro-Labels**: `10px`–`11px`, font-mono, text-neutral-500.

---

## Layout

The application operates in a fixed, desktop-first workspace layout:

- **Fixed Sidebar**: `256px` (`w-64`) left navigation containing brand mark, workspace section routes (Overview, MCP Servers, Skills, Prompts, Export Center, Settings), target environment directory formats, and storage indicators.
- **Top Bar Contract**: Fixed `56px` (`h-14`) height adhering to a 3-zone contract:
  - **Zone 1 (Left)**: Active breadcrumb (`Section / Subtitle`).
  - **Zone 2 (Center)**: Global search input (`max-w-md`) with instant filter feedback.
  - **Zone 3 (Right)**: Quick Resource Add dropdown menu, Quick Export button, and dark/light mode toggle.
- **Main Viewport**: Padded `p-8` container constrained to `max-w-7xl` with responsive flex and grid layouts.
- **Drawers & Modals**: Right slide-over drawers (`max-w-2xl` to `max-w-4xl`) with split-column editors and instant two-way synchronization.

---

## Elevation & Depth

- **Single-Elevation Depth**: Surfaces are flat matte panels separated by subtle 1px hairline borders (`border border-neutral-800`). No multi-tiered drop shadows or nested cards-within-cards.
- **Overlay Scrims**: Modal backdrops use `rgba(0, 0, 0, 0.7)` with subtle `backdrop-blur-xs` to keep primary focus on configuration editing.
- **Hover Micro-States**: Table rows and card elements transition softly using `transition-colors duration-150` (`hover:bg-neutral-900/60`).

---

## Shapes

- **Base Corner Radius Scale**:
  - Buttons & Inputs: `rounded-lg` (`8px`)
  - Cards, Tables & Drawers: `rounded-xl` (`12px`)
  - Tags & Inline Badges: `rounded` (`4px`) or `rounded-md` (`6px`)
  - Switch Controls: `rounded-full` (`9999px`)
- **Outer/Inner Nested Math**: Container outer padding ($\ge 16\text{px}$) always exceeds inner element spacing ($\le 8\text{px}$–$12\text{px}$) to maintain harmonious geometric nesting.

---

## Components

### 1. Matrix Configuration Table
- **Header**: High-contrast, uppercase micro-labels (`10px`–`11px` font-mono) with select-all checkbox.
- **Cells**: Truncated text with full title tooltips, command pills in `bg-neutral-900 font-mono`, and aligned action buttons.
- **Toggles**: Compact pill switches (`w-10 h-5`) with animated sliding thumb indicating "Included in export".

### 2. Form & Drawers
- **Two-way Sync**: Tabs toggling seamlessly between structured form inputs and raw JSON/Markdown representations.
- **Secret Masking**: Dedicated password/text toggle for environment variables and authorization headers with eye icons.

### 3. Syntax Code Viewer
- **Line Numbers**: Right-aligned, non-selectable line markers.
- **Copy Affordance**: Header action with copy confirmation feedback.
- **Coloring**: High-contrast syntax tokens matching the dark canvas.

### 4. Toast Notifications
- Fixed bottom-right notification stack with semantic color coding (Emerald success, Rose error, Amber warning, Blue info) and auto-dismissal.

---

## Do's and Don'ts

### Do
- **Do use tabular numerals** (`font-mono tabular-nums`) on all counts, bytes, and metrics.
- **Do clearly distinguish browser exports from filesystem installations**: Use labels like *"Included in export"* and *"Download bundle"* rather than *"Installed"* or *"Synced"*.
- **Do validate compatibility rules**: Warn explicitly when Pi is selected for an SSE transport server.
- **Do redact secrets by default**: Mask API tokens and authorization headers with `***REDACTED_SECRET***` in generated exports.
- **Do provide non-destructive merge options**: Preserve existing user properties when merging configurations.

### Don't
- **Don't wrap metadata in candy pill badges**: Use unboxed text separated by typographic dividers (`·` or `/`).
- **Don't use neon cyan/magenta gradients or ornamental telemetry tickers**.
- **Don't add non-functional decorative buttons**: Every visible icon, link, and button must execute an active handler.
- **Don't allow multiple active prompts per AI tool**: Exactly one prompt can be active per tool; activating one deactivates the previous.
- **Don't execute shell commands or fake local process spawning**: Keep all operations safely sandboxed in the browser.
