# xAI Spacing System

## Base Unit: 4px

## Spacing Scale

```css
--space-1:  0.25rem;  /* 4px */
--space-2:  0.5rem;   /* 8px */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px */
--space-5:  1.25rem;  /* 20px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

## Application Guidelines

| Context                  | Spacing        |
|--------------------------|----------------|
| Component internal padding | 12-24px      |
| Between related elements | 8-16px         |
| Between sections         | 32-64px        |
| Page margins (mobile)    | 16-24px        |
| Page margins (desktop)   | 32-64px        |
| Maximum content width    | 720-800px      |

## Border Radius

```css
--radius-sm:   4px;
--radius-md:   6px;
--radius-lg:   8px;
--radius-xl:   12px;
--radius-2xl:  16px;
--radius-full: 9999px;
```

### Radius by Element Type

| Element           | Radius     |
|-------------------|------------|
| Buttons           | 6-8px      |
| Input fields      | 6-8px      |
| Cards             | 8-12px     |
| Modals/Dialogs    | 12-16px    |
| Avatars (circular)| 50%        |
| Avatars (rounded) | 8px        |
| Chips/Tags        | 4-6px or pill |

**Philosophy**: Rounded but not bubbly. Corners softened enough to feel modern without becoming playful.

## Borders

```css
--border-thin:   1px solid var(--color-gray-700);
--border-medium: 2px solid var(--color-gray-600);
```

## Shadows (Minimal)

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
```

## Responsive Breakpoints

```css
/* Mobile */      0 - 639px
/* Tablet */      640px - 1023px
/* Desktop */     1024px - 1279px
/* Large Desktop */ 1280px+
```

### Mobile Considerations

- Full-width layouts
- Larger touch targets (minimum 44px)
- Simplified navigation (hamburger menu)
- Reduced spacing proportionally
- Bottom-aligned chat input for thumb accessibility

