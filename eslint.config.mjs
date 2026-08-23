import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // Keep the pre-upgrade lint contract. These React Compiler rules are
      // migration aids; converting every legacy interaction is a separate refactor.
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      '@next/next/no-img-element': 'warn',
    },
  },
  globalIgnores(['.next/**', 'node_modules/**']),
])
