import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/legacy-*/**",
      "apps/api/legacy-edge-functions-ref/**",
      "db/legacy-migrations-ref/**",
      "apps/web/src/components/**",
      "apps/web/src/pages/**",
      "apps/web/src/modules/**",
      "apps/web/src/hooks/**",
      "apps/web/src/lib/**",
      "apps/web/src/contexts/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "apps/api/src/**/*.{ts,tsx}",
      "packages/carbon-engine/src/**/*.{ts,tsx}",
      "apps/web/src/integrations/api/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
