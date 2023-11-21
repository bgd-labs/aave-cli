import { Command } from '@commander-js/extra-typings';
import { providers, Wallet } from 'ethers';
import { L2ToL1Message, L2TransactionReceipt } from '@arbitrum/sdk';

export function addCommand(program: Command) {
    program
        .command('arbitrum-bridge-exit')
        .description('generate necessary parameters to exit arbitrum bridge')
        .argument('<tx_hash>')
        .argument('<log_index>')
        .argument('<block_number>')
        .action(async (tx_hash, log_index, block_number) => {
            if (!tx_hash.startsWith('0x') || tx_hash.trim().length != 66) {
                throw new Error(`${tx_hash} doesn't look like a txn hash.`);
            }

            const idx = log_index ? parseInt(log_index) : 0;

            const l1Provider = new providers.JsonRpcProvider(process.env.RPC_MAINNET);
            const l2Provider = new providers.JsonRpcProvider(process.env.RPC_ARBITRUM);
            const walletPrivateKey = process.env.PRIVATE_KEY ?? '';
            const l1Wallet = new Wallet(walletPrivateKey, l1Provider);

            const receipt = await l2Provider.getTransactionReceipt(tx_hash);
            const l2Receipt = new L2TransactionReceipt(receipt);

            const messages = await l2Receipt.getL2ToL1Messages(l1Wallet);
            const l2ToL1Msg = messages[idx];

            // if ((await l2ToL1Msg.status(l2Provider)) == L2ToL1MessageStatus.EXECUTED) {
            //     console.log(`Message already executed! Nothing else to do here`);
            //     process.exit(1);
            // }

            const proof = await l2ToL1Msg.getOutboxProof(l2Provider);
            console.log("Proof:", proof);

            const block = parseInt(block_number);

            const logs = await L2ToL1Message.getL2ToL1Events(l2Provider, { fromBlock: block, toBlock: block + 1 });
            logs.forEach(function (log) {
                if (log.transactionHash != tx_hash) {
                    return;
                }

                console.log("Tx Hash:", log.transactionHash);
                console.log("Index:", log.position.toNumber());
                console.log("Caller:", log.caller);
                console.log("Destination:", log.destination);
                console.log("Arbitrum Block Number:", log.arbBlockNum.toNumber());
                console.log("Mainnet Block Number:", log.ethBlockNum.toNumber());
                console.log("Timestamp:", log.timestamp.toNumber());
                console.log("Value:", log.callvalue.toNumber());
                console.log("Data:", log.data);
            });
            
        });
}
