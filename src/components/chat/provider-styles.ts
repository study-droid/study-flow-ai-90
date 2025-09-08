/**
 * Provider-specific styling system
 * Maintains UI consistency while allowing provider customizations
 */

export interface ProviderTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
    text: string;
    background: string;
    border: string;
  };
  avatar: {
    background: string;
    icon: string;
  };
  badge: {
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    className: string;
  };
  button: {
    className: string;
  };
  messageStyles: {
    bubble: string;
    header: string;
    content: string;
    metadata: string;
  };
}

export const PROVIDER_THEMES: Record<string, ProviderTheme> = {
  deepseek: {
    name: 'DeepSeek AI',
    colors: {
      primary: 'rgb(147, 51, 234)', // purple-600
      secondary: 'rgb(196, 181, 253)', // purple-300
      accent: 'rgb(79, 70, 229)', // indigo-600
      gradient: 'from-purple-500 to-blue-600',
      text: 'text-purple-700 dark:text-purple-300',
      background: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-800'
    },
    avatar: {
      background: 'bg-gradient-to-br from-purple-500 to-blue-600',
      icon: 'text-white'
    },
    badge: {
      variant: 'outline',
      className: 'border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-300'
    },
    button: {
      className: 'bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700'
    },
    messageStyles: {
      bubble: 'border-purple-200/50 dark:border-purple-700/50 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20',
      header: 'text-purple-800 dark:text-purple-200',
      content: 'prose-purple dark:prose-invert',
      metadata: 'text-purple-600 dark:text-purple-400'
    }
  },

  openai: {
    name: 'OpenAI GPT',
    colors: {
      primary: 'rgb(16, 185, 129)', // emerald-500
      secondary: 'rgb(110, 231, 183)', // emerald-300
      accent: 'rgb(5, 150, 105)', // emerald-600
      gradient: 'from-emerald-500 to-teal-600',
      text: 'text-emerald-700 dark:text-emerald-300',
      background: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800'
    },
    avatar: {
      background: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      icon: 'text-white'
    },
    badge: {
      variant: 'outline',
      className: 'border-emerald-200 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
    },
    button: {
      className: 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
    },
    messageStyles: {
      bubble: 'border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20',
      header: 'text-emerald-800 dark:text-emerald-200',
      content: 'prose-emerald dark:prose-invert',
      metadata: 'text-emerald-600 dark:text-emerald-400'
    }
  },

  anthropic: {
    name: 'Anthropic Claude',
    colors: {
      primary: 'rgb(249, 115, 22)', // orange-500
      secondary: 'rgb(254, 215, 170)', // orange-300
      accent: 'rgb(234, 88, 12)', // orange-600
      gradient: 'from-orange-500 to-red-600',
      text: 'text-orange-700 dark:text-orange-300',
      background: 'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-200 dark:border-orange-800'
    },
    avatar: {
      background: 'bg-gradient-to-br from-orange-500 to-red-600',
      icon: 'text-white'
    },
    badge: {
      variant: 'outline',
      className: 'border-orange-200 text-orange-700 dark:border-orange-700 dark:text-orange-300'
    },
    button: {
      className: 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
    },
    messageStyles: {
      bubble: 'border-orange-200/50 dark:border-orange-700/50 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20',
      header: 'text-orange-800 dark:text-orange-200',
      content: 'prose-orange dark:prose-invert',
      metadata: 'text-orange-600 dark:text-orange-400'
    }
  },

  gemini: {
    name: 'Google Gemini',
    colors: {
      primary: 'rgb(59, 130, 246)', // blue-500
      secondary: 'rgb(147, 197, 253)', // blue-300
      accent: 'rgb(37, 99, 235)', // blue-600
      gradient: 'from-blue-500 to-indigo-600',
      text: 'text-blue-700 dark:text-blue-300',
      background: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800'
    },
    avatar: {
      background: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      icon: 'text-white'
    },
    badge: {
      variant: 'outline',
      className: 'border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-300'
    },
    button: {
      className: 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
    },
    messageStyles: {
      bubble: 'border-blue-200/50 dark:border-blue-700/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20',
      header: 'text-blue-800 dark:text-blue-200',
      content: 'prose-blue dark:prose-invert',
      metadata: 'text-blue-600 dark:text-blue-400'
    }
  },

  default: {
    name: 'AI Assistant',
    colors: {
      primary: 'rgb(100, 116, 139)', // slate-500
      secondary: 'rgb(203, 213, 225)', // slate-300
      accent: 'rgb(71, 85, 105)', // slate-600
      gradient: 'from-slate-500 to-gray-600',
      text: 'text-slate-700 dark:text-slate-300',
      background: 'bg-slate-50 dark:bg-slate-950/20',
      border: 'border-slate-200 dark:border-slate-800'
    },
    avatar: {
      background: 'bg-gradient-to-br from-slate-500 to-gray-600',
      icon: 'text-white'
    },
    badge: {
      variant: 'outline',
      className: 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300'
    },
    button: {
      className: 'bg-gradient-to-br from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700'
    },
    messageStyles: {
      bubble: 'border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20',
      header: 'text-slate-800 dark:text-slate-200',
      content: 'prose-slate dark:prose-invert',
      metadata: 'text-slate-600 dark:text-slate-400'
    }
  }
};

/**
 * Get theme for a specific provider
 */
export function getProviderTheme(provider: string): ProviderTheme {
  return PROVIDER_THEMES[provider] || PROVIDER_THEMES.default;
}

/**
 * Get provider-specific CSS classes
 */
export function getProviderClasses(provider: string, element: keyof ProviderTheme['messageStyles']): string {
  const theme = getProviderTheme(provider);
  return theme.messageStyles[element];
}

/**
 * Get provider gradient classes
 */
export function getProviderGradient(provider: string): string {
  const theme = getProviderTheme(provider);
  return theme.colors.gradient;
}

/**
 * Get provider avatar classes
 */
export function getProviderAvatarClasses(provider: string): string {
  const theme = getProviderTheme(provider);
  return `${theme.avatar.background} ${theme.avatar.icon}`;
}

/**
 * Get provider badge classes
 */
export function getProviderBadgeClasses(provider: string): string {
  const theme = getProviderTheme(provider);
  return theme.badge.className;
}

/**
 * Get provider button classes
 */
export function getProviderButtonClasses(provider: string): string {
  const theme = getProviderTheme(provider);
  return theme.button.className;
}

/**
 * Generate provider-specific CSS variables
 */
export function generateProviderCSSVariables(provider: string): Record<string, string> {
  const theme = getProviderTheme(provider);
  
  return {
    '--provider-primary': theme.colors.primary,
    '--provider-secondary': theme.colors.secondary,
    '--provider-accent': theme.colors.accent,
    '--provider-text': theme.colors.text,
    '--provider-background': theme.colors.background,
    '--provider-border': theme.colors.border
  };
}

export default PROVIDER_THEMES;