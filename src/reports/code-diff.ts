import {existsSync, readdirSync, rmdirSync, renameSync} from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import {ChainId} from '@bgd-labs/rpc-env';

const CHAIN_ID_TO_ETHERSCAN = {
  [ChainId.mainnet]: process.env.ETHERSCAN_API_KEY_MAINNET,
  [ChainId.polygon]: process.env.ETHERSCAN_API_KEY_POLYGON,
  [ChainId.bnb]: process.env.ETHERSCAN_API_KEY_BNB,
  [ChainId.base]: process.env.ETHERSCAN_API_KEY_BASE,
  [ChainId.arbitrum]: process.env.ETHERSCAN_API_KEY_ARBITRUM,
  [ChainId.optimism]: process.env.ETHERSCAN_API_KEY_OPTIMISM,
  [ChainId.gnosis]: process.env.ETHERSCAN_API_KEY_GNOSIS,
  [ChainId.avalanche]: process.env.ETHERSCAN_API_KEY_AVALANCHE,
  [ChainId.zksync]: process.env.ETHERSCAN_API_KEY_ZKSYNC,
  [ChainId.scroll]: process.env.ETHERSCAN_API_KEY_SCROLL,
  [ChainId.linea]: process.env.ETHERSCAN_API_KEY_LINEA,
  [ChainId.celo]: process.env.ETHERSCAN_API_KEY_CELO,
  [ChainId.mantle]: process.env.ETHERSCAN_API_KEY_MANTLE,
  [ChainId.sonic]: process.env.ETHERSCAN_API_KEY_SONIC,
};

export function downloadContract(chainId: number, address: string) {
  const outPath = `/tmp/${chainId}_${address}`;
  if (existsSync(outPath)) console.log('skipped download');
  const command = `cast source --chain ${chainId} -d ${outPath} ${address} --etherscan-api-key ${CHAIN_ID_TO_ETHERSCAN[chainId as keyof typeof CHAIN_ID_TO_ETHERSCAN]} && forge fmt ${outPath}`;
  execSync(command);
  return outPath;
}

function moveFilesToRoot(folderPath: string) {
  readdirSync(folderPath, {withFileTypes: true}).forEach((entry) => {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      moveFilesToRoot(fullPath);
    } else {
      const newPath = path.join(folderPath, entry.name);
      let uniquePath = newPath;
      let count = 1;

      // Ensure unique filename
      while (existsSync(uniquePath)) {
        const ext = path.extname(entry.name);
        const name = path.basename(entry.name, ext);
        uniquePath = path.join(folderPath, `${name}_${count}${ext}`);
        count++;
      }

      renameSync(fullPath, uniquePath);
    }
  });
}

export function diffCode(fromPath: string, toPath: string) {
  moveFilesToRoot(fromPath);
  moveFilesToRoot(toPath);
  const diffCmd = `
  git diff --no-index --ignore-space-at-eol ${fromPath} ${toPath} | awk '
    BEGIN { in_diff_block = 0; skip_block = 0; buffer = "" }
    /^diff --git/ {
      if (in_diff_block && skip_block == 0) { printf "%s", buffer }
      in_diff_block = 1; skip_block = 0; buffer = $0 "\\n"
    }
    /similarity index 100%/ { skip_block = 1 }
    { if (in_diff_block && !/^diff --git/) { buffer = buffer $0 "\\n" } }
    END { if (in_diff_block && skip_block == 0) { printf "%s", buffer } }
  '
  `;
  const result = execSync(diffCmd);
  return result.toString();
}
