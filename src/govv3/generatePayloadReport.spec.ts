import { CHAIN_ID_CLIENT_MAP } from "@bgd-labs/js-utils";
import { describe, expect, it } from "vitest";
import { generateReport } from "./generatePayloadReport";
import { MOCK_PAYLOAD } from "./mocks/payload";
import { STREAM_PAYLOAD } from "./mocks/streamPayload";
import { findPayloadsController } from "./utils/checkAddress";
import { getPayloadsController } from "./payloadsController";
import { cachePayloadsController } from "./cache/updateCache";
import { Address } from "viem";

describe("generatePayloadReport", () => {
  /**
   * Can be used to generate a new snapshot
   */
  it.skip('should generate snapshot', async () => {
    const payloadId = 1;
    const chainId = 1;
    const client = CHAIN_ID_CLIENT_MAP[chainId];
    const payloadsControllerAddress = findPayloadsController(Number(chainId));
    const payloadsController = getPayloadsController(payloadsControllerAddress as Address, client);
    const { eventsCache } = await cachePayloadsController(client, payloadsControllerAddress as Address);
    const config = await payloadsController.getPayload(payloadId, eventsCache);
    const result = await payloadsController.simulatePayloadExecutionOnTenderly(Number(payloadId), config);
    result.contracts.map((ctr, ix) => delete result.contracts[ix].src_map);
    console.log(JSON.stringify({simulation: result, payloadInfo: config}, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2));
  });

  it(
    "should match snapshot listing",
    async () => {
      const report = await generateReport({
        ...(MOCK_PAYLOAD as any),
        client: CHAIN_ID_CLIENT_MAP[MOCK_PAYLOAD.simulation.transaction.network_id],
      });
      expect(report).toMatchSnapshot();
    },
    { timeout: 30000 },
  );

  it(
    "should match snapshot streams",
    async () => {
      const report = await generateReport({
        ...(STREAM_PAYLOAD as any),
        client: CHAIN_ID_CLIENT_MAP[MOCK_PAYLOAD.simulation.transaction.network_id],
      });
      expect(report).toMatchSnapshot();
    },
    { timeout: 30000 },
  );
});
