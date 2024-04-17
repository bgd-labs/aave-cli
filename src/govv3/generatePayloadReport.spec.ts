import { CHAIN_ID_CLIENT_MAP } from "@bgd-labs/js-utils";
import { describe, expect, it } from "vitest";
import { generateReport } from "./generatePayloadReport";
import { MOCK_PAYLOAD } from "./mocks/payload";
import { STREAM_PAYLOAD } from "./mocks/streamPayload";

describe("generatePayloadReport", () => {
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
