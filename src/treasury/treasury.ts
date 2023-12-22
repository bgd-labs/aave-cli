import { IERC20_ABI } from './abis/IERC20';
import { reserveProviders } from './reserveProviders';
import { getContract, formatUnits, Hex } from 'viem';

export async function getReservesData() {
  for (const provider of reserveProviders) {
    const reservesData = await provider.fetchReserves();

    const aTokenBalances = await Promise.all(
      reservesData[0].map(async (reserve) => {
        const reserveContract = getContract({
          address: reserve.underlyingAsset,
          abi: IERC20_ABI,
          publicClient: provider.client,
        });

        const reserveBalance = await reserveContract.read.balanceOf([provider.collector]);
        // const reserveBalance = await reserveContract.read.balanceOf([
        //   '0x0000000000000000000000000000000000000000' as Hex,
        // ]);

        const aTokenContract = getContract({
          address: reserve.aTokenAddress,
          abi: IERC20_ABI,
          publicClient: provider.client,
        });

        const aTokenBalance = await aTokenContract.read.balanceOf([provider.collector]);
        // const aTokenBalance = await aTokenContract.read.balanceOf([
        //   '0x0000000000000000000000000000000000000000' as Hex,
        // ]);

        const aTokenSymbol = await aTokenContract.read.symbol();

        return {
          name: reserve.name,
          underlyingSymbol: reserve.symbol,
          decimals: reserve.decimals,
          balance: formatUnits(reserveBalance, Number(reserve.decimals)),
          aTokenSymbol: aTokenSymbol,
          aTokenBalance: formatUnits(aTokenBalance, Number(reserve.decimals)),
        };
      })
    );

    aTokenBalances.map((b) =>
      console.log(
        `${provider.network},${b.name},${b.decimals},${b.underlyingSymbol},${b.balance},${b.aTokenSymbol},${b.aTokenBalance}`
      )
    );
    // console.log(JSONbig.stringify(aTokenBalances));
  }
}

export async function getArcReservesData() {
  for (const provider of reserveProviders) {
    // const reservesData = await provider.fetchReserves();

    const reservesData = [
      {
        underlyingAsset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Hex,
        aTokenAddress: '0xd35f648C3C7f17cd1Ba92e5eac991E3EfcD4566d' as Hex,
        name: 'USDC',
        symbol: 'USDC',
        decimals: '6',
      },
      {
        underlyingAsset: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as Hex,
        aTokenAddress: '0xe6d6E7dA65A2C18109Ff56B7CBBdc7B706Fc13F8' as Hex,
        name: 'WBTC',
        symbol: 'WBTC',
        decimals: '8',
      },
      {
        underlyingAsset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Hex,
        aTokenAddress: '0x319190E3Bbc595602A9E63B2bCfB61c6634355b1' as Hex,
        name: 'WETH',
        symbol: 'WETH',
        decimals: '18',
      },
      {
        underlyingAsset: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' as Hex,
        aTokenAddress: '0x89eFaC495C65d43619c661df654ec64fc10C0A75' as Hex,
        name: 'AAVE',
        symbol: 'AAVE',
        decimals: '18',
      },
    ];
    const aTokenBalances = await Promise.all(
      reservesData.map(async (reserve) => {
        const reserveContract = getContract({
          address: reserve.underlyingAsset,
          abi: IERC20_ABI,
          publicClient: provider.client,
        });

        const reserveBalance = await reserveContract.read.balanceOf([provider.collector]);
        // const reserveBalance = await reserveContract.read.balanceOf(['0x0000000000000000000000000000000000000000' as Hex]);

        const aTokenContract = getContract({
          address: reserve.aTokenAddress,
          abi: IERC20_ABI,
          publicClient: provider.client,
        });

        const aTokenBalance = await aTokenContract.read.balanceOf([provider.collector]);
        // const aTokenBalance = await aTokenContract.read.balanceOf([
        //   '0x0000000000000000000000000000000000000000' as Hex,
        // ]);

        const aTokenSymbol = await aTokenContract.read.symbol();

        return {
          name: reserve.name,
          underlyingSymbol: reserve.symbol,
          decimals: reserve.decimals,
          balance: formatUnits(reserveBalance, Number(reserve.decimals)),
          aTokenSymbol: aTokenSymbol,
          aTokenBalance: formatUnits(aTokenBalance, Number(reserve.decimals)),
        };
      })
    );

    aTokenBalances.map((b) =>
      console.log(
        `${provider.network},${b.name},${b.decimals},${b.underlyingSymbol},${b.balance},${b.aTokenSymbol},${b.aTokenBalance}`
      )
    );
    // console.log(JSONbig.stringify(aTokenBalances));
  }
}

getReservesData();
