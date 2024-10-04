import {describe, expect, it} from 'vitest';
import {decodeReserveDataV3} from './reserveConfigurationInterpreter';

describe('reserveConfigurationInterpreter', () => {
  it(
    'should detect a change in virtualBalanceActivated',
    () => {
      const decodedDataBefore = decodeReserveDataV3(
        BigInt('2961908203178170875878950237596494035300546083027602574194771387707299396'),
      );
      expect(decodedDataBefore.virtualAccountingEnabled).toBe(false);

      const decodedDataAfter = decodeReserveDataV3(
        BigInt('7239967485535440384849065513280590734864674587685562855040293771882277901892'),
      );
      expect(decodedDataAfter.virtualAccountingEnabled).toBe(true);
      expect({...decodedDataBefore, virtualAccountingEnabled: true}).toEqual(decodedDataAfter);
    },
    {timeout: 30000},
  );
});
