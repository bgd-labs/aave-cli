import {existsSync} from 'fs';
import {execSync} from 'child_process';
import {AaveV3Snapshot, AaveV3Config} from './snapshot-types';

export function downloadContract(chainId: number, address: string) {
  const outPath = `/tmp/${chainId}_${address}`;
  if (existsSync(outPath)) console.log('skipped download');
  const command = `cast etherscan-source --chain ${chainId} -d ${outPath} ${address}`;
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
            mv "\$file" "${path}_flat/\${counter}_\${original_file_name}"
            ((counter++))
          done;
      `;
  execSync(flattenCmd);
  return `${path}_flat`;
}

export function diffCode(fromPath: string, toPath: string) {
  const prettierCmd = `npx prettier ${fromPath} ${toPath} --write || true`;
  execSync(prettierCmd);
  fromPath = flatten(fromPath);
  toPath = flatten(toPath);
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
