import {writeFileSync} from 'fs';
import {describe, expect, it} from 'vitest';
import {generateReport} from './generatePayloadReport';
import {MOCK_PAYLOAD} from './mocks/payload';
import {STREAM_PAYLOAD} from './mocks/streamPayload';
import {EMODES_SIMULATION} from './mocks/eModes';

import {findPayloadsController} from './utils/checkAddress';
import {getPayloadsController} from './payloadsController';
import {Address} from 'viem';
import {customStorageProvider} from '@bgd-labs/aave-v3-governance-cache/customStorageProvider';
import {fileSystemStorageAdapter} from '@bgd-labs/aave-v3-governance-cache/fileSystemStorageAdapter';
import {getClient} from '../utils/getClient';

const localCacheAdapter = customStorageProvider(fileSystemStorageAdapter);
/**
 * Tenderly simulation results are insanely huge, so we're removing some stuff we don't need
 * @param mockData
 */
function cleanupMock(mockData: any) {
  mockData.simulation.contracts.map((ctr: any, ix: number) => {
    delete mockData.simulation.contracts[ix].src_map;
    delete mockData.simulation.contracts[ix].deployed_bytecode;
    delete mockData.simulation.contracts[ix].creation_bytecode;
    delete mockData.simulation.contracts[ix].data;
  });

  return JSON.stringify(mockData, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
}

describe('generatePayloadReport', () => {
  // it('cleanup', () => {
  //   expect(cleanupMock({simulation: CONFIG_CHANGE_PAYLOAD})).toMatchSnapshot();
  // });
  /**
   * Can be used to generate a new snapshot
   */
  it.skip(
    'should generate snapshot',
    async () => {
      const payloadId = 33;
      const chainId = 100;
      const client = getClient(chainId);
      const payloadsControllerAddress = findPayloadsController(Number(chainId));
      const payloadsController = getPayloadsController(
        payloadsControllerAddress as Address,
        client,
      );
      const cache = await localCacheAdapter.getPayload({
        chainId,
        payloadId,
        payloadsController: payloadsControllerAddress!,
      });
      const result = await payloadsController.simulatePayloadExecutionOnTenderly(
        Number(payloadId),
        cache.logs,
      );
      writeFileSync('eModes.json', cleanupMock({simulation: result, payloadInfo: cache}));
    },
    {timeout: 30000},
  );

  it(
    'should match snapshot listing',
    async () => {
      const report = await generateReport({
        ...(MOCK_PAYLOAD as any),
        client: getClient(Number(MOCK_PAYLOAD.simulation.transaction.network_id)),
      });
      expect(report).toMatchSnapshot();
    },
    {timeout: 30000},
  );

  it(
    'should match snapshot streams',
    async () => {
      const report = await generateReport({
        ...(STREAM_PAYLOAD as any),
        client: getClient(Number(MOCK_PAYLOAD.simulation.transaction.network_id)),
      });
      expect(report).toMatchSnapshot();
    },
    {timeout: 30000},
  );

  it.only(
    'should match eModes change',
    async () => {
      console.log(getClient(Number(EMODES_SIMULATION.simulation.transaction.network_id)));
      const report = await generateReport({
        ...(EMODES_SIMULATION as any),
        client: getClient(Number(EMODES_SIMULATION.simulation.transaction.network_id)),
      });
      expect(report).toMatchSnapshot();
    },
    {timeout: 30000},
  );
});
