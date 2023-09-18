// arbitrary from EOA for proposal executions
export const EOA = '0xD73a92Be73EfbFcF3854433A5FcbAbF9c1316073' as const;

// determines if verbose logs should be shown
export const VERBOSE = process.env.VERBOSE;

// determines what type of format to output
// foundry will consume everything on stdOut so in foundry mode we essentially don't log
export const FORMAT = process.env.FORMAT as 'raw' | 'encoded' | 'foundry';
