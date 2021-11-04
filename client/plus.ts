import {getCONFIG, newAccount} from './utils';
import { Connection, 
    PublicKey, 
    TransactionInstruction, 
    Transaction, 
    sendAndConfirmTransaction,
    Keypair, 
    LAMPORTS_PER_SOL, 
    SystemProgram, 
} from '@solana/web3.js';
import path from 'path';
import fs from 'mz/fs';
import * as BufferLayout from '@solana/buffer-layout'
import { Buffer, kStringMaxLength } from 'buffer';
import {serialize, deserialize, deserializeUnchecked} from 'borsh';

let connection: Connection;
let programId: PublicKey;
let payer: Keypair;
let derivedaccount: PublicKey;

const PROGRAM_PATH = path.resolve(__dirname, '../target/deploy/');
const PROGRAM_SO_PATH = path.resolve(PROGRAM_PATH, 'basic_calculator.so');
const PROGRAM_KEYPAIR_PATH = path.resolve(PROGRAM_PATH, 'basic_calculator-keypair.json');

class PlusAccount {
    result = "" + kStringMaxLength;
    constructor(fields: {result: string} | undefined = undefined) {
        if (fields) {
            this.result = fields.result;
        }
    }
}

const PlusSchema = new Map([
    [PlusAccount, {kind: 'struct', fields: [['result','String']]}],
]);

const SIZE = serialize(
    PlusSchema,
    new PlusAccount(),
).length + 1;

console.log("Account size => ",SIZE);

export async function establishConnection(): Promise<void> {
    const rpcurl = "http://localhost:8899";
    const devnet = "https://api.devnet.solana.com";
    connection = new Connection(rpcurl, 'confirmed');
    let version = await connection.getVersion();
    console.log("Connection established at %s, info: %s", rpcurl, version);
}

export async function CheckprogramId(): Promise<any> {
    const read_keypair = await fs.readFile(PROGRAM_KEYPAIR_PATH, {encoding: 'utf-8'});
    const keypair_json = Uint8Array.from(JSON.parse(read_keypair));
    try {
        const keypair_from_json = Keypair.fromSecretKey(keypair_json);
        programId = keypair_from_json.publicKey;
        return programId
    } catch (err) {
        const errMsg = (err as Error).message;
        throw new Error(
            'Failed to read'
        );
    }
}

export async function Deployed(): Promise<void> {
    const programInfo = await connection.getAccountInfo(programId);
    if (programInfo === null) {
        if (fs.existsSync(PROGRAM_SO_PATH)) {
            throw new Error("Please deploy program using correct path")
        } else {
            throw new Error("Please build program first and then deploy")
        } 
    } else if (!programInfo.executable) {
        throw new Error("Program is not  executable");
    }
    console.log("Using program %s", programId.toBase58());
}

export async function establishPayer(): Promise<void> {
    let fees = 0;
    if (!payer) {
        const {feeCalculator} = await connection.getRecentBlockhash();
        fees += await connection.getMinimumBalanceForRentExemption(SIZE);
        fees += feeCalculator.lamportsPerSignature * 100;

        payer = await newAccount();
    }

    let lamports = await connection.getBalance(payer.publicKey);
    if (lamports < fees) {
        const sig = await connection.requestAirdrop(
            payer.publicKey,
            fees - lamports
        );
        await connection.confirmTransaction(sig);
        lamports = await connection.getBalance(payer.publicKey);
    }

    console.log('Using account', payer.publicKey.toBase58(), 'containing', lamports / LAMPORTS_PER_SOL, 'SOL');
}

export async function PDA(): Promise<void> {
    const SEED = 'HELLOSOLANA';
    derivedaccount = await PublicKey.createWithSeed(
        payer.publicKey,
        SEED,
        programId
    );

    const PDA = await connection.getAccountInfo(derivedaccount);
    if (PDA === null) {
        console.log('Creating account', derivedaccount.toBase58())
        const lamports = await connection.getMinimumBalanceForRentExemption(SIZE);
        const transaction = new Transaction().add(
        SystemProgram.createAccountWithSeed({
            basePubkey: payer.publicKey,
            fromPubkey: payer.publicKey,
            lamports,
            newAccountPubkey: derivedaccount,
            programId,
            seed: SEED,
            space: SIZE,
        })
    );
        await sendAndConfirmTransaction(connection, transaction, [payer]);
    };
}

function calculate(method: number,x: number, y:number): Buffer {
    const dataLayout = BufferLayout.struct([
        BufferLayout.u8('method'),
        BufferLayout.s32('x'),
        BufferLayout.s32('y'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    dataLayout.encode({
        method,
        x,
        y,
    }, data);
    return data
}

export async function send(): Promise<void> {
    const instruction = new TransactionInstruction({
        keys: [{pubkey: derivedaccount, isSigner: false, isWritable: true}],
        programId,
        data: calculate(3,-15979361,5)
    });
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [payer]);
}

export async function LogResult(): Promise<void> {
    const accountInfo = await connection.getAccountInfo(derivedaccount);
    if (accountInfo === null) {
        throw 'Error: accountInfo is null'
    }
    try {
        const result = deserializeUnchecked(
            PlusSchema,
            PlusAccount,
            accountInfo!.data
        );
        console.log(
            "The created program address: ",
            derivedaccount.toBase58(),
            "stored result of",
            result.result
        )
    } catch (err) {
        console.warn(err)
    }
}