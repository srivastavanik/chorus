# xAI Color System

## Primary Palette

### Pure Black
```css
--color-black: #000000;
```
- RGB: (0, 0, 0)
- Usage: Primary background, logo fills, text in light mode
- **Important**: Use TRUE pure black, not off-black

### Pure White
```css
--color-white: #FFFFFF;
```
- RGB: (255, 255, 255)
- Usage: Primary text on dark, background in light mode, negative space

## Gray Scale

```css
--color-gray-900: #0D0D0D;  /* Surface dark, cards */
--color-gray-800: #1A1A1A;  /* Elevated surfaces, dropdowns */
--color-gray-700: #333333;  /* Subtle borders */
--color-gray-600: #404040;  /* Visible borders */
--color-gray-500: #808080;  /* Secondary text, comments, disabled */
--color-gray-400: #B3B3B3;  /* Tertiary text */
--color-gray-300: #CCCCCC;
--color-gray-200: #E5E5E5;
--color-gray-100: #F5F5F5;
```

## Functional Accents (Sparingly)

```css
--color-accent-blue: #0000FF;   /* Links, interactive elements */
--color-success: #008000;        /* Success states, keywords */
--color-warning: #FF8000;        /* Warning states, numbers */
```

## Dark Mode Layers

```
Base background:     #000000 (pure black)
Surface 1 (cards):   #0D0D0D to #121212
Surface 2 (popover): #1A1A1A
Surface 3 (hover):   #262626
```

## Text Hierarchy (Dark Mode)

```css
--text-primary: #FFFFFF;                    /* 100% white */
--text-secondary: rgba(255, 255, 255, 0.7); /* ~#B3B3B3 */
--text-tertiary: rgba(255, 255, 255, 0.5);  /* ~#808080 */
```

## Borders & Dividers

```css
--border-subtle: rgba(255, 255, 255, 0.1);  /* #333333 */
--border-visible: rgba(255, 255, 255, 0.2); /* #404040 */
--border-focus: #FFFFFF;
```

## Application Rules

1. **Dark Mode Default**: Interface primarily in dark mode
2. **High Contrast**: Text always strong contrast against background
3. **Monochrome First**: Color only for functional purposes
4. **No Brand Gradients**: Core branding avoids gradients
5. **Cosmic Accents**: When used, evoke space/technology (blues, subtle glows)

