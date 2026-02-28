// ESLint 9 flat config for MoneyBags
// Uses typescript-eslint directly (no FlatCompat needed)
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore build output and node_modules
  {
    ignores: [".next/**", "node_modules/**"],
  },
  // TypeScript rules for all src files
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "error",
    },
  },
  // Layer dependency rules: engine must not import React or Zustand
  {
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-*"],
              message: "Engine layer must not import React. Move UI logic to components/.",
            },
            {
              group: ["zustand", "zustand/*"],
              message: "Engine layer must not import Zustand. Access state via store layer only.",
            },
          ],
        },
      ],
    },
  },
  // Types layer must not import from other src layers
  {
    files: ["src/types/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/*", "@/engine/*", "@/store/*", "@/hooks/*", "@/components/*", "@/app/*", "@/data/*"],
              message: "Types layer must not import from other src layers.",
            },
          ],
        },
      ],
    },
  }
);
