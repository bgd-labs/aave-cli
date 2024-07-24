import {CHAIN_ID_CLIENT_MAP} from '@bgd-labs/js-utils';
import {describe, expect, it} from 'vitest';
import {generateReport} from './generatePayloadReport';
import {MOCK_PAYLOAD} from './mocks/payload';
import {STREAM_PAYLOAD} from './mocks/streamPayload';
import {findPayloadsController} from './utils/checkAddress';
import {getPayloadsController} from './payloadsController';
import {Address} from 'viem';
import {customStorageProvider} from '@bgd-labs/aave-v3-governance-cache/customStorageProvider';
import {fileSystemStorageAdapter} from '@bgd-labs/aave-v3-governance-cache/fileSystemStorageAdapter';

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
  it.skip('should generate snapshot', async () => {
    const payloadId = 1;
    const chainId = 1;
    const client = CHAIN_ID_CLIENT_MAP[chainId];
    const payloadsControllerAddress = findPayloadsController(Number(chainId));
    const payloadsController = getPayloadsController(payloadsControllerAddress as Address, client);
    const cache = await localCacheAdapter.getPayload({
      chainId,
      payloadId,
      payloadsController: payloadsControllerAddress!,
    });
    const result = await payloadsController.simulatePayloadExecutionOnTenderly(
      Number(payloadId),
      cache.logs,
    );
    cleanupMock({simulation: result, payloadInfo: cache});
  });

  it(
    'should match snapshot listing',
    async () => {
      const report = await generateReport({
        ...(MOCK_PAYLOAD as any),
        client: CHAIN_ID_CLIENT_MAP[Number(MOCK_PAYLOAD.simulation.transaction.network_id)],
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
        client: CHAIN_ID_CLIENT_MAP[Number(MOCK_PAYLOAD.simulation.transaction.network_id)],
      });
      expect(report).toMatchSnapshot();
    },
    {timeout: 30000},
  );
});
