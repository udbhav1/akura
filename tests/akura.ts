import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Akura } from '../target/types/akura';
import * as splToken from '@solana/spl-token';
import * as serumAta from '@project-serum/associated-token'
import * as web3 from '@solana/web3.js';
import * as assert from "assert";

function lamports(sol: number): number {
  return sol*anchor.web3.LAMPORTS_PER_SOL;
}

function sol(lamports: number): number {
  return lamports/anchor.web3.LAMPORTS_PER_SOL;
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

async function genRemainingAccounts(
  fundAddress: web3.PublicKey,
  mints: web3.PublicKey[]
  ): Promise<any> {
  let res = []
  for(let mint of mints){
    let ata = await serumAta.getAssociatedTokenAddress(fundAddress, mint);
    res.push({pubkey: mint, isSigner: false, isWritable: true});
    res.push({pubkey: ata, isSigner: false, isWritable: true});
  }
  return res;
}

anchor.setProvider(anchor.Provider.env());

const program = anchor.workspace.Akura as Program<Akura>;

describe('akura', () => {

  let manager;
  let fundAddress;
  let mintOwner;
  let mintBump;
  let solMint;
  let srmMint;
  let fundTokenMint;
  let fundBump;

  it('create fund', async () => {

    manager = anchor.web3.Keypair.generate();
    mintOwner = anchor.web3.Keypair.generate();

    await airdrop(program, manager.publicKey, lamports(5));
    await airdrop(program, mintOwner.publicKey, lamports(5));

    solMint = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      9,
      splToken.TOKEN_PROGRAM_ID
    );
    srmMint = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );

    let fundName = "defi index";
    let fundSymbol = "DEFI";
    let num_assets = 2;
    let assets = [solMint.publicKey, srmMint.publicKey];
    let weights = [new anchor.BN(1), new anchor.BN(1)];
    [fundAddress, fundBump] = await deriveFundAddress(program, manager.publicKey, fundName);
    [fundTokenMint, mintBump] = await deriveMintAddress(program, manager.publicKey, fundName);

    // mints and atas for underlying tokens
    let remainingAccounts = await genRemainingAccounts(fundAddress, assets);

    await program.rpc.createFund(strToU8(fundName) as any,
                                 strToU8(fundSymbol) as any,
                                 new anchor.BN(num_assets),
                                 weights,
                                 new anchor.BN(fundBump),
                                 new anchor.BN(mintBump), {
        accounts: {
          fund: fundAddress,
          manager: manager.publicKey,
          indexTokenMint: fundTokenMint,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          ataProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [manager],
        remainingAccounts,
    });

  });

  it('fetch fund', async () => {
    const fundAccounts = await program.account.fund.all();
    // console.log(fundAccounts[0].account.assets);
    assert.equal(fundAccounts.length, 1);
  });

});