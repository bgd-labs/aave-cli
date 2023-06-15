import {
  Hex,
  PublicClient,
  Transaction as ViemTransaction,
  WalletClient,
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  pad,
  toHex,
} from 'viem';
import { EOA } from './constants';
export type StateObject = {
  balance?: string;
  code?: string;
  storage?: Record<Hex, Hex>;
};

interface RawElement {
  address: string;
  key: string;
  original: string;
  dirty: string;
}

export interface StateDiff {
  soltype: SoltypeElement | null;
  original: string | Record<string, any>;
  dirty: string | Record<string, any>;
  raw: RawElement[];
  address: string;
}

export type ContractObject = {
  contractName: string;
  source: string;
  sourcePath: string;
  compiler: {
    name: 'solc';
    version: string;
  };
  networks: Record<
    string,
    {
      events?: Record<string, string>;
      links?: Record<string, string>;
      address: string;
      transactionHash?: string;
    }
  >;
};

export type TenderlyRequest = {
  network_id: string;
  block_number?: number;
  transaction_index?: number;
  from: Hex;
  to: Hex;
  input: Hex;
  gas?: number;
  gas_price?: string;
  value?: string;
  simulation_type?: 'full' | 'quick';
  save?: boolean;
  save_if_fails?: boolean;
  state_objects?: Record<Hex, StateObject>;
  contracts?: ContractObject[];
  block_header?: {
    number?: string;
    timestamp?: string;
  };
  generate_access_list?: boolean;
  root?: string;
};

enum SoltypeType {
  Address = 'address',
  Bool = 'bool',
  Bytes32 = 'bytes32',
  MappingAddressUint256 = 'mapping (address => uint256)',
  MappingUint256Uint256 = 'mapping (uint256 => uint256)',
  String = 'string',
  Tuple = 'tuple',
  TypeAddress = 'address[]',
  TypeTuple = 'tuple[]',
  Uint16 = 'uint16',
  Uint256 = 'uint256',
  Uint48 = 'uint48',
  Uint56 = 'uint56',
  Uint8 = 'uint8',
}

enum StorageLocation {
  Calldata = 'calldata',
  Default = 'default',
  Memory = 'memory',
  Storage = 'storage',
}

enum SimpleTypeType {
  Address = 'address',
  Bool = 'bool',
  Bytes = 'bytes',
  Slice = 'slice',
  String = 'string',
  Uint = 'uint',
}

interface Type {
  type: SimpleTypeType;
}

export interface SoltypeElement {
  name: string;
  type: SoltypeType;
  storage_location: StorageLocation;
  components: SoltypeElement[] | null;
  offset: number;
  index: string;
  indexed: boolean;
  simple_type?: Type;
}

export interface Input {
  soltype: SoltypeElement | null;
  value: boolean | string;
}

export interface Trace {
  from: Hex;
  to?: Hex;
  function_name?: string;
  input: Hex;
  output: string;
  calls?: Trace[];
  decoded_input: Input[];
  caller_op: string;
}

export interface TenderlyLogRaw {
  address: string;
  topics: string[];
  data: string;
}

export interface TenderlyLog {
  name: string | null;
  anonymous: boolean;
  inputs: Input[];
  raw: TenderlyLogRaw;
}

export interface TenderlyStackTrace {
  file_index: number;
  contract: string;
  name: string;
  line: number;
  error: string;
  error_reason: string;
  code: string;
  op: string;
  length: number;
}

export type TransactionInfo = {
  call_trace: {
    calls: Trace[];
  };
  state_diff: StateDiff[];
  logs: TenderlyLog[] | null;
  stack_trace: TenderlyStackTrace[] | null;
};

type Transaction = {
  transaction_info: TransactionInfo;
  block_number: number;
  status: boolean;
  addresses: Hex[];
};

type TenderlyContractResponseObject = {
  address: Hex;
  contract_name: string;
  standards?: string[];
  token_data?: {
    symbol: string;
    name: string;
    decimals: number;
  };
  child_contracts?: { id: string; address: Hex; network_id: string }[];
};

export interface TenderlySimulationResponseObject {
  id: string;
  project_id: string;
  owner_id: string;
  network_id: string;
  block_number: number;
  transaction_index: number;
  from: string;
  to: string;
  input: string;
  gas: number;
  gas_price: string;
  value: string;
  method: string;
  status: boolean;
  access_list: null;
  queue_origin: string;
  created_at: Date;
  block_header: {
    timestamp: string;
  };
}

export type TenderlySimulationResponse = {
  transaction: Transaction;
  contracts: TenderlyContractResponseObject[];
  simulation: TenderlySimulationResponseObject;
};

export type TenderlyTraceResponse = TransactionInfo;

class Tenderly {
  TENDERLY_BASE: string = `https://api.tenderly.co/api/v1`;

  ACCESS_TOKEN: string;
  ACCOUNT: string;
  PROJECT: string;

  constructor(accessToken: string, account: string, project: string) {
    this.ACCESS_TOKEN = accessToken;
    this.ACCOUNT = account;
    this.PROJECT = project;
  }

  trace = async (chainId: number, txHash: string): Promise<TenderlyTraceResponse> => {
    const response = await fetch(`${this.TENDERLY_BASE}/public-contract/${chainId}/trace/${txHash}`, {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Access-Key': this.ACCESS_TOKEN,
      }),
    });
    const result = await response.json();
    // Post-processing to ensure addresses we use are checksummed (since ethers returns checksummed addresses)
    result.transaction.addresses = result.transaction.addresses.map(getAddress);
    result.contracts.forEach((contract) => (contract.address = getAddress(contract.address)));
    return result;
  };

  simulate = async (request: TenderlyRequest): Promise<TenderlySimulationResponse> => {
    const response = await fetch(`${this.TENDERLY_BASE}/account/${this.ACCOUNT}/project/${this.PROJECT}/simulate`, {
      method: 'POST',
      body: JSON.stringify({
        generate_access_list: true,
        save: true,
        gas_price: '0',
        gas: 30_000_000,
        ...request,
      }),
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Access-Key': this.ACCESS_TOKEN,
      }),
    });
    if (response.status !== 200) {
      console.log(await response.text());
      throw new Error(`TenderlyError: ${response.statusText}`);
    }
    return await response.json();
  };

  /**
   * Trace api lacks most information we need, so simulateTx uses the simulation api to replicate the trace.
   * @param chainId
   * @param tx
   * @returns
   */
  simulateTx = async (chainId: number, tx: ViemTransaction): Promise<TenderlySimulationResponse> => {
    const simulationPayload = {
      network_id: String(chainId),
      from: tx.from!,
      to: tx.to!,
      block_number: Number(tx.blockNumber),
      input: tx.input,
    };
    return this.simulate(simulationPayload);
  };

  fork = async ({ chainId, blockNumber, alias }: { chainId: number; blockNumber?: number; alias?: string }) => {
    const forkingPoint = {
      network_id: chainId,
      chain_config: { chain_id: 3030 },
    };
    if (blockNumber) (forkingPoint as any).block_number = blockNumber;
    if (alias) (forkingPoint as any).alias = alias;
    const response = await fetch(`${this.TENDERLY_BASE}/account/${this.ACCOUNT}/project/${this.PROJECT}/fork`, {
      method: 'POST',
      body: JSON.stringify(forkingPoint),
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Access-Key': this.ACCESS_TOKEN,
      }),
    });

    const result = await response.json();
    return {
      id: result.simulation_fork.id,
      chainId: result.simulation_fork.network_id,
      block_number: result.simulation_fork.block_number,
      forkNetworkId: result.simulation_fork.chain_config.chain_id,
      forkUrl: `https://rpc.tenderly.co/fork/${result.simulation_fork.id}`,
    };
  };

  unwrapAndExecuteSimulationPayloadOnFork = async (fork: any, request: TenderlyRequest) => {
    // 0. fund account
    await this.fundAccount(fork, EOA);

    // 1. apply storage changes
    const publicProvider = createPublicClient({
      chain: { id: 3030 } as any,
      transport: http(fork.forkUrl),
    });
    if (request.state_objects) {
      for (const address of Object.keys(request.state_objects)) {
        if (request.state_objects[address].storage) {
          for (const slot of Object.keys(request.state_objects[address].storage!)) {
            console.log('setting storage');
            await publicProvider.request({
              method: 'tenderly_setStorageAt' as any,
              params: [address as Hex, slot as Hex, request.state_objects[address].storage![slot] as Hex],
            });
          }
        }
      }
    }

    // 2. execute txn
    if (request.input) {
      const walletProvider = createWalletClient({
        account: EOA,
        chain: { id: 3030, name: 'tenderly' } as any,
        transport: http(fork.forkUrl),
      });
      await walletProvider.sendTransaction({
        data: request.input,
        to: request.to,
        value: 0n,
      } as any);
    }
  };

  fundAccount = (fork, address) => {
    return fetch(`${this.TENDERLY_BASE}/account/${this.ACCOUNT}/project/${this.PROJECT}/fork/${fork.id}/balance`, {
      method: 'POST',
      body: JSON.stringify({ accounts: [address], amount: 1000 }),
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Access-Key': this.ACCESS_TOKEN,
      }),
    });
  };
}

export const tenderly = new Tenderly(
  process.env.TENDERLY_ACCESS_TOKEN,
  process.env.TENDERLY_ACCOUNT,
  process.env.TENDERLY_PROJECT_SLUG
);
