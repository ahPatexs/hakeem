/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "dist/**",
      "build/**",
    ],
  },
];

export default config;
