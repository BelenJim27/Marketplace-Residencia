import { useTheme } from "next-themes";
import { semanticColors, darkModeSemanticColors, hexFallbacks, darkModeColors, colors } from "./colors";
import { catalogColors } from "./colors-catalog";

export function useThemeColors() {
  const { theme } = useTheme();

  const currentSemanticColors = theme === 'dark' ? darkModeSemanticColors : semanticColors;
  const currentHexFallbacks = theme === 'dark' ? {
    ...hexFallbacks,
    brand: darkModeColors.brand[500],
    brandLight: darkModeColors.brand[400],
    brandDark: darkModeColors.brand[600],
    textPrimary: darkModeColors.neutral[900],
    textSecondary: darkModeColors.neutral[700],
    textTertiary: darkModeColors.neutral[600],
    textMuted: darkModeColors.neutral[500],
    bgPrimary: darkModeColors.neutral[50], // Very dark background
    bgSecondary: darkModeColors.neutral[100], // Slightly lighter surface
    bgTertiary: darkModeColors.neutral[200], // Light dark gray
    borderLight: darkModeColors.neutral[200],
    borderDefault: darkModeColors.neutral[300],
    successColor: colors.success[500],
    errorColor: colors.error[500],
    warningColor: colors.warning[500],
    infoColor: colors.info[500],
  } : hexFallbacks;

  const currentCatalogColors = theme === 'dark' ? {
    ...catalogColors,
    hero: catalogColors.darkMode.hero,
    card: {
      ...catalogColors.card,
      background: catalogColors.darkMode.card.background,
      text: {
        primary: currentHexFallbacks.textPrimary,
        secondary: currentHexFallbacks.textSecondary,
        muted: currentHexFallbacks.textMuted,
      },
    },
    rating: {
      full: '#FFD700', // Gold color for dark mode stars
      empty: 'rgba(255, 255, 255, 0.2)',
      emptyDark: 'rgba(255, 255, 255, 0.4)',
    },
    price: {
      text: '#FFD700', // Gold color for price in dark mode
      background: currentHexFallbacks.bgSecondary,
      badge: currentHexFallbacks.brand,
    },
    filter: {
      badge: {
        background: `${currentHexFallbacks.brand}22`,
        border: `${currentHexFallbacks.brand}4d`,
        text: currentHexFallbacks.brand,
      },
    },
    border: {
      light: currentHexFallbacks.borderLight,
      medium: 'rgba(255, 255, 255, 0.1)',
      dark: 'rgba(255, 255, 255, 0.2)',
    },
    action: {
      primary: currentHexFallbacks.brand,
      secondary: currentHexFallbacks.bgSecondary,
      danger: currentHexFallbacks.errorColor,
    },
    state: {
      success: currentHexFallbacks.successColor,
      error: currentHexFallbacks.errorColor,
      warning: currentHexFallbacks.warningColor,
      info: currentHexFallbacks.infoColor,
    }
  } : catalogColors;


  return {
    semantic: currentSemanticColors,
    hex: currentHexFallbacks,
    catalog: currentCatalogColors,
    theme,
  };
}
