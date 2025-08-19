import type {Options} from 'tsup';

const config: Options = {
  entry: ['src/index.ts', 'src/cli.ts'],
  sourcemap: true,
  format: ['cjs', 'esm'],
  dts: true,
  // https://github.com/evanw/esbuild/issues/399
  splitting: false,
};

export default config;
