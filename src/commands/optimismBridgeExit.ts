import { Command } from '@commander-js/extra-typings';
import { providers } from 'ethers';
import { CrossChainMessenger } from '@eth-optimism/sdk';
// require('dotenv').config()

export function addCommand(program: Command) {
    const optimism = program.command('optimism').description('interact with Optimism bridge');
    const l1ChainId = 1;
    const l2ChainId = 10;

    const crossChainMessenger = new CrossChainMessenger({
        l1ChainId: l1ChainId,
        l2ChainId: l2ChainId,
        l1SignerOrProvider: l1Wallet,
        l2SignerOrProvider: l2Wallet
    });

    optimism
        .command('prove-messsage')
        .description('generate proof of l2 to l1 bridge on Optimism')
        .argument('<tx_hash>')
        .argument('<log_index>')
        .action(async (tx_hash, log_index) => {
            await crossChainMessenger.proveMessage(tx_hash);
            console.log("Message was proven, bridged assets will be available in ~7 days");
    });

    optimism
        .command('exit-bridge')
        .description('exit Optimism bridge')
        .argument('<tx_hash>')
        .argument('<log_index>')
        .action(async (tx_hash, log_index) => {
            await crossChainMessenger.finalizeMessage(tx_hash);
            console.log("Bridge exit was successful");
    });
}
