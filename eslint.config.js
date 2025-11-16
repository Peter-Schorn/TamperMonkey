import globals from "globals";
import { defineConfig } from 'eslint/config';
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

// https://eslint.org/docs/latest/use/configure/configuration-files
// https://typescript-eslint.io/
// ESLint Stylistic: https://eslint.style/packages/default
export default defineConfig(
    {
        ignores: [
            "dist/"
        ],
    },
    // TODO: Figure out how to lint this config file itself
    {
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommendedTypeChecked
        ],
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "@stylistic": stylistic
        },
        files: [
            "src/**/*.ts",
            "src/**/*.d.ts",
            "src/**/*.js"
        ],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
                project: [
                    "./tsconfig.json",
                    "./tsconfig.eslint.json"
                ],
            },
            globals: globals.browser,
            ecmaVersion: 2022,
            sourceType: "module"
        },
        rules: {

            "@stylistic/semi": ["error", "always"],
            "@stylistic/no-extra-semi": "error",
            "@stylistic/member-delimiter-style": ["error", {
                multiline: {
                    delimiter: "semi",
                    requireLast: true
                },
                singleline: {
                    delimiter: "comma",
                    requireLast: false
                },
            }],
            quotes: ["error", "double", { avoidEscape: true }],
            "no-console": "off",
            "prefer-const": "error",
            "@typescript-eslint/no-unused-vars": "off",
            eqeqeq: "error",
            "no-unreachable": "warn",
            "no-var": "error",

            "@typescript-eslint/no-misused-promises": ["error", {
                checksVoidReturn: false
            }],

            "@typescript-eslint/no-unnecessary-condition": ["error", {
                allowConstantLoopConditions: true
            }],

            "func-style": ["error", "declaration", {
                allowArrowFunctions: false
            }],

            "@typescript-eslint/no-empty-object-type": ["error", {
                allowInterfaces: 'with-single-extends'
            }],

            // "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/ban-ts-comment": "off"
        },

    },
    // typescript-specific rules for .ts and .d.ts files only
    {
        files: [
            "src/**/*.ts",
            "src/**/*.d.ts"
        ],
        rules: {
            "@typescript-eslint/explicit-function-return-type": "error",
        }
    },
    // disable rules for the config file itself
    {
        files: ["eslint.config.js"],
        rules: {
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
        }
    }
);
