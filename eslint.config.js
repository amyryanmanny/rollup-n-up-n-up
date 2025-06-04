import { defineConfig, globalIgnores } from "eslint/config";

import globals from "globals";

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: { globals: globals.node },
  },
  globalIgnores(["**/dist/**", "**/node_modules/**"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  prettierRecommended,
]);
