import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import * as serumAta from '@project-serum/associated-token'
import * as web3 from '@solana/web3.js';

function lamports(sol: number): number {
  return sol*anchor.web3.LAMPORTS_PER_SOL;
}

function sol(lamports: number): number {
  return lamports/anchor.web3.LAMPORTS_PER_SOL;
}

function usdc(dollars: number): number {
  return dollars*(10**6);
}

function strToU8(str: String): number[] {
  return Array.from(Uint8Array.from(str, x => x.charCodeAt(0)));
}

function u8ToStr(arr: number[]): String {
  return String.fromCharCode(...arr);
}

function randomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function delay(interval: number, message: string): Mocha.Test {
   return it(message, done => {
      setTimeout(() => done(), interval)
   }).timeout(interval + 100)
}

async function airdrop(program, address: web3.PublicKey, lamports: number){
  const air = await program.provider.connection.requestAirdrop(address, lamports);
  await program.provider.connection.confirmTransaction(air);
}

async function getLamportBalance(program, address: web3.PublicKey): Promise<number> {
  let amt = await program.provider.connection.getBalance(address);
  return amt;
}

async function getTokenBalance(program, tokenAccountAddress: web3.PublicKey): Promise<{
  amount: string,
  decimals: number,
  uiAmount: number,
  uiAmountString: number
}> {
  let res = await program.provider.connection.getTokenAccountBalance(tokenAccountAddress);
  return res.value;
}

async function deriveFundAddress(
  program,
  managerAddress: web3.PublicKey,
  fundName: string
): Promise<[fundAddress: web3.PublicKey, bump: number]> {
  let name = Buffer.from(fundName);
  const [fundAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura fund"), managerAddress.toBytes()],
    program.programId
  )
  return [fundAddress, bump];
}

async function deriveMintAddress(
  program,
  managerAddress: web3.PublicKey,
  fundName: string
): Promise<[mintAddress: web3.PublicKey, bump: number]> {
  const [mintAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura fund mint"), managerAddress.toBytes()],
    program.programId
  )
  return [mintAddress, bump];
}

async function deriveBuyDataAddress(
  program,
  fundAddress: web3.PublicKey,
  buyer: web3.PublicKey,
  fundName: string
): Promise<[buyDataAddress: web3.PublicKey, bump: number]> {
  const [buyDataAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura buy data"), fundAddress.toBytes(), buyer.toBytes()],
    program.programId
  )
  return [buyDataAddress, bump];
}

async function deriveSellDataAddress(
  program,
  fundAddress: web3.PublicKey,
  seller: web3.PublicKey,
  fundName: string
): Promise<[sellDataAddress: web3.PublicKey, bump: number]> {
  const [sellDataAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura sell data"), fundAddress.toBytes(), seller.toBytes()],
    program.programId
  )
  return [sellDataAddress, bump];
}

async function genRemainingCreateAccounts(
  fundAddress: web3.PublicKey,
  assets: [{mint: web3.PublicKey, market: any, vaultSigner: web3.PublicKey, openOrders: web3.PublicKey}]
): Promise<any> {
  let res = [];
  for(let asset of assets){
    let ata = await serumAta.getAssociatedTokenAddress(fundAddress, asset.mint);
    res.push({pubkey: asset.mint, isSigner: false, isWritable: true});
    res.push({pubkey: ata, isSigner: false, isWritable: true});
    res.push({pubkey: asset.market._decoded.ownAddress, isSigner: false, isWritable: false});
    res.push({pubkey: asset.openOrders, isSigner: true, isWritable: true});
  }
  return res;
}

async function genRemainingBuyAccounts(
  fundAddress: web3.PublicKey,
  asset: {mint: web3.PublicKey, market: any, vaultSigner: web3.PublicKey, openOrders: web3.PublicKey}
): Promise<any> {
  let res = [];
  let assetAta = await serumAta.getAssociatedTokenAddress(fundAddress, asset.mint);
  res.push({pubkey: asset.market._decoded.ownAddress, isSigner: false, isWritable: true});
  res.push({pubkey: asset.openOrders, isSigner: false, isWritable: true});
  res.push({pubkey: asset.market._decoded.requestQueue, isSigner: false, isWritable: true});
  res.push({pubkey: asset.market._decoded.eventQueue, isSigner: false, isWritable: true});
  res.push({pubkey: asset.market._decoded.bids, isSigner: false, isWritable: true});
  res.push({pubkey: asset.market._decoded.asks, isSigner: false, isWritable: true});
  res.push({pubkey: asset.market._decoded.baseVault, isSigner: false, isWritable: true});
  res.push({pubkey: asset.market._decoded.quoteVault, isSigner: false, isWritable: true});
  res.push({pubkey: asset.vaultSigner, isSigner: false, isWritable: false});
  res.push({pubkey: assetAta, isSigner: false, isWritable: true});
  return res;
}

module.exports = {
  lamports,
  sol,
  usdc,
  strToU8,
  u8ToStr,
  randomInt,
  delay,
  airdrop,
  getLamportBalance,
  getTokenBalance,
  deriveFundAddress,
  deriveMintAddress,
  deriveBuyDataAddress,
  deriveSellDataAddress,
  genRemainingCreateAccounts,
  genRemainingBuyAccounts,
};