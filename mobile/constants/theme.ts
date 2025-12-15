// Design tokens matching web UI
export const colors = {
    primary: '#FF385C',  // Airbnb rose
    primaryDark: '#E31C5F',
    secondary: '#00A699',
    black: '#222222',
    gray900: '#111827',
    gray700: '#374151',
    gray600: '#4B5563',
    gray500: '#6B7280',
    gray400: '#9CA3AF',
    gray200: '#E5E7EB',
    gray100: '#F3F4F6',
    gray50: '#F9FAFB',
    white: '#FFFFFF',
    success: '#22C55E',
    error: '#EF4444',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
};

export const typography = {
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
    },
    h2: {
        fontSize: 24,
        fontWeight: '600' as const,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
    },
    bodySmall: {
        fontSize: 14,
        fontWeight: '400' as const,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400' as const,
    },
};
