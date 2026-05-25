/**
 * Design token system for Marketplace-Residencia
 *
 * Color strategy: RESTRAINED (neutrals + single accent ≤10%)
 * Brand color: Warm amber/terracotta (#c97a49 ≈ oklch(60% 0.15 40))
 * Theme: Light mode optimized; dark mode via CSS variables
 *
 * All colors specified in OKLCH for perceptual uniformity.
 * Format: oklch(lightness% chroma hue)
 */

// ─── NEUTRAL PALETTE (tinted toward warm)
export const colors = {
  // Base neutrals: tinted warm for brand alignment
  neutral: {
    50: "oklch(98% 0.008 40)",    // Near white, warm tint
    100: "oklch(96% 0.01 40)",    // Very light warm
    200: "oklch(92% 0.012 40)",   // Light warm background
    300: "oklch(88% 0.012 40)",   // Warm light gray
    400: "oklch(72% 0.012 40)",   // Medium gray
    500: "oklch(56% 0.012 40)",   // Medium-dark gray
    600: "oklch(48% 0.01 40)",    // Dark gray
    700: "oklch(40% 0.008 40)",   // Very dark gray
    900: "oklch(18% 0.005 40)",   // Nearly black
  },

  // ─── PRIMARY BRAND COLOR (warm amber/terracotta)
  // This is the main accent (≤10% per Restrained strategy)
  brand: {
    50: "oklch(96% 0.04 40)",     // Very light amber
    100: "oklch(93% 0.07 40)",    // Light amber
    200: "oklch(85% 0.10 40)",    // Soft amber
    300: "oklch(75% 0.12 40)",    // Medium amber (lighter)
    400: "oklch(67% 0.14 40)",    // Medium amber
    500: "oklch(60% 0.15 40)",    // PRIMARY: Main brand color (#c97a49)
    600: "oklch(54% 0.14 40)",    // Dark amber
    700: "oklch(48% 0.13 40)",    // Darker amber
    800: "oklch(40% 0.11 40)",    // Very dark amber
    900: "oklch(30% 0.08 40)",    // Almost brown
  },

  // ─── SEMANTIC COLORS
  success: {
    50: "oklch(96% 0.05 140)",    // Very light green
    100: "oklch(92% 0.08 140)",   // Light green
    500: "oklch(65% 0.16 140)",   // Primary green
    600: "oklch(58% 0.15 140)",   // Darker green
    900: "oklch(35% 0.10 140)",   // Very dark green
  },

  error: {
    50: "oklch(96% 0.05 25)",     // Very light red
    100: "oklch(92% 0.08 25)",    // Light red
    500: "oklch(63% 0.18 25)",    // Primary red
    600: "oklch(56% 0.17 25)",    // Darker red
    900: "oklch(35% 0.12 25)",    // Very dark red
  },

  warning: {
    50: "oklch(96% 0.04 60)",     // Very light orange
    100: "oklch(92% 0.08 60)",    // Light orange
    500: "oklch(70% 0.16 60)",    // Primary orange
    600: "oklch(63% 0.15 60)",    // Darker orange
    900: "oklch(40% 0.10 60)",    // Very dark orange
  },

  info: {
    50: "oklch(96% 0.05 240)",    // Very light blue
    100: "oklch(92% 0.08 240)",   // Light blue
    500: "oklch(65% 0.15 240)",   // Primary blue
    600: "oklch(58% 0.14 240)",   // Darker blue
    900: "oklch(35% 0.10 240)",   // Very dark blue
  },
} as const;

// ─── SEMANTIC ROLE MAPPINGS (product UI: Restrained strategy)
export const semanticColors = {
  // Text colors
  text: {
    primary: colors.neutral[900],      // Very dark gray/brown
    secondary: colors.neutral[600],    // Dark gray
    tertiary: colors.neutral[500],     // Medium gray
    muted: colors.neutral[400],        // Lighter gray
    onBrand: "oklch(98% 0.005 40)",   // Light text on brand backgrounds
    onBrandSecondary: "oklch(92% 0.008 40)", // Secondary text on brand
  },

  // Background colors
  bg: {
    primary: "oklch(98% 0.008 40)",   // Near white (light page background)
    secondary: "oklch(96% 0.01 40)",  // Slightly off-white (cards, surfaces)
    tertiary: colors.neutral[200],     // Light warm gray (subtle background)
    surface: "oklch(98% 0.008 40)",   // Surface backgrounds
  },

  // Border colors
  border: {
    light: colors.neutral[200],        // Light border
    default: colors.neutral[300],      // Default border
    dark: colors.neutral[400],         // Dark border
    brand: colors.brand[500],          // Brand-colored border (accents only)
  },

  // Interactive states
  interactive: {
    accent: colors.brand[500],         // Primary brand accent
    accentHover: colors.brand[600],    // Hover state
    accentActive: colors.brand[700],   // Pressed/active state
    accentDisabled: colors.neutral[300], // Disabled state
  },

  // Status colors
  status: {
    success: colors.success[500],
    successBg: "oklch(94% 0.06 140)",
    error: colors.error[500],
    errorBg: "oklch(94% 0.06 25)",
    warning: colors.warning[500],
    warningBg: "oklch(95% 0.07 60)",
    info: colors.info[500],
    infoBg: "oklch(94% 0.06 240)",
  },
} as const;

// ─── DARK MODE PALETTE
// Invert lightness and adjust chroma for readability in dark mode
export const darkModeColors = {
  neutral: {
    50: "oklch(20% 0.005 40)",    // Dark background
    100: "oklch(25% 0.008 40)",
    200: "oklch(32% 0.01 40)",
    300: "oklch(42% 0.012 40)",
    400: "oklch(56% 0.012 40)",
    500: "oklch(68% 0.012 40)",
    600: "oklch(76% 0.01 40)",
    700: "oklch(84% 0.008 40)",
    900: "oklch(95% 0.005 40)",   // Near white
  },

  brand: {
    50: "oklch(30% 0.08 40)",
    100: "oklch(38% 0.11 40)",
    200: "oklch(48% 0.13 40)",
    300: "oklch(60% 0.15 40)",
    400: "oklch(70% 0.16 40)",
    500: "oklch(75% 0.16 40)",   // Slightly lighter in dark mode
    600: "oklch(80% 0.15 40)",
    700: "oklch(85% 0.14 40)",
    800: "oklch(90% 0.12 40)",
    900: "oklch(94% 0.08 40)",
  },
} as const;

export const darkModeSemanticColors = {
  text: {
    primary: "oklch(95% 0.005 40)",   // Near white
    secondary: "oklch(84% 0.008 40)", // Light gray
    tertiary: "oklch(76% 0.01 40)",   // Medium gray
    muted: "oklch(68% 0.012 40)",     // Darker gray
    onBrand: "oklch(18% 0.005 40)",   // Dark text on brand backgrounds
    onBrandSecondary: "oklch(30% 0.008 40)",
  },

  bg: {
    primary: "oklch(15% 0.005 40)",   // Dark background
    secondary: "oklch(22% 0.008 40)", // Slightly lighter surface
    tertiary: "oklch(32% 0.01 40)",   // Light dark gray
    surface: "oklch(18% 0.005 40)",
  },

  border: {
    light: "oklch(32% 0.01 40)",
    default: "oklch(42% 0.012 40)",
    dark: "oklch(56% 0.012 40)",
    brand: darkModeColors.brand[500],
  },

  interactive: {
    accent: darkModeColors.brand[500],
    accentHover: darkModeColors.brand[600],
    accentActive: darkModeColors.brand[700],
    accentDisabled: darkModeColors.neutral[300],
  },

  status: {
    success: colors.success[500],      // Reuse light mode values
    successBg: "oklch(30% 0.08 140)",
    error: colors.error[500],
    errorBg: "oklch(30% 0.08 25)",
    warning: colors.warning[500],
    warningBg: "oklch(35% 0.10 60)",
    info: colors.info[500],
    infoBg: "oklch(30% 0.08 240)",
  },
} as const;

/**
 * CSS Variable names for use in stylesheets
 * Usage: var(--color-text-primary), var(--color-bg-secondary), etc.
 */
export const colorVars = {
  // Text
  textPrimary: "--color-text-primary",
  textSecondary: "--color-text-secondary",
  textTertiary: "--color-text-tertiary",
  textMuted: "--color-text-muted",
  textOnBrand: "--color-text-on-brand",

  // Background
  bgPrimary: "--color-bg-primary",
  bgSecondary: "--color-bg-secondary",
  bgTertiary: "--color-bg-tertiary",
  bgSurface: "--color-bg-surface",

  // Border
  borderLight: "--color-border-light",
  borderDefault: "--color-border-default",
  borderDark: "--color-border-dark",
  borderBrand: "--color-border-brand",

  // Interactive
  accentColor: "--color-accent",
  accentHover: "--color-accent-hover",
  accentActive: "--color-accent-active",
  accentDisabled: "--color-accent-disabled",

  // Status
  successColor: "--color-success",
  errorColor: "--color-error",
  warningColor: "--color-warning",
  infoColor: "--color-info",
} as const;

// ─── HEX FALLBACKS (for quick reference, light mode)
export const hexFallbacks = {
  brand: "#306B3F",
  brandLight: "#A8C26B",
  brandDark: "#1F3A2E",
  cobre: "#C97A3E",
  verdeSilvestre: "#306B3F",
  verdeTobala: "#1F3A2E",
  verdeHoja: "#A8C26B",
  verdeMusgo: "#C5CFB0",
  hueso: "#F4F0E3",
  textPrimary: "#1F3A2E",
  textSecondary: "#4a6355",
  textTertiary: "#7a9080",
  textMuted: "#C5CFB0",
  bgPrimary: "#F4F0E3",
  bgSecondary: "#ffffff",
  bgTertiary: "#e8e4d4",
  borderLight: "#ddd8c4",
  borderDefault: "#ddd8c4",
  successColor: "#16a34a",
  errorColor: "#dc2626",
  warningColor: "#ea580c",
  infoColor: "#2563eb",
} as const;
