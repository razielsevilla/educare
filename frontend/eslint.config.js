import js from "@eslint/js";

export default [
  { ignores: ["dist/", "android/", "public/", "regenerate.cjs", "transform.cjs", "coverage/"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        document: "readonly",
        window: "readonly",
        localStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        navigator: "readonly",
        process: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        fetch: "readonly",
        btoa: "readonly",
        atob: "readonly",
        crypto: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        Buffer: "readonly",
        global: "readonly",
        require: "readonly",
        MutationObserver: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
      "no-undef": "off"
    }
  }
];
