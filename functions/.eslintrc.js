
const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    resolvePluginsRelativeTo: __dirname
});

module.exports = [
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends("google"),
  {
      rules: {
          "quotes": ["error", "double"],
          "import/no-unresolved": 0,
          "require-jsdoc": 0,
      },
  },
  {
      ignores: ["lib/**"]
  }
];
