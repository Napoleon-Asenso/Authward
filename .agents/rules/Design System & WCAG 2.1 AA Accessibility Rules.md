---
trigger: glob
---

# 

## UI Library \& Styling Stack

# DESIGN SYSTEM & ACCESSIBILITY RULES (`design-system-and-accessibility.md`)

This rule file defines non-negotiable styling, design token mapping, UI component states, and accessibility standards for the Authentication Slice. All components MUST consume design tokens derived from `matisse-tokens-all.json` via CSS variables/Tailwind utility classes.

---

## 1. DESIGN TOKEN SPECIFICATION (MATISSE SYSTEM)

### Color Tokens & Semantic Usage
The application supports Light and Dark mode using the Matisse token system. Tailwind classes MUST map to the following semantic HSL definitions:

* **Primary (`hsl(295, 100%, 43%)`):** Primary action buttons, active form borders, key UI focus states.
* **On-Primary (`hsl(0, 0%, 100%)`):** Text/icons rendered on top of primary-colored containers.
* **Surface / Background (`hsl(300, 56%, 98%)` Light / `hsl(270, 7%, 11%)` Dark):** Main authentication card containers and body background.
* **Surface Variant (`hsl(276, 19%, 90%)` Light / `hsl(257, 5%, 29%)` Dark):** Input backgrounds, card headers, and secondary container fills.
* **Outline (`hsl(262, 3%, 48%)` Light / `hsl(267, 4%, 58%)` Dark):** Form input borders, dividers, and structural outlines.
* **Error (`hsl(0, 100%, 50%)`):** Form error messages, invalid field borders, and high-severity notification banners.

### Typography Tokens
* **Font Family:** `Roboto` (sans, display, mono).
* **Scale:**
  * Base Body: `font-size-base` (`1rem` / `16px`), `line-height-normal` (`1.5`).
  * Form Labels & Helper Text: `font-size-sm` (`0.875rem` / `14px`).
  * Card Titles / Headings: `font-size-2xl` (`1.5rem` / `24px`), `font-weight-bold` (`700`).
  * Validation Error Text: `font-size-xs` (`0.75rem` / `12px`), `font-weight-medium` (`500`).

### Spacing & Radius Tokens
* **Input Padding:** `spacing-12` (`0.75rem` horizontal), `spacing-10` (`0.625rem` vertical).
* **Form Gap / Stack:** `spacing-16` (`1rem` / `16px`) vertical spacing between input groups.
* **Card Container Padding:** `spacing-24` (`1.5rem` / `24px`) or `spacing-32` (`2rem` / `32px`).
* **Border Radius:** Form Inputs MUST use `radius-md` (`0.5rem` / `8px`). Card Containers MUST use `radius-xl` (`1rem` / `16px`). Buttons MUST use `radius-md` (`0.5rem`).

### Shadows & Elevation
* **Auth Card Elevation:** `elevation-2` (`0 3px 6px rgba(0,0,0,0.10)`) or `shadow-md`.
* **Glow/Focus Accent:** `shadow-glow-primary` (`0 0 20px hsla(256, 34%, 48%, 0.35)`).

---

## 2. COMPONENT INTERACTIVE STATES

Every form element across `/signup`, `/verify-email`, `/signin`, `/forgot-password`, and `/reset-password` MUST implement 4 explicit visual states:

1. **Idle State:** 
   * Input border: `border-[hsl(262,3%,48%)]` (`outline-color`).
   * Input background: `bg-[hsl(276,19%,90%)]` (`surface-variant-color`).
2. **Focus / Active State:**
   * High-contrast focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(295,100%,43%)] focus-visible:ring-offset-2`.
3. **Submitting / Disabled State:**
   * Buttons MUST set `disabled={isSubmitting}`.
   * Visual indicator: Opacity reduced to `opacity-50`, cursor set to `cursor-not-allowed`.
   * Primary submit button MUST render an inline SVG loading spinner when processing actions.
4. **Error State:**
   * Input border: `border-[hsl(0,100%,50%)]` (`error-color`).
   * Inline message text: `text-[hsl(0,100%,50%)]`.

---

## 3. ACCESSIBILITY (WCAG 2.1 AA) MANDATES

* **Explicit Label Association:** EVERY form field MUST pair `<label htmlFor="field-id">` with `<input id="field-id">`. Implicit wrapping labels are strictly forbidden.
* **Screen Reader Error Announcements:**
  * Invalid form fields MUST declare `aria-invalid="true"`.
  * Inputs MUST link to their corresponding error message container using `aria-describedby="[field-id]-error"`.
  * Top-level form alert banners MUST declare `role="alert"` and `aria-live="assertive"`.
* **Keyboard Navigability:**
  * All form actions, password toggles, and resend controls MUST be triggerable via `Tab`, `Space`, and `Enter` keys.
  * Interactive elements MUST NOT remove default outline styles without providing custom `focus-visible:ring-*` utilities.
* **Semantic Structure:** Forms MUST be wrapped in semantic `<form>` tags. Submit buttons MUST explicitly declare `type="submit"`. Secondary actions (e.g., "Toggle Password Visibility", "Resend Code") MUST declare `type="button"`.
* **Layout Isolation:** Build modular form elements inside `src/app/(auth)`\[cite: 4].

## Accessibility Controls (WCAG 2.1 AA)

* **Explicit Label Association:** EVERY form input control MUST be programmatically tied to an explicit `<label>` using matching `id` and `htmlFor` attributes\[cite: 4].
* **Focus States:** EVERY interactive element (inputs, buttons, links) MUST display high-contrast focus rings using Tailwind's `focus-visible:ring-2 focus-visible:ring-offset-2` classes\[cite: 4].
* **Form Error Attributes:** When an input validation fails:

  * Set `aria-invalid="true"` on the input element\[cite: 4].
  * Link the input to its corresponding error message element via `aria-describedby="\[error-element-id]"`\[cite: 4].
* **Error Banner Roles:** Page-level or form-level error summaries MUST use `role="alert"`\[cite: 4].
* **Keyboard Navigability:** ALL forms, links, and buttons MUST be fully functional using keyboard controls (`Tab`, `Shift+Tab`, `Space`, `Enter`)\[cite: 4].

## Interactive Component States

* **Visual States:** Components MUST account for 4 distinct visual states:

  1. *Idle:* Default interactive form state.
  2. *Loading/Submitting:* Disabled inputs, visible spinner, text changed (e.g., "Submitting...").
  3. *Disabled:* Reduced opacity (`opacity-50 cursor-not-allowed`).
  4. *Error:* Border highlights in red, clear error text rendered directly under the field.

