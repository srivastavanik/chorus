# xAI Typography System

## Font Families

### Sans-Serif (Primary)
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
```

### Monospace (Code/Technical)
```css
--font-mono: 'SF Mono', 'Monaco', 'Consolas', 'JetBrains Mono', monospace;
```

## Type Scale

```css
--text-xs:   0.75rem;   /* 12px */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */
--text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */
--text-4xl:  2.25rem;   /* 36px */
--text-5xl:  3rem;      /* 48px */
```

## Semantic Sizing

| Element      | Size (px) | Weight  | Line Height |
|--------------|-----------|---------|-------------|
| Display/Hero | 48-72     | 600-700 | 1.1-1.2     |
| H1           | 32-40     | 600     | 1.2         |
| H2           | 24-28     | 600     | 1.25        |
| H3           | 20-22     | 500-600 | 1.3         |
| H4           | 18        | 500     | 1.4         |
| Body Large   | 18        | 400     | 1.5         |
| Body         | 16        | 400     | 1.5-1.6     |
| Body Small   | 14        | 400     | 1.5         |
| Caption      | 12-13     | 400     | 1.4         |
| Label/Micro  | 10-11     | 500     | 1.3         |

## Font Weights

```css
--font-normal:   400;  /* Body text, general content */
--font-medium:   500;  /* Subheadings, emphasis, buttons */
--font-semibold: 600;  /* Primary headings, strong emphasis */
--font-bold:     700;  /* Sparingly, maximum emphasis */
```

## Letter Spacing

| Context        | Value              |
|----------------|-------------------|
| Headings       | -0.01em to -0.02em (tighter) |
| Body           | 0 (default)        |
| All Caps/Labels| +0.02em to +0.05em (looser)  |

## Typography Characteristics

- **High legibility** at all sizes
- **Neutral, technology-forward** appearance
- **Strong x-height** for screen readability
- **Clear letterforms** without decorative elements

