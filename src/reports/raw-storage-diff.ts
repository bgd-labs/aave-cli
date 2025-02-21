import {writeFileSync, mkdirSync, readFileSync} from 'fs';
import {bytes32ToAddress} from '../utils/storageSlots';
import {diffCode, downloadContract} from './code-diff';
import {RawStorage, SlotDiff} from './snapshot-types';
import {isKnownAddress} from '../govv3/utils/checkAddress';
import {Address, getContract, isAddress, toBytes, zeroHash} from 'viem';
import {getClient} from '@bgd-labs/rpc-env';
import {IPool_ABI} from '@bgd-labs/aave-address-book/abis';

export function diffSlot(chainId: number, address: Address, slot: SlotDiff) {
  const fromAddress = isAddress(slot.previousValue)
    ? slot.previousValue
    : bytes32ToAddress(slot.previousValue);
  const toAddress = isAddress(slot.newValue) ? slot.newValue : bytes32ToAddress(slot.newValue);
  // pure new deployments cannot be diffed, we just download the code in that case
  if (slot.previousValue == zeroHash) {
    const to = downloadContract(chainId, toAddress);
    mkdirSync('./diffs', {recursive: true});
    writeFileSync(`./diffs/${chainId}_${address}_${toAddress}.diff`, readFileSync(to), {});
  } else {
    const from = downloadContract(chainId, fromAddress);
    const to = downloadContract(chainId, toAddress);
    const result = diffCode(from, to);
    mkdirSync('./diffs', {recursive: true});
    writeFileSync(`./diffs/${chainId}_${address}_${fromAddress}_${toAddress}.diff`, result, {});
  }
}

export async function diffRawStorage(chainId: number, raw: RawStorage) {
  // ERC1967 slot https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/ERC1967/ERC1967Utils.sol#L21C53-L21C119
  const erc1967ImplSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const erc1967AdminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
  await Promise.all(
    (Object.keys(raw) as (keyof typeof raw)[]).map(async (contract) => {
      if (raw[contract]) {
        const contractName = isKnownAddress(contract, chainId);
        // label known contracts if no label was set on foundry
        if (!raw[contract].label) {
          if (contractName) raw[contract].label = contractName.join(', ');
        }

        // create contract diff if storage changed
        if (raw[contract].stateDiff[erc1967ImplSlot]) {
          raw[contract].stateDiff[erc1967ImplSlot].label = 'Implementation slot';
          diffSlot(chainId, contract, raw[contract].stateDiff[erc1967ImplSlot]);
        }

        // admin slot
        if (raw[contract].stateDiff[erc1967AdminSlot]) {
          raw[contract].stateDiff[erc1967ImplSlot].label = 'Admin slot';
          // ... we might want to fetch the owner in that case
        }

        if (contractName) {
          const path = contractName[0].split('.');
          // Diff code logic libraries
          if (path[path.length - 1] === 'POOL') {
            const oldPool = getContract({
              client: getClient(chainId, {}),
              abi: IPool_ABI,
              address: bytes32ToAddress(raw[contract].stateDiff[erc1967ImplSlot].previousValue),
            });
            const newPool = getContract({
              client: getClient(chainId, {}),
              abi: IPool_ABI,
              address: bytes32ToAddress(raw[contract].stateDiff[erc1967ImplSlot].previousValue),
            });
            const addresses = await Promise.all([
              oldPool.read.getSupplyLogic(),
              newPool.read.getSupplyLogic(),
              oldPool.read.getBorrowLogic(),
              newPool.read.getBorrowLogic(),
              oldPool.read.getLiquidationLogic(),
              newPool.read.getLiquidationLogic(),
              oldPool.read.getPoolLogic(),
              newPool.read.getPoolLogic(),
              oldPool.read.getFlashLoanLogic(),
              newPool.read.getFlashLoanLogic(),
              oldPool.read.getEModeLogic(),
              newPool.read.getEModeLogic(),
            ]);
            console.log('addr', addresses);
            for (let i = 0; i < addresses.length; i = i + 2) {
              diffSlot(chainId, contract, {
                previousValue: addresses[i],
                newValue: addresses[i + 1],
              });
            }
          }
        }
      }
    }),
  );
}
