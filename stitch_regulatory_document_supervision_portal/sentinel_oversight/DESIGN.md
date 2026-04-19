# Design System Specification: The Sovereign Ledger

## 1. Overview & Creative North Star
The regulatory environment is often synonymous with visual clutter and cognitive overload. This design system rejects the "spreadsheet-first" mentality. Our Creative North Star is **"The Sovereign Ledger"**—an editorial-inspired, high-authority interface that treats legal documentation with the same prestige as a premium financial journal.

We break the standard SaaS "box-on-box" template by utilizing **intentional asymmetry** and **tonal layering**. Instead of rigid grids separated by lines, we use vast whitespace and subtle shifts in surface depth to guide the eye. The goal is to transform "supervision" from a chore into a curated experience of clarity and command.

---

## 2. Colors & Surface Logic
The palette is rooted in a deep, authoritative navy and supported by a clinical, high-contrast spectrum of status colors.

### The "No-Line" Rule
To achieve a signature premium feel, **1px solid borders are strictly prohibited for sectioning.** We do not use lines to separate the sidebar from the content or the header from the body. Instead, boundaries are defined by:
- **Background Shifts:** Using `surface` (#f6fafe) for the main canvas and `surface-container-low` (#f0f4f8) for secondary zones.
- **Negative Space:** Using the spacing scale to create "optical boundaries."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to define "importance" through depth:
1.  **Base Layer:** `surface` (#f6fafe) - The main application background.
2.  **Section Layer:** `surface-container-low` (#f0f4f8) - Used for sidebars or secondary navigation panels.
3.  **Action Layer:** `surface-container-lowest` (#ffffff) - Used for primary workspace cards or document editors to provide maximum "lift."
4.  **Interaction Layer:** `surface-container-high` (#e4e9ed) - Used for active states or nested content within a card.

### The "Glass & Gradient" Rule
For floating elements like tooltips or modal overlays, utilize **Glassmorphism**. Apply a semi-transparent `surface` color with a `backdrop-blur` of 12px-20px. This prevents the UI from feeling "heavy" and ensures the background context isn't entirely lost.
*   **Signature CTA Texture:** Use a subtle linear gradient from `primary` (#00152a) to `primary-container` (#102a43) at a 135-degree angle to give buttons a "lithographic" depth.

---

## 3. Typography
We use **Inter** exclusively for its neutral, high-legibility character, but we style it with editorial intent.

*   **Display & Headlines:** Use `display-md` or `headline-lg` for dashboard summaries. These should have a slight letter-spacing of `-0.02em` to feel more "tight" and authoritative.
*   **The Body Logic:** The `body-md` (0.875rem) is our workhorse for document text. 
*   **Labels:** `label-sm` (0.6875rem) should be used for status badges and metadata, always in uppercase with `+0.05em` letter-spacing to ensure legibility despite the small size.
*   **Tonal Contrast:** Primary headers use `on-surface` (#171c1f), while secondary metadata uses `on-surface-variant` (#43474d). This "grey-on-white" hierarchy is more sophisticated than varying font weights alone.

---

## 4. Elevation & Depth
Depth in this design system is earned, not given. We replace traditional box-shadows with **Tonal Stacking**.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card directly on a `surface-container-low` (#f0f4f8) background. The subtle contrast is enough to define the object without a shadow.
*   **Ambient Shadows:** If an element must float (e.g., a dropdown), use a shadow with a 32px blur and 4% opacity. Use a tint of the `primary` color for the shadow rather than pure black to keep the light "natural."
*   **The "Ghost Border" Fallback:** If a container requires a border for accessibility (e.g., input fields), use `outline-variant` (#c3c6ce) at **20% opacity**. It should be a suggestion of a line, not a hard barrier.

---

## 5. Components

### High-Density Data Tables
*   **Rule:** Forbid row dividers.
*   **Execution:** Use alternating row fills (Zebra striping) using `surface-container-low` and `surface`.
*   **Focus:** On hover, a row should transition to `secondary-container` (#bfddfe) at 50% opacity to highlight the data without obscuring it.

### Status Badges (The "Signal" System)
*   **Success (AR-3 Complete):** Use `tertiary-fixed-dim` (#68dba9) background with `on-tertiary-fixed-variant` (#005137) text.
*   **Pending:** Use `secondary-fixed` (#cee5ff) background with `on-secondary-fixed-variant` (#2c4964) text.
*   **Error/Missing Proof:** Use `error-container` (#ffdad6) background with `on-error-container` (#93000a) text.
*   **Shape:** Use `rounded-sm` (0.125rem) to maintain the "professional/legal" feel. Avoid pill shapes.

### Buttons
*   **Primary:** Solid `primary` (#00152a) with `on-primary` (#ffffff) text. Use `xl` (0.75rem) rounding for a modern touch.
*   **Secondary:** `surface-container-high` background. No border.
*   **Tertiary:** Transparent background with `primary` text. No border.

### Input Fields
*   **Style:** Minimalist. Use `surface-container-lowest` as the fill.
*   **State:** The active state is indicated by a 2px bottom-bar of `primary` (#00152a), rather than a full-box outline.

### Dashboard Widgets
*   **Asymmetry:** Avoid making every widget the same width. Mix "hero" widgets (70% width) with "metric" widgets (30% width) to create a rhythmic, editorial layout.
*   **Nesting:** Place charts inside `surface-container-lowest` containers to give them a "paper-like" prominence.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `surface-container` tiers to create hierarchy.
*   **Do** allow for significant whitespace between data-heavy widgets to prevent "regulatory fatigue."
*   **Do** use `on-tertiary-container` (#24a375) for positive financial or compliance metrics.

### Don’t:
*   **Don’t** use a black border or shadow on any element.
*   **Don’t** use "Alert Red" for anything other than critical legal errors.
*   **Don’t** use dividers in lists; use vertical padding (the 8px/16px scale) to separate items.
*   **Don't** use standard 400 weight for labels; use 500 (Medium) or 600 (Semi-bold) to ensure they feel like "stamps" of authority.