# xAI Tailwind CSS Configuration

## tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary
        black: '#000000',
        white: '#FFFFFF',
        
        // Gray scale (xAI specific)
        gray: {
          900: '#0D0D0D',
          800: '#1A1A1A',
          700: '#333333',
          600: '#404040',
          500: '#808080',
          400: '#B3B3B3',
          300: '#CCCCCC',
          200: '#E5E5E5',
          100: '#F5F5F5',
        },
        
        // Functional accents
        accent: {
          blue: '#0000FF',
          success: '#008000',
          warning: '#FF8000',
        },
      },
      
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Inter',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Consolas',
          'JetBrains Mono',
          'monospace',
        ],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.4' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.125rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.5)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.5)',
      },
      
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      animation: {
        'fade-in': 'fadeIn 300ms ease-out forwards',
        'slide-up': 'slideUp 300ms ease-out forwards',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      
      maxWidth: {
        'content': '800px',
        'chat': '720px',
      },
    },
  },
  plugins: [],
}
```

## Common Utility Classes

### Backgrounds
```
bg-black          /* Primary dark background */
bg-gray-900       /* Cards, elevated surfaces */
bg-gray-800       /* Dropdowns, popovers */
```

### Text
```
text-white        /* Primary text */
text-gray-400     /* Secondary text */
text-gray-500     /* Tertiary/disabled text */
```

### Borders
```
border-gray-700   /* Subtle border */
border-gray-600   /* Visible border */
```

### Buttons
```html
<!-- Primary -->
<button class="bg-white text-black px-6 py-3 rounded-md font-medium 
               hover:bg-gray-100 transition-colors duration-150">
  Button
</button>

<!-- Secondary -->
<button class="bg-transparent text-white px-6 py-3 rounded-md font-medium 
               border border-gray-500 hover:bg-gray-800 transition-colors duration-150">
  Button
</button>
```

### Cards
```html
<div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
  Card content
</div>
```

### Inputs
```html
<input class="bg-gray-900 border border-gray-700 rounded-md px-4 py-3 
              text-white placeholder-gray-500 focus:border-white 
              focus:outline-none transition-colors duration-150" />
```

