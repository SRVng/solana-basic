import {Connection, Keypair, PublicKey} from '@solana/web3.js';
import os from 'os';
import path from 'path';
import fs from 'mz/fs';
import yaml from 'yaml';

export async function getCONFIG(): Promise<any> {
    const CONFIG_FILE_PATH = path.resolve(
        os.homedir(),
        '.config',
        'solana',
        'cli',
        'config.yml',
    );
    const configyml = await fs.readFile(CONFIG_FILE_PATH, {encoding: 'utf-8'});
    return yaml.parse(configyml);
} 

export async function newAccount(): Promise<Keypair> {
    const config = await getCONFIG();
    if (!config.keypair_path) throw new Error('Missing path');
    
    const read_secret_key = await fs.readFile(config.keypair_path, {encoding: 'utf-8'});
    const secretKey = Uint8Array.from(JSON.parse(read_secret_key));
    try {
        const keypair_from_secret = Keypair.fromSecretKey(secretKey);
        console.log("Keypair found, Returning keypair...");
        return keypair_from_secret
    } catch (e) {
        console.warn("Failed to create keypair from secret key, generating new...");
        return Keypair.generate()
    }
}


