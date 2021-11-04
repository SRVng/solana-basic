import { send, CheckprogramId, Deployed, establishConnection, establishPayer, LogResult, PDA } from "./plus";


async function main(): Promise<void> {
    await establishConnection();
    await CheckprogramId();
    await Deployed();
    await establishPayer();
    await PDA();
    await send();
    await LogResult();
}

main().then(
    () => process.exit(),
    err => {
        console.warn("Transaction failed with error: ", err);
        process.exit(-1);
    }
);