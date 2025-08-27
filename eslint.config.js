// Flat-config for ESLint v9+
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore build outputs and deps
  { ignores: ["dist/**", "node_modules/**"] },

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Our tweaks
  {
    files: ["**/*.{ts,js}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off"
    }
  }
);
