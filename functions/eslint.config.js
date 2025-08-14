
// functions/eslint.config.js
const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const pluginImport = require("eslint-plugin-import");

module.exports = tseslint.config(
  {
    ignores: [
      "**/lib/**",
      "**/node_modules/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    plugins: {
      import: pluginImport
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      "quotes": ["error", "double"],
      "import/no-unresolved": "off"
    }
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.dev.json"]
      },
      globals: {
        ...globals.node
      }
    },
    rules: {
      "quotes": ["error", "double"]
    }
  }
);
