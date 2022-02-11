import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Akura } from '../target/types/akura';
import * as splToken from '@solana/spl-token';
import * as serumAta from '@project-serum/associated-token'
import * as web3 from '@solana/web3.js';
import * as assert from "assert";
const utils = require("./utils");

anchor.setProvider(anchor.Provider.env());

const program = anchor.workspace.Akura as Program<Akura>;

describe('akura', () => {

  let temp;
  let manager;
  let fundAddress;
  let fundUsdcAta;
  let mintOwner;
  let mintBump;
  let usdcMint;
  let solMint;
  let srmMint;
  let fundTokenMint;
  let fundBump;
  let buyer;
  let buyerUsdcAta;
  let buyerFundAta;
  let buyAmount;
  let usdcAmount;

  it('create fund', async () => {

    manager = anchor.web3.Keypair.generate();
    mintOwner = anchor.web3.Keypair.generate();

    await utils.airdrop(program, manager.publicKey, utils.lamports(5));
    await utils.airdrop(program, mintOwner.publicKey, utils.lamports(5));

    usdcMint = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );
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
    let fundTokenDecimals = 9;
    [fundAddress, fundBump] = await utils.deriveFundAddress(
      program,
      manager.publicKey,
      fundName
    );
    fundUsdcAta = await serumAta.getAssociatedTokenAddress(fundAddress, usdcMint.publicKey);
    [fundTokenMint, mintBump] = await utils.deriveMintAddress(
      program,
      manager.publicKey,
      fundName
    );

    // mints and atas for underlying tokens
    let remainingAccounts = await utils.genRemainingAccounts(fundAddress, assets);

    await program.rpc.createFund(utils.strToU8(fundName) as any,
                                 utils.strToU8(fundSymbol) as any,
                                 new anchor.BN(num_assets),
                                 weights,
                                 new anchor.BN(fundTokenDecimals), {
        accounts: {
          fund: fundAddress,
          fundUsdcAta: fundUsdcAta,
          manager: manager.publicKey,
          indexTokenMint: fundTokenMint,
          usdcMint: usdcMint.publicKey,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          associatedTokenProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [manager],
        remainingAccounts,
    });

  });

  it('buy fund', async () => {
    buyer = anchor.web3.Keypair.generate();
    await utils.airdrop(program, buyer.publicKey, utils.lamports(5));

    // should already be init'ed or else sending usdc isnt possible
    buyerUsdcAta = await usdcMint.getOrCreateAssociatedAccountInfo(buyer.publicKey);
    // will be init'ed by the program
    buyerFundAta = await serumAta.getAssociatedTokenAddress(
      buyer.publicKey,
      fundTokenMint
    );

    usdcAmount = utils.usdc(500);
    await usdcMint.mintTo(buyerUsdcAta.address, mintOwner.publicKey, [], usdcAmount);

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);

    assert.equal(temp.amount, usdcAmount);

    buyAmount = utils.usdc(100);

    await program.rpc.buyFund(new anchor.BN(buyAmount), {
        accounts: {
          fund: fundAddress,
          fundUsdcAta: fundUsdcAta,
          indexTokenMint: fundTokenMint,
          buyer: buyer.publicKey,
          buyerUsdcAta: buyerUsdcAta.address,
          buyerIndexAta: buyerFundAta,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          associatedTokenProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [buyer],
    });

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    assert.equal(usdcAmount - buyAmount, temp.amount);

    temp = await utils.getTokenBalance(program, buyerFundAta);
    assert.equal(temp.amount, buyAmount);
  });

  it('sell fund', async () => {
    await program.rpc.sellFund(new anchor.BN(buyAmount), {
        accounts: {
          fund: fundAddress,
          fundUsdcAta: fundUsdcAta,
          indexTokenMint: fundTokenMint,
          seller: buyer.publicKey,
          sellerUsdcAta: buyerUsdcAta.address,
          sellerIndexAta: buyerFundAta,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [buyer],
    });

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    assert.equal(usdcAmount, temp.amount);

    temp = await utils.getTokenBalance(program, buyerFundAta);
    assert.equal(temp.amount, 0); 
  });

  it('fetch fund', async () => {
    const fundAccounts = await program.account.fund.all();
    // console.log(fundAccounts[0].account);
    assert.equal(fundAccounts.length, 1);
  });

});