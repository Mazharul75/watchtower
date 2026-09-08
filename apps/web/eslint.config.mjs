import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16.x ships native ESLint flat-config arrays (see its
 * package.json `exports`) instead of the old .eslintrc-style extendable
 * string names — importing those arrays directly here avoids routing them
 * back through @eslint/eslintrc's legacy compatibility shim, which crashes
 * with a circular-JSON error when re-wrapping already-flat plugin objects.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", "e2e/**", "playwright-report/**", "test-results/**", "src/generated/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // This rule flags the ordinary "fetch on mount, setState with the
      // result" pattern used throughout the dashboard/admin panels as a
      // "cascading render" risk. A single fetch-then-setState on mount is
      // not the pathological case the rule targets (a setState that
      // triggers another effect that sets state again, looping); it's the
      // standard, React-docs-sanctioned way to load data into a client
      // component. Disabled deliberately rather than restructuring every
      // panel around it.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
