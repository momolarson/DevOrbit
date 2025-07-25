module.exports = {
  root: true,
  env: { browser: true, es2020: true, jest: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'test-linear.js', 'coverage'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'off', // Allow non-component exports
    'react/prop-types': 'off',
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console statements for debugging
    'react-hooks/exhaustive-deps': 'off' // Disable for CI - would require major refactoring
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}