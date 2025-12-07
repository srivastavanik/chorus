# xAI Motion & Animation

## Principles

1. **Subtle and purposeful**: Animations enhance understanding, not decoration
2. **Quick and responsive**: 150-300ms for micro-interactions
3. **Smooth easing**: Natural, physics-based feel

## Easing Functions

```css
--ease-out: ease-out;
--ease-in-out: ease-in-out;
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
```

## Timing by Interaction Type

| Type                    | Duration   | Easing              |
|-------------------------|------------|---------------------|
| Micro (hover, focus)    | 100-200ms  | ease-out            |
| Small (expand, collapse)| 200-300ms  | ease-in-out         |
| Medium (modal open)     | 300-400ms  | cubic-bezier(0.4, 0, 0.2, 1) |
| Large (page transition) | 400-500ms  | ease-in-out         |

## Common Animations

### Hover Transitions
```css
transition: all 150ms ease-out;
/* Subtle opacity or background changes */
```

### Page Transitions
```css
/* Fade or slide */
transition: opacity 250ms ease-in-out;
```

### Loading States
- Smooth pulsing
- Rotating indicators
- Dot animations

### Content Reveal
- Subtle fade-in on scroll or load
- Staggered delays for lists

## CSS Examples

### Button Hover
```css
.button {
  transition: background-color 150ms ease-out, 
              transform 150ms ease-out;
}
.button:hover {
  background-color: rgba(255, 255, 255, 0.9);
}
.button:active {
  transform: scale(0.98);
}
```

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.fade-in {
  animation: fadeIn 300ms ease-out forwards;
}
```

### Thinking Dots
```css
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.thinking-dot {
  animation: pulse 1.4s ease-in-out infinite;
}
.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }
```

### Slide Up
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.slide-up {
  animation: slideUp 300ms ease-out forwards;
}
```

