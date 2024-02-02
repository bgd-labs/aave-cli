import {
  Hex,
  http,
  toHex,
  parseEther,
  fromHex,
  pad,
  Chain,
  Address,
  Client,
  createClient,
  getContractAddress,
} from 'viem';
import { EOA } from './constants';
import { logError, logInfo, logSuccess, logWarning } from './logger';
import { GetTransactionReturnType } from 'viem';
import { deployContract, getBlock, getTransactionReceipt, sendTransaction } from 'viem/actions';
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
    number?: Hex;
    timestamp?: Hex;
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

export interface Log {
  name: string | null;
  anonymous: boolean;
  inputs: Input[];
  raw: LogRaw;
}

export interface LogRaw {
  address: string;
  topics: string[];
  data: string;
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

export type Fork = {
  id: string;
  chainId: string;
  block_number: number;
  forkNetworkId: string;
  forkUrl: string;
  global_head: string;
};

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
    const result: TenderlyTraceResponse = await response.json();
    // Post-processing to ensure addresses we use are checksummed (since ethers returns checksummed addresses)
    // result.transaction.addresses = result.transaction.addresses.map(getAddress);
    // result.contracts.forEach((contract) => (contract.address = getAddress(contract.address)));
    return result;
  };

  simulate = async (request: TenderlyRequest, client?: Client): Promise<TenderlySimulationResponse> => {
    if (!request.state_objects) {
      request.state_objects = {};
    }
    if (!request.state_objects[request.from]) {
      request.state_objects[request.from] = { balance: String(parseEther('3')) };
    } else {
      request.state_objects[request.from].balance = String(parseEther('3'));
    }

    let apiUrl = `${this.TENDERLY_BASE}/account/${this.ACCOUNT}/project/${this.PROJECT}/simulate`;

    if (client) {
      const url = client.transport.url! as string;
      const tenderlyForkRegex = new RegExp(/https:\/\/rpc.tenderly.co\/fork\/(.*)/);
      if (tenderlyForkRegex.test(url)) {
        const matches = url.match(tenderlyForkRegex);
        if (matches) {
          const fork = await this.getForkInfo(matches[1]);
          request.root = fork.global_head;
          delete (request as any).network_id;
          apiUrl = `${this.TENDERLY_BASE}/account/${this.ACCOUNT}/project/${this.PROJECT}/fork/${matches[1]}/simulate`;
        }
      }
    }

    const fullRequest = JSON.stringify({
      generate_access_list: true,
      save: true,
      gas_price: '0',
      gas: 30_000_000,
      force_import_contracts: true,
      ...request,
    });

    logInfo('tenderly', `request: ${JSON.stringify(fullRequest)}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      body: fullRequest,
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
   * Fork api to get fork information from an existing fork id
   * @param project name of the Tenderly project where the fork was created
   * @param forkId id of the fork created in tenderly
   * @returns fork object
   */
  getForkInfo = async (forkId: string, project?: string): Promise<Fork> => {
    const response: Response = await fetch(
      `${this.TENDERLY_BASE}/account/${this.ACCOUNT}/project/${project || this.PROJECT}/fork/${forkId}`,
      {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json',
          'X-Access-Key': this.ACCESS_TOKEN,
        }),
      }
    );

    if (response.status >= 400) {
      console.log(await response.text());
      throw new Error(`TenderlyError: ${response.statusText}`);
    }
    const result = await response.json();
    const fork = {
      id: result.simulation_fork.id,
      chainId: result.simulation_fork.network_id,
      block_number: result.simulation_fork.block_number,
      forkNetworkId: result.simulation_fork.chain_config.chain_id,
      forkUrl: `https://rpc.tenderly.co/fork/${result.simulation_fork.id}`,
      global_head: result.simulation_fork.global_head,
    };
    return fork;
  };
  /**
   * Trace api lacks most information we need, so simulateTx uses the simulation api to replicate the trace.
   * @param chainId
   * @param tx
   * @returns
   */
  simulateTx = async (
    chainId: number,
    tx: GetTransactionReturnType<Chain, 'latest'>
  ): Promise<TenderlySimulationResponse> => {
    const simulationPayload = {
      network_id: String(chainId),
      from: tx.from!,
      to: tx.to!,
      block_number: Number(tx.blockNumber),
      input: tx.input,
    };
    return this.simulate(simulationPayload);
  };

  fork = async ({
    chainId,
    blockNumber,
    alias,
    forkChainId = 3030,
  }: {
    chainId: number;
    blockNumber?: number;
    alias?: string;
    forkChainId?: number;
  }): Promise<Fork> => {
    const forkingPoint = {
      network_id: chainId,
      chain_config: { chain_id: forkChainId },
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
    if (result.error) {
      logError('tenderly', 'fork could not be created');
      throw new Error(result.error.message);
    }
    const fork = {
      id: result.simulation_fork.id,
      chainId: result.simulation_fork.network_id,
      block_number: result.simulation_fork.block_number,
      forkNetworkId: result.simulation_fork.chain_config.chain_id,
      forkUrl: `https://rpc.tenderly.co/fork/${result.simulation_fork.id}`,
      global_head: result.simulation_fork.global_head,
    };
    logSuccess(
      'tenderly',
      `Fork created! To use in aave interface you need to run the following commands:\n\n---\nlocalStorage.setItem('forkEnabled', 'true');\nlocalStorage.setItem('forkBaseChainId', ${fork.chainId});\nlocalStorage.setItem('forkNetworkId', ${fork.forkNetworkId});\nlocalStorage.setItem("forkRPCUrl", "${fork.forkUrl}");\n---\n`
    );
    return fork;
  };

  deployCode = async (fork: Fork, filePath: string, from?: Hex) => {
    const walletProvider = createClient({
      account: from || EOA,
      chain: { id: fork.forkNetworkId, name: 'tenderly' } as any,
      transport: http(fork.forkUrl),
    });

    const artifact = require(filePath);
    logInfo('tenderly', `deploying ${filePath}`);

    const hash = await deployContract(walletProvider, {
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
      account: walletProvider.account,
    } as any);

    const receipt = await getTransactionReceipt(walletProvider, { hash });
    return getContractAddress({ from: receipt.from, nonce: receipt.nonce });
  };

  warpTime = async (fork: Fork, timestamp: bigint) => {
    const client = createClient({
      chain: { id: fork.forkNetworkId } as any,
      transport: http(fork.forkUrl),
    });

    const currentBlock = await getBlock(client);
    // warping forward in time
    if (timestamp > currentBlock.timestamp) {
      logInfo('tenderly', `warping time from ${currentBlock.timestamp} to ${timestamp}`);
      await client.request({
        method: 'evm_increaseTime' as any,
        params: [toHex(timestamp - currentBlock.timestamp)],
      });
    } else {
      logWarning(
        'tenderly',
        `skipping time warp as tenderly forks do not support traveling back in time (from ${currentBlock.timestamp} to ${timestamp})`
      );
    }
  };

  warpBlocks = async (fork: Fork, blockNumber: bigint) => {
    const client = createClient({
      chain: { id: fork.forkNetworkId } as any,
      transport: http(fork.forkUrl),
    });
    const currentBlock = await getBlock(client);
    if (blockNumber > currentBlock.number) {
      logInfo('tenderly', `warping blocks from ${currentBlock.number} to ${blockNumber}`);
      await client.request({
        method: 'evm_increaseBlocks' as any,
        params: [toHex(blockNumber - currentBlock.number)],
      });
    } else {
      logWarning('tenderly', 'skipping block warp as tenderly forks do not support traveling back in time');
    }
  };

  unwrapAndExecuteSimulationPayloadOnFork = async (fork: Fork, request: TenderlyRequest) => {
    // 0. fund account
    await this.fundAccount(fork, request.from);

    const publicProvider = createClient({
      chain: { id: fork.forkNetworkId } as any,
      transport: http(fork.forkUrl),
    });
    // 1. apply storage changes
    if (request.state_objects) {
      logInfo('tenderly', 'setting storage');
      for (const address of Object.keys(request.state_objects) as Hex[]) {
        if (request.state_objects[address].storage) {
          for (const slot of Object.keys(request.state_objects[address].storage!) as Hex[]) {
            await publicProvider.request({
              method: 'tenderly_setStorageAt' as any,
              params: [
                address as Hex,
                pad(slot as Hex, { size: 32 }),
                pad(request.state_objects[address].storage![slot] as Hex, { size: 32 }),
              ],
            });
          }
        }
      }
    }

    // 2. warp time
    if (request.block_header?.timestamp) {
      await this.warpTime(fork, fromHex(request.block_header?.timestamp, 'bigint'));
    }
    if (request.block_header?.number) {
      await this.warpBlocks(fork, fromHex(request.block_header?.number, 'bigint'));
    }

    // 3. execute txn
    if (request.input) {
      logInfo('tenderly', 'execute transaction');
      const walletProvider = createClient({
        account: request.from,
        chain: { id: fork.forkNetworkId, name: 'tenderly' } as any,
        transport: http(fork.forkUrl),
      });
      const hash = await sendTransaction(walletProvider, {
        data: request.input,
        to: request.to,
        value: request.value || 0n,
      } as any);
      const receipt = await getTransactionReceipt(walletProvider, { hash });
      if (receipt.status === 'success') {
        logSuccess('tenderly', 'transaction successfully executed');
      } else {
        logError('tenderly', 'transaction reverted');
      }
      return hash;
    }
  };

  fundAccount = (fork: Fork, address: Hex) => {
    logInfo('tenderly', 'fund account');
    return fetch(`${this.TENDERLY_BASE}/account/${this.ACCOUNT}/project/${this.PROJECT}/fork/${fork.id}/balance`, {
      method: 'POST',
      body: JSON.stringify({ accounts: [address], amount: 1000 }),
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Access-Key': this.ACCESS_TOKEN,
      }),
    });
  };

  replaceCode = (fork: Fork, address: Hex, code: Hex) => {
    const publicProvider = createClient({
      chain: { id: fork.forkNetworkId } as any,
      transport: http(fork.forkUrl),
    });
    return publicProvider.request({
      method: 'tenderly_setCode' as any,
      params: [address, code],
    });
  };
}

export const tenderly = new Tenderly(
  process.env.TENDERLY_ACCESS_TOKEN,
  process.env.TENDERLY_ACCOUNT,
  process.env.TENDERLY_PROJECT_SLUG
);
