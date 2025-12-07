# xAI CSS Custom Properties

## Complete Variables File

```css
:root {
  /* ========== COLORS ========== */
  
  /* Primary */
  --color-black: #000000;
  --color-white: #FFFFFF;
  
  /* Gray Scale */
  --color-gray-900: #0D0D0D;
  --color-gray-800: #1A1A1A;
  --color-gray-700: #333333;
  --color-gray-600: #404040;
  --color-gray-500: #808080;
  --color-gray-400: #B3B3B3;
  --color-gray-300: #CCCCCC;
  --color-gray-200: #E5E5E5;
  --color-gray-100: #F5F5F5;
  
  /* Functional */
  --color-accent: #0000FF;
  --color-success: #008000;
  --color-warning: #FF8000;
  --color-error: #FF0000;
  
  /* ========== SEMANTIC COLORS ========== */
  
  /* Backgrounds */
  --bg-primary: var(--color-black);
  --bg-secondary: var(--color-gray-900);
  --bg-tertiary: var(--color-gray-800);
  --bg-hover: var(--color-gray-700);
  
  /* Text */
  --text-primary: var(--color-white);
  --text-secondary: var(--color-gray-400);
  --text-tertiary: var(--color-gray-500);
  --text-inverse: var(--color-black);
  
  /* Borders */
  --border-subtle: var(--color-gray-700);
  --border-default: var(--color-gray-600);
  --border-focus: var(--color-white);
  
  /* ========== TYPOGRAPHY ========== */
  
  /* Font Families */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Consolas', 'JetBrains Mono', monospace;
  
  /* Font Sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Heights */
  --leading-tight: 1.2;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Letter Spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
  
  /* ========== SPACING ========== */
  
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  
  /* ========== BORDERS ========== */
  
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
  --radius-full: 9999px;
  
  --border-width: 1px;
  --border-width-2: 2px;
  
  /* ========== SHADOWS ========== */
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  
  /* ========== TRANSITIONS ========== */
  
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
  
  --ease-out: ease-out;
  --ease-in-out: ease-in-out;
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* ========== LAYOUT ========== */
  
  --max-width-content: 800px;
  --max-width-chat: 720px;
  --sidebar-width: 280px;
  --header-height: 64px;
  
  /* ========== Z-INDEX ========== */
  
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal-backdrop: 40;
  --z-modal: 50;
  --z-popover: 60;
  --z-tooltip: 70;
}

/* ========== DARK MODE (Default) ========== */
.dark,
:root {
  color-scheme: dark;
}

/* ========== LIGHT MODE ========== */
.light {
  --bg-primary: var(--color-white);
  --bg-secondary: var(--color-gray-100);
  --bg-tertiary: var(--color-gray-200);
  --bg-hover: var(--color-gray-300);
  
  --text-primary: var(--color-black);
  --text-secondary: var(--color-gray-600);
  --text-tertiary: var(--color-gray-500);
  --text-inverse: var(--color-white);
  
  --border-subtle: var(--color-gray-200);
  --border-default: var(--color-gray-300);
  --border-focus: var(--color-black);
  
  color-scheme: light;
}
```

## Usage Examples

```css
/* Button */
.btn-primary {
  background: var(--text-primary);
  color: var(--text-inverse);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: opacity var(--duration-normal) var(--ease-out);
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Card */
.card {
  background: var(--bg-secondary);
  border: var(--border-width) solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

/* Input */
.input {
  background: var(--bg-secondary);
  border: var(--border-width) solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  font-size: var(--text-base);
  transition: border-color var(--duration-normal) var(--ease-out);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:focus {
  border-color: var(--border-focus);
  outline: none;
}
```

