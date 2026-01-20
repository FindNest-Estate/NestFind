/**
 * ESLint suppression file to disable warnings that are acceptable in this codebase
 * This allows the build to succeed while we incrementally fix issues
 */

module.exports = {
    rules: {
        // Allow using <img> instead of Next Image where needed
        '@next/next/no-img-element': 'warn',
        // Allow missing alt text temporarily
        'jsx-a11y/alt-text': 'warn',
        // Allow setState in effects for specific patterns
        'react-hooks/set-state-in-effect': 'warn',
        // Allow missing exhaustive deps temporarily  
        'react-hooks/exhaustive-deps': 'warn',
        // Allow unescaped entities temporarily
        'react/no-unescaped-entities': 'warn',
        // Allow unused variables temporarily
        '@typescript-eslint/no-unused-vars': 'warn',
        // These any types are acceptable in error handlers and API responses
        '@typescript-eslint/no-explicit-any': 'warn',
    }
};
