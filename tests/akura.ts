import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Akura } from '../target/types/akura';
import * as splToken from '@solana/spl-token';
import * as serumAta from '@project-serum/associated-token';
import * as serum from '@project-serum/serum';
import * as web3 from '@solana/web3.js';
import * as assert from "assert";
const utils = require("./utils");
const serumUtils = require("./serumUtils");

anchor.setProvider(anchor.Provider.env());

const program = anchor.workspace.Akura as Program<Akura>;

describe('akura', () => {

  let temp;
  let manager = anchor.web3.Keypair.generate();
  let fundAddress;
  let fundUsdcAta;
  let fundMngoAta;
  let fundRayAta;
  let mintOwner = anchor.web3.Keypair.generate();
  let mintBump;
  let fundTokenMint;
  let fundBump;
  let buyer;
  let buyerUsdcAta;
  let buyerFundAta;
  let buyAmount;
  let usdcAmount;

  let USDC_MINT;
  let MNGO_MINT;
  let RAY_MINT;
  let MARKET_MNGO_USDC;
  let MARKET_RAY_USDC;
  let MARKET_MAKER;
// Accounts used to setup the orderbook.
  let ORDERBOOK_ENV,
    // Accounts used for A -> USDC swap transactions.
    SWAP_A_USDC_ACCOUNTS,
    // Accounts used for  USDC -> A swap transactions.
    SWAP_USDC_A_ACCOUNTS,
    // Serum DEX vault PDA for market A/USDC.
    marketMngoVaultSigner,
    // Serum DEX vault PDA for market B/USDC.
    marketRayVaultSigner;
  const Side = {
    Bid: { bid: {} },
    Ask: { ask: {} },
  };
  let asks = [
    [6.041, 7.8],
    [6.051, 72.3],
    [6.055, 5.4],
    [6.067, 15.7],
    [6.077, 390.0],
    [6.09, 24.0],
    [6.11, 36.3],
    [6.133, 300.0],
    [6.167, 687.8],
  ];
  let bids = [
    [6.004, 8.5],
    [5.995, 12.9],
    [5.987, 6.2],
    [5.978, 15.3],
    [5.965, 82.8],
    [5.961, 25.4],
  ];

  let openOrdersMngo = anchor.web3.Keypair.generate();
  let openOrdersRay = anchor.web3.Keypair.generate();

  it('BOILERPLATE: set up mints, markets, and orderbook', async () => {

    let marketMaker = anchor.web3.Keypair.generate();

    await utils.airdrop(program, manager.publicKey, utils.lamports(5));
    await utils.airdrop(program, mintOwner.publicKey, utils.lamports(5));
    await utils.airdrop(program, marketMaker.publicKey, utils.lamports(5));

    USDC_MINT = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );
    MNGO_MINT = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );
    RAY_MINT = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );

    let marketMakerUsdc = await USDC_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await USDC_MINT.mintTo(marketMakerUsdc.address, mintOwner.publicKey, [], utils.usdc(10000));

    let marketMakerMngo = await MNGO_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await MNGO_MINT.mintTo(marketMakerMngo.address, mintOwner.publicKey, [], utils.usdc(10000));

    let marketMakerRay = await RAY_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await RAY_MINT.mintTo(marketMakerRay.address, mintOwner.publicKey, [], utils.usdc(10000));

    MARKET_MAKER = {
      account: marketMaker,
      usdc: marketMakerUsdc,
      mngo: marketMakerMngo,
      ray: marketMakerRay
    };

    MARKET_MNGO_USDC = await serumUtils.setupMarket({
      provider: program.provider,
      baseMint: MNGO_MINT.publicKey,
      quoteMint: USDC_MINT.publicKey,
      marketMaker: {
        account: MARKET_MAKER.account,
        baseToken: MARKET_MAKER.mngo.address,
        quoteToken: MARKET_MAKER.usdc.address,
      },
      bids: bids,
      asks: asks,
    });

    MARKET_RAY_USDC = await serumUtils.setupMarket({
      provider: program.provider,
      baseMint: RAY_MINT.publicKey,
      quoteMint: USDC_MINT.publicKey,
      marketMaker: {
        account: MARKET_MAKER.account,
        baseToken: MARKET_MAKER.ray.address,
        quoteToken: MARKET_MAKER.usdc.address,
      },
      bids: bids,
      asks: asks,
    });

    const [vaultSignerA] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_MNGO_USDC._decoded.ownAddress
    );
    const [vaultSignerB] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_RAY_USDC._decoded.ownAddress
    );
    marketMngoVaultSigner = vaultSignerA;
    marketRayVaultSigner = vaultSignerB;

  });

  it('create fund', async () => {

    let fundName = "defi index";
    let fundSymbol = "DEFI";
    let num_assets = 2;
    let assets = [MNGO_MINT.publicKey, RAY_MINT.publicKey];
    let weights = [new anchor.BN(1), new anchor.BN(1)];
    let fundTokenDecimals = 9;
    [fundAddress, fundBump] = await utils.deriveFundAddress(
      program,
      manager.publicKey,
      fundName
    );
    fundUsdcAta = await serumAta.getAssociatedTokenAddress(fundAddress, USDC_MINT.publicKey);
    fundMngoAta = await serumAta.getAssociatedTokenAddress(fundAddress, MNGO_MINT.publicKey);
    [fundTokenMint, mintBump] = await utils.deriveMintAddress(
      program,
      manager.publicKey,
      fundName
    );

    // mints and atas for underlying tokens
    let remainingAccounts = await utils.genRemainingAccounts(fundAddress, assets);
    remainingAccounts.push({pubkey: openOrdersMngo.publicKey, isSigner: true, isWritable: true});
    remainingAccounts.push({pubkey: MARKET_MNGO_USDC._decoded.ownAddress, isSigner: false, isWritable: false});

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
          usdcMint: USDC_MINT.publicKey,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          associatedTokenProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          dexProgram: serumUtils.DEX_PID,
        },
        signers: [openOrdersMngo, manager],
        remainingAccounts,
    });

    // make sure open orders account is now stored in the market account
    let oo = await MARKET_MNGO_USDC.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
    assert.equal(oo[0].address.toBase58(), openOrdersMngo.publicKey.toBase58());
    // console.log(openOrdersMngo.publicKey);
    // console.log(oo);
  });

  it('buy fund', async () => {
    buyer = anchor.web3.Keypair.generate();
    await utils.airdrop(program, buyer.publicKey, utils.lamports(5));

    // should already be init'ed or else sending usdc isnt possible
    buyerUsdcAta = await USDC_MINT.getOrCreateAssociatedAccountInfo(buyer.publicKey);
    // will be init'ed by the program
    buyerFundAta = await serumAta.getAssociatedTokenAddress(
      buyer.publicKey,
      fundTokenMint
    );

    usdcAmount = utils.usdc(500);
    await USDC_MINT.mintTo(buyerUsdcAta.address, mintOwner.publicKey, [], usdcAmount);

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);

    assert.equal(temp.amount, usdcAmount);

    buyAmount = utils.usdc(100);

    let remainingAccounts = [
      {pubkey: MARKET_MNGO_USDC._decoded.ownAddress, isSigner: false, isWritable: true},
      {pubkey: openOrdersMngo.publicKey, isSigner: false, isWritable: true},
      {pubkey: MARKET_MNGO_USDC._decoded.requestQueue, isSigner: false, isWritable: true},
      {pubkey: MARKET_MNGO_USDC._decoded.eventQueue, isSigner: false, isWritable: true},
      {pubkey: MARKET_MNGO_USDC._decoded.bids, isSigner: false, isWritable: true},
      {pubkey: MARKET_MNGO_USDC._decoded.asks, isSigner: false, isWritable: true},
      {pubkey: fundUsdcAta, isSigner: false, isWritable: true},
      {pubkey: MARKET_MNGO_USDC._decoded.baseVault, isSigner: false, isWritable: true},
      {pubkey: MARKET_MNGO_USDC._decoded.quoteVault, isSigner: false, isWritable: true},
      {pubkey: marketMngoVaultSigner, isSigner: false, isWritable: false},
      {pubkey: fundMngoAta, isSigner: false, isWritable: true},

      {pubkey: fundAddress, isSigner: true, isWritable: false},
      {pubkey: fundUsdcAta, isSigner: false, isWritable: true},
      {pubkey: serumUtils.DEX_PID, isSigner: false, isWritable: false},
    ];

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