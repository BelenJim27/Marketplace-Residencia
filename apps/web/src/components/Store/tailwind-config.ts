/**
 * Tailwind Colors Configuration for Mezcal Marketplace
 * Based on Biocultura Oaxaca color palette
 *
 * To use: extend these colors in tailwind.config.ts
 *
 * Example:
 * extend: {
 *   colors: {
 *     terracotta: { ... },
 *     nature: { ... },
 *     earth: { ... },
 *   }
 * }
 */

export const mezcalColorPalette = {
  // Escala Arcilla (Terracota) - Primary warm earth tones
  terracotta: {
    50: '#FDF5F3',
    100: '#FAE8E3',
    200: '#F4D1C6',
    300: '#E9B5A2',
    400: '#DC9276',
    500: '#CF744F',
    600: '#B85A3A',
    700: '#97472F',
    800: '#7A3A27',
    900: '#632F22',
  },

  // Escala Naturaleza (Verdes) - Secondary nature tones
  nature: {
    50: '#F2F7F4',
    100: '#E1EBE5',
    200: '#C5D9CD',
    300: '#9FC4AE',
    400: '#74AA8A',
    500: '#53926D',
    600: '#417356',
    700: '#365B47',
    800: '#2E493B',
    900: '#283C32',
  },

  // Escala Tierra (Marrones cálidos) - Neutral earthy base
  earth: {
    50: '#F7F5F2',
    100: '#EDE8E0',
    200: '#D9CFBB',
    300: '#C2B393',
    400: '#A69169',
    500: '#8B7445',
    600: '#6F5B38',
    700: '#55472D',
    800: '#423625',
    900: '#352A1F',
  },
};

/**
 * CSS Custom Properties (Variables) for Mezcal Design System
 * Add these to your global CSS file (e.g., app.css or globals.css)
 */
export const mezcalCSSVariables = `
:root {
  /* Terracotta - Primary Brand Color */
  --color-terracotta-50: #FDF5F3;
  --color-terracotta-100: #FAE8E3;
  --color-terracotta-200: #F4D1C6;
  --color-terracotta-300: #E9B5A2;
  --color-terracotta-400: #DC9276;
  --color-terracotta-500: #CF744F;
  --color-terracotta-600: #B85A3A;
  --color-terracotta-700: #97472F;
  --color-terracotta-800: #7A3A27;
  --color-terracotta-900: #632F22;

  /* Nature - Secondary Brand Color */
  --color-nature-50: #F2F7F4;
  --color-nature-100: #E1EBE5;
  --color-nature-200: #C5D9CD;
  --color-nature-300: #9FC4AE;
  --color-nature-400: #74AA8A;
  --color-nature-500: #53926D;
  --color-nature-600: #417356;
  --color-nature-700: #365B47;
  --color-nature-800: #2E493B;
  --color-nature-900: #283C32;

  /* Earth - Neutral Color */
  --color-earth-50: #F7F5F2;
  --color-earth-100: #EDE8E0;
  --color-earth-200: #D9CFBB;
  --color-earth-300: #C2B393;
  --color-earth-400: #A69169;
  --color-earth-500: #8B7445;
  --color-earth-600: #6F5B38;
  --color-earth-700: #55472D;
  --color-earth-800: #423625;
  --color-earth-900: #352A1F;

  /* Semantic Tokens */
  --color-primary: var(--color-terracotta-600);
  --color-primary-dark: var(--color-terracotta-700);
  --color-secondary: var(--color-nature-600);
  --color-secondary-dark: var(--color-nature-700);
  --color-text: var(--color-earth-900);
  --color-text-secondary: var(--color-earth-600);
  --color-background: #FFFFFF;
  --color-surface: #F7F5F2;
  --color-border: var(--color-earth-100);
  --color-error: #DC2626;
  --color-success: var(--color-nature-600);
  --color-warning: #D97706;
  --color-info: #0EA5E9;

  /* Spacing System (8pt base) */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;

  /* Typography */
  --font-serif: 'Crimson Text', 'Georgia', serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --easing-ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-ease-in: cubic-bezier(0.4, 0, 1, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
`;

/**
 * Design Tokens for Reference
 */
export const designTokens = {
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  typography: {
    serif: ['Crimson Text', 'Georgia', 'serif'],
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    fontSizes: {
      xs: ['12px', '16px'],
      sm: ['14px', '20px'],
      md: ['16px', '24px'],
      lg: ['18px', '28px'],
      xl: ['24px', '32px'],
      '2xl': ['32px', '40px'],
      '3xl': ['48px', '56px'],
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
