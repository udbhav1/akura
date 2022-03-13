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
var fs = require('fs');

anchor.setProvider(anchor.Provider.env());

const program = anchor.workspace.Akura as Program<Akura>;

describe('akura', () => {

  let temp;
  let manager = anchor.web3.Keypair.generate();
  let fundAddress;
  let fundUsdcAta;
  let fundMngoAta;
  let fundRayAta;
  let assets;
  let mintOwner = anchor.web3.Keypair.generate();
  let mintBump;
  let fundTokenMint;
  let fundBump;
  let buyer;
  let buyerUsdcAta;
  let buyerFundAta;
  let buyAmount;
  let sellAmount;
  let usdcAirdropAmount;
  let buyDataAddress;
  let buyDataBump;
  let sellDataAddress;
  let sellDataBump;

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

  let mngoAsks = [
    [2.00, 20],
    [2.01, 20],
    [2.03, 20],
    [2.05, 20],
  ];
  let mngoBids = [
    [1.97, 20],
    [1.95, 20],
    [1.93, 20],
    [1.90, 20],
  ];

  let rayAsks = [
    [5.00, 10],
    [5.01, 10],
    [5.03, 10],
    [5.05, 10],
  ];
  let rayBids = [
    [4.97, 10],
    [4.95, 10],
    [4.90, 10],
    [4.85, 10],
  ];

  let openOrdersMngo = anchor.web3.Keypair.generate();
  let openOrdersRay = anchor.web3.Keypair.generate();

  it.only('set up local accounts', async () => {
  
    let user = new web3.PublicKey("9xvL3NhQCsWxKd8ba1qLYQPbwdmHaA8cgRZgUi5WqCmi");

    console.log("serum boilerplate");
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
      bids: mngoBids,
      asks: mngoAsks,
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
      bids: rayBids,
      asks: rayAsks,
    });

    const [vaultSignerA] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_MNGO_USDC._decoded.ownAddress
    );
    const [vaultSignerB] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_RAY_USDC._decoded.ownAddress
    );
    marketMngoVaultSigner = vaultSignerA;
    marketRayVaultSigner = vaultSignerB;

    // CREATE FUND
    console.log("creating fund");

    let fundName = "DeFi Index";
    let fundSymbol = "DEFI";
    let num_assets = 2;
    assets = [
      {
        mint: MNGO_MINT.publicKey,
        market: MARKET_MNGO_USDC,
        vaultSigner: marketMngoVaultSigner,
        openOrders: openOrdersMngo.publicKey
      },
      {
        mint: RAY_MINT.publicKey,
        market: MARKET_RAY_USDC,
        vaultSigner: marketRayVaultSigner,
        openOrders: openOrdersRay.publicKey
      }
    ];
    let weights = [new anchor.BN(2), new anchor.BN(1)];
    let fundTokenDecimals = 6;
    [fundAddress, fundBump] = await utils.deriveFundAddress(
      program,
      manager.publicKey,
      fundName
    );
    fundUsdcAta = await serumAta.getAssociatedTokenAddress(fundAddress, USDC_MINT.publicKey);
    fundMngoAta = await serumAta.getAssociatedTokenAddress(fundAddress, MNGO_MINT.publicKey);
    fundRayAta = await serumAta.getAssociatedTokenAddress(fundAddress, RAY_MINT.publicKey);
    [fundTokenMint, mintBump] = await utils.deriveMintAddress(
      program,
      manager.publicKey,
      fundName
    );

    // mints, atas, markets, and open orders accs for underlying tokens
    let remainingAccounts = await utils.genRemainingCreateAccounts(fundAddress, assets);

    await program.rpc.createFund(utils.strToU8(fundName) as any,
                                 utils.strToU8(fundSymbol) as any,
                                 new anchor.BN(num_assets),
                                 weights,
                                //  new anchor.BN(fundBump),
                                //  new anchor.BN(mintBump),
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
          dexProgram: serumUtils.DEX_PID,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [openOrdersMngo, openOrdersRay, manager],
        remainingAccounts,
    });

    // make sure open orders account is now stored in the market account
    let oo = await MARKET_MNGO_USDC.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
    assert.equal(oo[0].address.toBase58(), openOrdersMngo.publicKey.toBase58());
    oo = await MARKET_RAY_USDC.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
    assert.equal(oo[0].address.toBase58(), openOrdersRay.publicKey.toBase58());

    // FUND USER
    let userUsdcAta = await USDC_MINT.getOrCreateAssociatedAccountInfo(user);
    let usdcAirdropAmount = utils.usdc(500);
    console.log(userUsdcAta.address.toBase58());
    await USDC_MINT.mintTo(userUsdcAta.address, mintOwner.publicKey, [], usdcAirdropAmount);

    // WRITE TO JSON
    let localAccounts = {
        // unused except for usdc mint
        marketMaker: MARKET_MAKER.account.publicKey,
        mintOwner: mintOwner.publicKey,
        USDC_MINT: USDC_MINT.publicKey,
        MNGO_MINT: MNGO_MINT.publicKey,
        RAY_MINT: RAY_MINT.publicKey,

        // necessary
        tokens: {
          [MNGO_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_MNGO_USDC._decoded.ownAddress,
            marketVaultSigner: marketMngoVaultSigner,
            openOrders: openOrdersMngo.publicKey,
            name: "MNGO",
            priceData: "mango-prices.json"
          },

          [RAY_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_RAY_USDC._decoded.ownAddress,
            marketVaultSigner: marketRayVaultSigner,
            openOrders: openOrdersRay.publicKey,
            name: "RAY",
            priceData: "raydium-prices.json"
          }
        }
    }
    let json = JSON.stringify(localAccounts);

    // console.log(JSON.stringify(json));
    fs.writeFileSync('./app/localAccounts.json', json);

    // 1644707104 1647126321
    // assets = [
    //   {
    //     mint: MNGO_MINT.publicKey,
    //     market: MARKET_MNGO_USDC,
    //     vaultSigner: marketMngoVaultSigner,
    //     openOrders: openOrdersMngo.publicKey
    //   },
    //   {
    //     mint: RAY_MINT.publicKey,
    //     market: MARKET_RAY_USDC,
    //     vaultSigner: marketRayVaultSigner,
    //     openOrders: openOrdersRay.publicKey
    //   }
    // ];

    // console.log(MARKET_MNGO_USDC);
    // for(let asset of assets) {
    //   let remainingAccounts = await utils.genRemainingBuyAccounts(fundAddress, asset);
    //   console.log(remainingAccounts);
    // }

  });

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
      bids: mngoBids,
      asks: mngoAsks,
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
      bids: rayBids,
      asks: rayAsks,
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
    assets = [
      {
        mint: MNGO_MINT.publicKey,
        market: MARKET_MNGO_USDC,
        vaultSigner: marketMngoVaultSigner,
        openOrders: openOrdersMngo.publicKey
      },
      {
        mint: RAY_MINT.publicKey,
        market: MARKET_RAY_USDC,
        vaultSigner: marketRayVaultSigner,
        openOrders: openOrdersRay.publicKey
      }
    ];
    let weights = [new anchor.BN(1), new anchor.BN(1)];
    let fundTokenDecimals = 6;
    [fundAddress, fundBump] = await utils.deriveFundAddress(
      program,
      manager.publicKey,
      fundName
    );
    fundUsdcAta = await serumAta.getAssociatedTokenAddress(fundAddress, USDC_MINT.publicKey);
    fundMngoAta = await serumAta.getAssociatedTokenAddress(fundAddress, MNGO_MINT.publicKey);
    fundRayAta = await serumAta.getAssociatedTokenAddress(fundAddress, RAY_MINT.publicKey);
    [fundTokenMint, mintBump] = await utils.deriveMintAddress(
      program,
      manager.publicKey,
      fundName
    );

    // mints, atas, markets, and open orders accs for underlying tokens
    let remainingAccounts = await utils.genRemainingCreateAccounts(fundAddress, assets);

    await program.rpc.createFund(utils.strToU8(fundName) as any,
                                 utils.strToU8(fundSymbol) as any,
                                 new anchor.BN(num_assets),
                                 weights,
                                //  new anchor.BN(fundBump),
                                //  new anchor.BN(mintBump),
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
          dexProgram: serumUtils.DEX_PID,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [openOrdersMngo, openOrdersRay, manager],
        remainingAccounts,
    });

    // make sure open orders account is now stored in the market account
    let oo = await MARKET_MNGO_USDC.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
    assert.equal(oo[0].address.toBase58(), openOrdersMngo.publicKey.toBase58());
    oo = await MARKET_RAY_USDC.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
    assert.equal(oo[0].address.toBase58(), openOrdersRay.publicKey.toBase58());
  });

  it('init buy data pda', async () => {
    buyer = anchor.web3.Keypair.generate();
    await utils.airdrop(program, buyer.publicKey, utils.lamports(5));

    // should already be init'ed or else sending usdc isnt possible
    buyerUsdcAta = await USDC_MINT.getOrCreateAssociatedAccountInfo(buyer.publicKey);
    // will be init'ed by the program
    buyerFundAta = await serumAta.getAssociatedTokenAddress(
      buyer.publicKey,
      fundTokenMint
    );

    usdcAirdropAmount = utils.usdc(500);
    await USDC_MINT.mintTo(buyerUsdcAta.address, mintOwner.publicKey, [], usdcAirdropAmount);

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);

    assert.equal(temp.amount, usdcAirdropAmount);

    buyAmount = utils.usdc(100);
    console.log("amount to buy: ", buyAmount);

    [buyDataAddress, buyDataBump] = await utils.deriveBuyDataAddress(
      program,
      fundAddress,
      buyer.publicKey,
    );

    await program.rpc.initBuyData(new anchor.BN(buyAmount), {
      accounts: {
        fund: fundAddress,
        buyData: buyDataAddress,
        buyer: buyer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [buyer]
    });

  });

  it('buy fund', async () => {

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    console.log("pre buy buyer usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundUsdcAta);
    console.log("pre buy fund usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundMngoAta);
    console.log("pre buy fund mngo: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundRayAta);
    console.log("pre buy fund ray: ", temp.uiAmount);

    for(let asset of assets){
      let remainingAccounts = await utils.genRemainingBuyAccounts(fundAddress, asset);

      await program.rpc.buyFund({
          accounts: {
            fund: fundAddress,
            fundUsdcAta: fundUsdcAta,
            indexTokenMint: fundTokenMint,
            buyer: buyer.publicKey,
            buyerUsdcAta: buyerUsdcAta.address,
            buyerIndexAta: buyerFundAta,
            buyData: buyDataAddress,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            associatedTokenProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            dexProgram: serumUtils.DEX_PID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [buyer],
          remainingAccounts,
      });
      console.log("bought an asset");
    }

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    console.log("post buy buyer usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundUsdcAta);
    console.log("post buy fund usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundMngoAta);
    console.log("post buy fund mngo: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundRayAta);
    console.log("post buy fund ray: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    // small margin of error
    // assert.ok(Math.abs((usdcAmount - amountToSpend) - temp.amount) < 100);

    temp = await utils.getTokenBalance(program, buyerFundAta);
    console.log("post buy index tokens: ", temp.uiAmount);

    assert.ok(temp.amount > 0);
  });

  it('init sell data pda', async () => {

    let heldFundTokens = await utils.getTokenBalance(program, buyerFundAta);
    sellAmount = heldFundTokens.amount;
    console.log("amount to sell: ", sellAmount);

    [sellDataAddress, sellDataBump] = await utils.deriveSellDataAddress(
      program,
      fundAddress,
      buyer.publicKey,
    );

    await program.rpc.initSellData(new anchor.BN(sellAmount), {
      accounts: {
        fund: fundAddress,
        sellData: sellDataAddress,
        seller: buyer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [buyer]
    });

  });

  it('sell fund', async () => {

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    console.log("pre sell buyer usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundUsdcAta);
    console.log("pre sell fund usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundMngoAta);
    console.log("pre sell fund mngo: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundRayAta);
    console.log("pre sell fund ray: ", temp.uiAmount);

    for(let asset of assets){
      let remainingAccounts = await utils.genRemainingBuyAccounts(fundAddress, asset);

      await program.rpc.sellFund({
          accounts: {
            fund: fundAddress,
            fundUsdcAta: fundUsdcAta,
            indexTokenMint: fundTokenMint,
            seller: buyer.publicKey,
            sellerUsdcAta: buyerUsdcAta.address,
            sellerIndexAta: buyerFundAta,
            sellData: sellDataAddress,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            associatedTokenProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            dexProgram: serumUtils.DEX_PID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [buyer],
          remainingAccounts
      });
      console.log("sold an asset");
    }

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    console.log("post sell buyer usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundUsdcAta);
    console.log("post sell fund usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundMngoAta);
    console.log("post sell fund mngo: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundRayAta);
    console.log("post sell fund ray: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, buyerFundAta);
    console.log("post sell index tokens: ", temp.uiAmount);
  });

  it('init buy data pda again', async () => {

    buyAmount = utils.usdc(200);
    console.log("amount to buy: ", buyAmount);

    [buyDataAddress, buyDataBump] = await utils.deriveBuyDataAddress(
      program,
      fundAddress,
      buyer.publicKey,
    );

    await program.rpc.initBuyData(new anchor.BN(buyAmount), {
      accounts: {
        fund: fundAddress,
        buyData: buyDataAddress,
        buyer: buyer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [buyer]
    });

  });

  it('buy fund again', async () => {

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    console.log("pre buy buyer usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundUsdcAta);
    console.log("pre buy fund usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundMngoAta);
    console.log("pre buy fund mngo: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundRayAta);
    console.log("pre buy fund ray: ", temp.uiAmount);

    for(let asset of assets){
      let remainingAccounts = await utils.genRemainingBuyAccounts(fundAddress, asset);

      await program.rpc.buyFund({
          accounts: {
            fund: fundAddress,
            fundUsdcAta: fundUsdcAta,
            indexTokenMint: fundTokenMint,
            buyer: buyer.publicKey,
            buyerUsdcAta: buyerUsdcAta.address,
            buyerIndexAta: buyerFundAta,
            buyData: buyDataAddress,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            associatedTokenProgram: serumAta.ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            dexProgram: serumUtils.DEX_PID,
            rent: web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [buyer],
          remainingAccounts,
      });
      console.log("bought an asset");
    }

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    console.log("post buy buyer usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundUsdcAta);
    console.log("post buy fund usdc: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundMngoAta);
    console.log("post buy fund mngo: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, fundRayAta);
    console.log("post buy fund ray: ", temp.uiAmount);

    temp = await utils.getTokenBalance(program, buyerUsdcAta.address);
    // small margin of error
    // assert.ok(Math.abs((usdcAmount - amountToSpend) - temp.amount) < 100);

    temp = await utils.getTokenBalance(program, buyerFundAta);
    console.log("post buy index tokens: ", temp.uiAmount);

    assert.ok(temp.amount > 0);
  });

  it('fetch fund', async () => {
    const fundAccounts = await program.account.fund.all();
    // console.log(fundAccounts[0].account);
    const buyDataAccounts = await program.account.buyData.all();
    // console.log(buyDataAccounts[0]);
    assert.equal(fundAccounts.length, 1);
  });

});