// ESLint flat config: type-aware TypeScript rules for the consumer's code and tests.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/'] },

  js.configs.recommended,
  // Type-aware rules, e.g. a Promise that is not awaited (a contract test that ends before its interaction ran).
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  { files: ['eslint.config.js'], ...tseslint.configs.disableTypeChecked },

  // Last: turn off every rule that would fight with Prettier's formatting.
  prettier,
);
