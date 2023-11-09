import { Command } from '@commander-js/extra-typings';
import { providers } from 'ethers';
import { L2TransactionReceipt } from '@arbitrum/sdk';
// require('dotenv').config()

export function addCommand(program: Command) {
    program
        .command('arbitrum-bridge-exit')
        .description('generate necessary parameters to exit arbitrum bridge')
        .argument('<tx_hash>')
        .argument('<log_index>')
        .action(async (tx_hash, log_index) => {
            if (!tx_hash) {
                throw new Error(
                    'Provide a transaction hash of an L2 transaction that sends an L2 to L1 message'
                );
            }
    
            if (!tx_hash.startsWith('0x') || tx_hash.trim().length != 66) {
                throw new Error(`${tx_hash} doesn't look like a txn hash.`);
            }

            const idx = log_index ? parseInt(log_index) : 0;
            const l2Provider = new providers.JsonRpcProvider(process.env.RPC_ARBITRUM);

            const receipt = await l2Provider.getTransactionReceipt(tx_hash);
            const l2Receipt = new L2TransactionReceipt(receipt);

            const messages = await l2Receipt.getL2ToL1Messages(l2Provider);
            const l2ToL1Msg = messages[idx];

            // if ((await l2ToL1Msg.status(l2Provider)) == L2ToL1MessageStatus.EXECUTED) {
            //     console.log(`Message already executed! Nothing else to do here`);
            //     process.exit(1);
            // }

            const proof = await l2ToL1Msg.getOutboxProof(l2Provider);
            console.log("Proof:", proof);
            console.log("Index:", l2ToL1Msg.event.position);
            console.log("Caller:", l2ToL1Msg.event.caller);
            console.log("Destination:", l2ToL1Msg.event.destination);
            console.log("Arbitrum Block Number:", l2ToL1Msg.event.arbBlockNum);
            console.log("Mainnet Block Number:", l2ToL1Msg.event.ethBlockNum);
            console.log("Timestamp:", l2ToL1Msg.event.timestamp);
            console.log("Value:", l2ToL1Msg.event.callvalue);
            console.log("Data:", l2ToL1Msg.event.data);
        });
}
