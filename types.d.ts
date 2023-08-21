declare namespace NodeJS {
  export interface ProcessEnv {
    TENDERLY_ACCESS_TOKEN: string;
    TENDERLY_ACCOUNT: string;
    TENDERLY_PROJECT_SLUG: string;

    RPC_SEPOLIA: string;
  }
}
