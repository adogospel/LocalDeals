const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
    rules: {
      'import/order': 'off',
      // Data-loading effects intentionally expose their pending state to the UI.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
