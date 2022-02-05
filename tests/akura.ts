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

async function deriveFundAddress(program,
  managerAddress: web3.PublicKey,
  fundName: string
): Promise<[fundAddress: web3.PublicKey, bump: number]> {
  const [fundAddress, bump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("akura fund"), managerAddress.toBytes()],
    program.programId
  )
  return [fundAddress, bump];
}

anchor.setProvider(anchor.Provider.env());

const program = anchor.workspace.Akura as Program<Akura>;

describe('akura', () => {

  let manager;
  let fundAddress;
  let bump;
  let solMint;
  let srmMint;

  it('create fund', async () => {

    manager = anchor.web3.Keypair.generate();
    solMint = anchor.web3.Keypair.generate();
    srmMint = anchor.web3.Keypair.generate();

    await airdrop(program, manager.publicKey, lamports(5));
    await airdrop(program, solMint.publicKey, lamports(5));
    await airdrop(program, srmMint.publicKey, lamports(5));

    let fundName = "defi index";
    let fundSymbol = "DEFI";
    let num_assets = 2;
    let assets = [solMint.publicKey, srmMint.publicKey];
    let weights = [new anchor.BN(1), new anchor.BN(1)];
    [fundAddress, bump] = await deriveFundAddress(program, manager.publicKey, fundName);

    await program.rpc.createFund(strToU8(fundName) as any,
                                 strToU8(fundSymbol) as any,
                                 new anchor.BN(num_assets),
                                 assets,
                                 weights,
                                 new anchor.BN(bump), {
        accounts: {
          fund: fundAddress,
          manager: manager.publicKey,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          ataProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rentSysvar: web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [manager],
    });

  });

  it('fetch fund', async () => {
    const fundAccounts = await program.account.fund.all();
    // console.log(fundAccounts[0]);
    assert.equal(fundAccounts.length, 1);
  });

});