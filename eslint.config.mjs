/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "playwright-report/**"],
  },
];

export default config;
