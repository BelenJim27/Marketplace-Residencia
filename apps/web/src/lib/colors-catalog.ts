/**
 * Catalog-specific color tokens
 * Extends hexFallbacks with semantic colors for product catalog views
 * Strategy: Restrained (neutrals + brand accent ≤10%)
 *
 * Color roles:
 * - Hero: Warm earth tones (mezcal heritage)
 * - Cards: Soft warm neutrals (approachable)
 * - Accent: Brand green (primary action)
 * - State: Semantic colors (success, error, warning)
 */

import { hexFallbacks } from './colors';

export const catalogColors = {
  // ─── Hero Section ───
  hero: {
    // Gradient background - represents mezcal production heritage
    gradientStart: '#8b7445',    // Warm clay/earth
    gradientMid: '#6f5b38',      // Darker earth
    gradientEnd: '#55472d',      // Deep soil

    // Text and decorative elements
    textPrimary: '#f7f5f2',      // Cream/off-white (high contrast)
    decorativeAccent: 'rgba(83, 146, 109, 0.6)',  // Subtle green (brand)
  },

  // ─── Product Cards ───
  card: {
    // Background colors by category
    category: {
      mezcal: '#F2F7F4',         // Very light sage (default)
      artesanal: '#D9CFBB',      // Warm beige
      ancestral: '#E9B5A2',      // Warm peach
    },

    // Text on cards
    text: {
      primary: hexFallbacks.textPrimary,
      secondary: hexFallbacks.textSecondary,
      muted: hexFallbacks.textMuted,
    },

    // Card backgrounds
    background: hexFallbacks.bgSecondary,
    accent: hexFallbacks.brand,
  },

  // ─── Stars and Ratings ───
  rating: {
    full: '#C97A49',             // Warm copper/bronze (mezcal warmth)
    empty: '#e0d5c7',            // Light neutral (unrated)
    emptyDark: 'rgba(255, 255, 255, 0.3)',  // Light for dark cards
  },

  // ─── Price Display ───
  price: {
    text: '#C97A49',             // Copper/bronze (emphasize value)
    background: hexFallbacks.bgSecondary,
    badge: hexFallbacks.brand,
  },

  // ─── Filters & Badges ───
  filter: {
    badge: {
      background: `${hexFallbacks.brand}22`,  // 13% opacity
      border: `${hexFallbacks.brand}4d`,      // 30% opacity
      text: hexFallbacks.brand,
    },
  },

  // ─── State Colors ───
  state: {
    success: hexFallbacks.successColor,
    error: hexFallbacks.errorColor,
    warning: '#F59E0B',          // Amber (alerts)
    info: hexFallbacks.brand,
  },

  // ─── Semantic Actions ───
  action: {
    primary: hexFallbacks.brand,        // Add to cart, apply filters
    secondary: hexFallbacks.bgSecondary, // Neutral actions
    danger: hexFallbacks.errorColor,    // Delete, remove
  },

  // ─── Borders & Dividers ───
  border: {
    light: hexFallbacks.borderLight,
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },

  // ─── Dark Mode Adaptations ───
  darkMode: {
    hero: {
      gradientStart: '#5a4730',
      gradientMid: '#47372a',
      gradientEnd: '#32281f',
    },
    card: {
      background: 'rgba(255, 255, 255, 0.05)',
      text: 'rgba(255, 255, 255, 0.9)',
    },
  },
};

export default catalogColors;
