import type { Options } from 'tsup';

const config: Options = {
  entry: ['src/index.ts', 'src/cli.ts'],
  sourcemap: true,
  format: ['iife', 'cjs', 'esm'],
  dts: {
    compilerOptions: {
      moduleResolution: 'node',
      allowSyntheticDefaultImports: true,
      strict: false,
    },
  },
  // otherwise .env is ordered wrongly
  splitting: false,
};

export default config;
