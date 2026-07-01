import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // This app renders arbitrary user-uploaded, AI-generated, and data-URL
      // images whose hosts and dimensions are not known ahead of time. The
      // next/image optimizer requires a static remote-host allowlist, so it is
      // not a fit here; native <img> is intentional.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
