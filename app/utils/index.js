import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import * as serumAta from '@project-serum/associated-token'
import * as web3 from '@solana/web3.js';

function lamports(sol) {
  return sol*anchor.web3.LAMPORTS_PER_SOL;
}

function sol(lamports) {
  return lamports/anchor.web3.LAMPORTS_PER_SOL;
}

function usdc(dollars) {
  return dollars*(10**6);
}

function pad(arr, len) {
  let l = arr.length
  for(var i = 0; i < (len - l); i++){
    arr.push(0);
  }
  return arr;
}

function strToU8(str) {
  return Array.from(Uint8Array.from(str, x => x.charCodeAt(0)));
}

function u8ToStr(arr) {
  return String.fromCharCode(...arr);
}

function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function delay(interval, message) {
   return it(message, done => {
      setTimeout(() => done(), interval)
   }).timeout(interval + 100)
}

async function airdrop(program, address, lamports) {
  const air = await program.provider.connection.requestAirdrop(address, lamports);
  await program.provider.connection.confirmTransaction(air);
}

async function getLamportBalance(program, address) {
  let amt = await program.provider.connection.getBalance(address);
  return amt;
}

async function getTokenBalance(program, tokenAccountAddress) {
  let res = await program.provider.connection.getTokenAccountBalance(tokenAccountAddress);
  return res.value;
}

async function deriveFundAddress(
  program,
  managerAddress,
  fundName,
) {
  let name = pad(strToU8(fundName), 30);
  const [fundAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura fund"), managerAddress.toBytes(), Buffer.from(name)],
    program.programId
  )
  return [fundAddress, bump];
}

async function deriveMintAddress(
  program,
  managerAddress,
  fundName
) {
  let name = pad(strToU8(fundName), 30);
  const [mintAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura fund mint"), managerAddress.toBytes(), Buffer.from(name)],
    program.programId
  )
  return [mintAddress, bump];
}

async function deriveBuyDataAddress(
  program,
  fundAddress,
  buyer,
  fundName
) {
  const [buyDataAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura buy data"), fundAddress.toBytes(), buyer.toBytes()],
    program.programId
  )
  return [buyDataAddress, bump];
}

async function deriveSellDataAddress(
  program,
  fundAddress,
  seller,
  fundName
) {
  const [sellDataAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura sell data"), fundAddress.toBytes(), seller.toBytes()],
    program.programId
  )
  return [sellDataAddress, bump];
}

async function genRemainingCreateAccounts(
  fundAddress,
  assets,
) {
  let res = [];
  for(let asset of assets){
    let ata = await serumAta.getAssociatedTokenAddress(fundAddress, asset.mint);
    res.push({pubkey: asset.mint, isSigner: false, isWritable: true});
    // res.push({pubkey: ata, isSigner: false, isWritable: true});
    res.push({pubkey: asset.market._decoded.ownAddress, isSigner: false, isWritable: false});
    res.push({pubkey: asset.openOrders, isSigner: true, isWritable: true});
  }
  return res;
}

async function genRemainingBuyAccounts(
  fundAddress,
  asset
) {
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
  res.push({pubkey: asset.mint, isSigner: false, isWritable: false});
  return res;
}

module.exports = {
  lamports,
  sol,
  usdc,
  pad,
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