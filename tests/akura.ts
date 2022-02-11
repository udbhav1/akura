import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Akura } from '../target/types/akura';
import * as splToken from '@solana/spl-token';
import * as serumAta from '@project-serum/associated-token'
import * as web3 from '@solana/web3.js';
import * as assert from "assert";
const utils = require("./utils");
const serumUtils = require("./serumUtils");

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

// Accounts used to setup the orderbook.
  let ORDERBOOK_ENV,
    // Accounts used for A -> USDC swap transactions.
    SWAP_A_USDC_ACCOUNTS,
    // Accounts used for  USDC -> A swap transactions.
    SWAP_USDC_A_ACCOUNTS,
    // Serum DEX vault PDA for market A/USDC.
    marketAVaultSigner,
    // Serum DEX vault PDA for market B/USDC.
    marketBVaultSigner;

  const openOrdersA = anchor.web3.Keypair.generate();
  const openOrdersB = anchor.web3.Keypair.generate();

  it('BOILERPLATE: set up serum markets and orderbook', async () => {
    ORDERBOOK_ENV = await serumUtils.setupTwoMarkets({
        provider: program.provider,
      });

    const marketA = ORDERBOOK_ENV.marketA;
    const marketB = ORDERBOOK_ENV.marketB;

    const [vaultSignerA] = await serumUtils.getVaultOwnerAndNonce(
      marketA._decoded.ownAddress
    );
    const [vaultSignerB] = await serumUtils.getVaultOwnerAndNonce(
      marketB._decoded.ownAddress
    );
    marketAVaultSigner = vaultSignerA;
    marketBVaultSigner = vaultSignerB;

    SWAP_USDC_A_ACCOUNTS = {
      market: {
        market: marketA._decoded.ownAddress,
        requestQueue: marketA._decoded.requestQueue,
        eventQueue: marketA._decoded.eventQueue,
        bids: marketA._decoded.bids,
        asks: marketA._decoded.asks,
        coinVault: marketA._decoded.baseVault,
        pcVault: marketA._decoded.quoteVault,
        vaultSigner: marketAVaultSigner,
        // User params.
        openOrders: openOrdersA.publicKey,
        orderPayerTokenAccount: ORDERBOOK_ENV.godUsdc,
        coinWallet: ORDERBOOK_ENV.godA,
      },
      pcWallet: ORDERBOOK_ENV.godUsdc,
      authority: program.provider.wallet.publicKey,
      dexProgram: serumUtils.DEX_PID,
      tokenProgram: serumUtils.TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    };
    SWAP_A_USDC_ACCOUNTS = {
      ...SWAP_USDC_A_ACCOUNTS,
      market: {
        ...SWAP_USDC_A_ACCOUNTS.market,
        orderPayerTokenAccount: ORDERBOOK_ENV.godA,
      },
    };
    console.log(SWAP_USDC_A_ACCOUNTS);
  });

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