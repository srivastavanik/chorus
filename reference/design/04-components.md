# xAI UI Components

## Buttons

### Primary Button
```css
background: #FFFFFF;
color: #000000;
border-radius: 6-8px;
padding: 12px 24px;
font-weight: 500-600;

/* Hover */
opacity: 0.9; /* or slight gray tint */
```

### Secondary/Ghost Button
```css
background: transparent;
color: #FFFFFF;
border: 1px solid #808080;
border-radius: 6-8px;

/* Hover */
background: rgba(255, 255, 255, 0.1);
```

### Text Button/Link
```css
color: #FFFFFF;
background: none;
text-decoration: none;

/* Hover */
text-decoration: underline;
```

## Input Fields

### Text Input (Dark Mode)
```css
background: #0D0D0D to #1A1A1A;
border: 1px solid #333333;
border-radius: 6-8px;
color: #FFFFFF;

/* Placeholder */
color: #808080;

/* Focus */
border-color: #FFFFFF; /* or subtle glow */
```

### Chat Input Area
- Larger padding for comfortable typing
- Multi-line capable
- Subtle distinction from chat history

## Cards & Surfaces

### Card Component
```css
background: #0D0D0D; /* elevated from #000000 base */
border: 1px solid #333333; /* optional */
border-radius: 8-12px;
padding: 16-24px;
box-shadow: none; /* or minimal */
```

## Navigation

### Sidebar Navigation
- Full-height dark panel
- Icon + text labels
- Active: Subtle background highlight or left border
- Hover: Subtle background change

### Header
- Minimal, unobtrusive
- Logo on left
- Actions on right
- Sticky with subtle background on scroll

## Chat Interface

### Message Bubbles
- User messages: Right-aligned or subtle background distinction
- AI responses: Left-aligned, minimal styling
- No heavy bubble styling—clean, content-focused

### Thinking/Loading State
- Animated indicator (dots, spinner, or custom)
- Subtle, non-intrusive
- May show "thinking" text

## Iconography

### Style Guidelines
- **Line-based**: Clean, minimal stroke
- **Stroke weight**: 1.5-2px consistent
- **Size grid**: 16px, 20px, 24px
- **Color**: Monochromatic (white on dark, black on light)
- **Style**: Geometric, precise, technology-forward

### Recommended Icon Sets
- Lucide Icons (open source, clean)
- Feather Icons (minimal, tech-appropriate)

