import {existsSync} from 'fs';
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
};

export function downloadContract(chainId: number, address: string) {
  const outPath = `/tmp/${chainId}_${address}`;
  if (existsSync(outPath)) console.log('skipped download');
  const command = `cast source --chain ${chainId} -d ${outPath} ${address} --etherscan-api-key ${CHAIN_ID_TO_ETHERSCAN[chainId as keyof typeof CHAIN_ID_TO_ETHERSCAN]}`;
  execSync(command);
  return outPath;
}

function flatten(path: string) {
  const flattenCmd = `
          mkdir -p ${path}_flat
          counter=1
          for file in $(find ${path} -type f)
          do
            original_file_name="\${file##*/}"
            if [ -e ${path}_flat/\${counter}_\${original_file_name} ]
            then
              mv "\$file" "${path}_flat/\${counter}_\${original_file_name}"
            else
              mv "\$file" "${path}_flat/\${original_file_name}"
            fi
            ((counter++))
          done;
      `;
  execSync(flattenCmd);
  return `${path}_flat`;
}

export function diffCode(fromPath: string, toPath: string) {
  fromPath = flatten(fromPath);
  toPath = flatten(toPath);
  const prettierCmd = `npx prettier ${fromPath} ${toPath} --write`;
  execSync(prettierCmd);
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
