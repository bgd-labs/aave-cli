import {writeFileSync, mkdirSync, readFileSync} from 'fs';
import {bytes32ToAddress} from '../utils/storageSlots';
import {diffCode, downloadContract} from './code-diff';
import {RawStorage} from './snapshot-types';
import {isKnownAddress} from '../govv3/utils/checkAddress';
import {zeroHash} from 'viem';

export async function diffRawStorage(chainId: number, raw: RawStorage) {
  // ERC1967 slot https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/ERC1967/ERC1967Utils.sol#L21C53-L21C119
  const erc1967Slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  (Object.keys(raw) as (keyof typeof raw)[]).map((contract) => {
    // label known contracts
    if (raw[contract] && !raw[contract].label) {
      const contractName = isKnownAddress(contract, chainId);
      if (contractName) raw[contract].label = contractName.join(', ');
    }

    // create contract diff if storage changed
    if (raw[contract] && raw[contract].stateDiff[erc1967Slot]) {
      // pure new deployments cannot be diffed, we just download the code in that case
      if (raw[contract].stateDiff[erc1967Slot].previousValue == zeroHash) {
        const toAddress = bytes32ToAddress(raw[contract].stateDiff[erc1967Slot].newValue);
        const to = downloadContract(chainId, toAddress);
        mkdirSync('./diffs', {recursive: true});
        writeFileSync(`./diffs/${chainId}_${contract}_${toAddress}.diff`, readFileSync(to), {});
      } else {
        const fromAddress = bytes32ToAddress(raw[contract].stateDiff[erc1967Slot].previousValue);
        const toAddress = bytes32ToAddress(raw[contract].stateDiff[erc1967Slot].newValue);
        const from = downloadContract(chainId, fromAddress);
        const to = downloadContract(chainId, toAddress);
        const result = diffCode(from, to);
        mkdirSync('./diffs', {recursive: true});
        writeFileSync(
          `./diffs/${chainId}_${contract}_${fromAddress}_${toAddress}.diff`,
          result,
          {},
        );
      }
    }
  });
}
