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
        find ${path} -type f -exec bash -c '
          counter=1
          for file; do
            original_file_name="\${file##*/}"
            new_file_name="prefix_\${counter}_\${original_file_name}"
            mv "\$file" "${path}/\$new_file_name"
            ((counter++))
          done
        ' _ '{}' \\;
      `;
  execSync(flattenCmd);
}

export function diffCode(fromPath: string, toPath: string) {
  const prettierCmd = `npx prettier ${fromPath} ${toPath} --write`;
  execSync(prettierCmd);
  flatten(fromPath);
  flatten(toPath);
  const diffCmd = `
  git diff --no-index ${fromPath} ${toPath} | awk '
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
