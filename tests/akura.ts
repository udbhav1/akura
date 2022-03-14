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
  let fundOrcaAta;
  let fundRayAta;
  let fundSrmAta;
  let fundWsolAta;
  let fundSlcAta;
  let fundAtlasAta;

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
  let ORCA_MINT;
  let RAY_MINT;
  let SRM_MINT;
  let WSOL_MINT;
  let SLC_MINT;
  let ATLAS_MINT;

  let MARKET_MNGO_USDC;
  let MARKET_ORCA_USDC;
  let MARKET_RAY_USDC;
  let MARKET_SRM_USDC;
  let MARKET_WSOL_USDC;
  let MARKET_SLC_USDC;
  let MARKET_ATLAS_USDC;

  let MARKET_MAKER;

  let marketMngoVaultSigner;
  let marketOrcaVaultSigner;
  let marketRayVaultSigner;
  let marketSrmVaultSigner;
  let marketWsolVaultSigner;
  let marketSlcVaultSigner;
  let marketAtlasVaultSigner;

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
  let openOrdersOrca = anchor.web3.Keypair.generate();
  let openOrdersRay = anchor.web3.Keypair.generate();
  let openOrdersSrm = anchor.web3.Keypair.generate();
  let openOrdersWsol = anchor.web3.Keypair.generate();
  let openOrdersSlc = anchor.web3.Keypair.generate();
  let openOrdersAtlas = anchor.web3.Keypair.generate();

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
    ORCA_MINT = await splToken.Token.createMint(
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
    SRM_MINT = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );
    WSOL_MINT = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );
    SLC_MINT = await splToken.Token.createMint(
      program.provider.connection,
      mintOwner,
      mintOwner.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    );
    ATLAS_MINT = await splToken.Token.createMint(
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

    let marketMakerOrca = await ORCA_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await ORCA_MINT.mintTo(marketMakerOrca.address, mintOwner.publicKey, [], utils.usdc(10000));

    let marketMakerRay = await RAY_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await RAY_MINT.mintTo(marketMakerRay.address, mintOwner.publicKey, [], utils.usdc(10000));

    let marketMakerSrm = await SRM_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await SRM_MINT.mintTo(marketMakerSrm.address, mintOwner.publicKey, [], utils.usdc(10000));

    let marketMakerWsol = await WSOL_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await WSOL_MINT.mintTo(marketMakerWsol.address, mintOwner.publicKey, [], utils.usdc(10000));

    let marketMakerSlc = await SLC_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await SLC_MINT.mintTo(marketMakerSlc.address, mintOwner.publicKey, [], utils.usdc(10000));

    let marketMakerAtlas = await ATLAS_MINT.getOrCreateAssociatedAccountInfo(marketMaker.publicKey);
    await ATLAS_MINT.mintTo(marketMakerAtlas.address, mintOwner.publicKey, [], utils.usdc(10000));

    MARKET_MAKER = {
      account: marketMaker,
      usdc: marketMakerUsdc,
      mngo: marketMakerMngo,
      orca: marketMakerOrca,
      ray: marketMakerRay,
      srm: marketMakerSrm,
      wsol: marketMakerWsol,
      slc: marketMakerSlc,
      atlas: marketMakerAtlas
    };

    console.log("setting up mngo/usdc market...");
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

    console.log("setting up orca/usdc market...");
    MARKET_ORCA_USDC = await serumUtils.setupMarket({
      provider: program.provider,
      baseMint: ORCA_MINT.publicKey,
      quoteMint: USDC_MINT.publicKey,
      marketMaker: {
        account: MARKET_MAKER.account,
        baseToken: MARKET_MAKER.orca.address,
        quoteToken: MARKET_MAKER.usdc.address,
      },
      bids: mngoBids,
      asks: mngoAsks,
    });

    console.log("setting up ray/usdc market...");
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

    console.log("setting up srm/usdc market...");
    MARKET_SRM_USDC = await serumUtils.setupMarket({
      provider: program.provider,
      baseMint: SRM_MINT.publicKey,
      quoteMint: USDC_MINT.publicKey,
      marketMaker: {
        account: MARKET_MAKER.account,
        baseToken: MARKET_MAKER.srm.address,
        quoteToken: MARKET_MAKER.usdc.address,
      },
      bids: mngoBids,
      asks: mngoAsks,
    });

    console.log("setting up wsol/usdc market...");
    MARKET_WSOL_USDC = await serumUtils.setupMarket({
      provider: program.provider,
      baseMint: WSOL_MINT.publicKey,
      quoteMint: USDC_MINT.publicKey,
      marketMaker: {
        account: MARKET_MAKER.account,
        baseToken: MARKET_MAKER.wsol.address,
        quoteToken: MARKET_MAKER.usdc.address,
      },
      bids: mngoBids,
      asks: mngoAsks,
    });

    console.log("setting up slc/usdc market...");
    MARKET_SLC_USDC = await serumUtils.setupMarket({
      provider: program.provider,
      baseMint: SLC_MINT.publicKey,
      quoteMint: USDC_MINT.publicKey,
      marketMaker: {
        account: MARKET_MAKER.account,
        baseToken: MARKET_MAKER.slc.address,
        quoteToken: MARKET_MAKER.usdc.address,
      },
      bids: mngoBids,
      asks: mngoAsks,
    });

    console.log("setting up atlas/usdc market...");
    MARKET_ATLAS_USDC = await serumUtils.setupMarket({
      provider: program.provider,
      baseMint: ATLAS_MINT.publicKey,
      quoteMint: USDC_MINT.publicKey,
      marketMaker: {
        account: MARKET_MAKER.account,
        baseToken: MARKET_MAKER.atlas.address,
        quoteToken: MARKET_MAKER.usdc.address,
      },
      bids: mngoBids,
      asks: mngoAsks,
    });

    const [vaultSignerA] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_MNGO_USDC._decoded.ownAddress
    );
    const [vaultSignerB] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_ORCA_USDC._decoded.ownAddress
    );
    const [vaultSignerC] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_RAY_USDC._decoded.ownAddress
    );
    const [vaultSignerD] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_SRM_USDC._decoded.ownAddress
    );
    const [vaultSignerE] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_WSOL_USDC._decoded.ownAddress
    );
    const [vaultSignerF] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_SLC_USDC._decoded.ownAddress
    );
    const [vaultSignerG] = await serumUtils.getVaultOwnerAndNonce(
      MARKET_ATLAS_USDC._decoded.ownAddress
    );
    marketMngoVaultSigner = vaultSignerA;
    marketOrcaVaultSigner = vaultSignerB;
    marketRayVaultSigner = vaultSignerC;
    marketSrmVaultSigner = vaultSignerD;
    marketWsolVaultSigner = vaultSignerE;
    marketSlcVaultSigner = vaultSignerF;
    marketAtlasVaultSigner = vaultSignerG;

    // CREATE FUNDS
    console.log("creating starter index funds...");

    let fundName = "DeFi Index";
    let fundSymbol = "DEFI";
    let num_assets = 3;
    assets = [
      {
        mint: MNGO_MINT.publicKey,
        market: MARKET_MNGO_USDC,
        vaultSigner: marketMngoVaultSigner,
        openOrders: openOrdersMngo.publicKey
      },
      {
        mint: ORCA_MINT.publicKey,
        market: MARKET_ORCA_USDC,
        vaultSigner: marketOrcaVaultSigner,
        openOrders: openOrdersOrca.publicKey
      },
      // {
      //   mint: RAY_MINT.publicKey,
      //   market: MARKET_RAY_USDC,
      //   vaultSigner: marketRayVaultSigner,
      //   openOrders: openOrdersRay.publicKey
      // },
      {
        mint: SRM_MINT.publicKey,
        market: MARKET_SRM_USDC,
        vaultSigner: marketSrmVaultSigner,
        openOrders: openOrdersSrm.publicKey
      },
    ];
    let weights = [new anchor.BN(55), new anchor.BN(30), new anchor.BN(15)];
    let fundTokenDecimals = 6;
    [fundAddress, fundBump] = await utils.deriveFundAddress(
      program,
      manager.publicKey,
      fundName
    );

    fundUsdcAta = await serumAta.getAssociatedTokenAddress(fundAddress, USDC_MINT.publicKey);
    fundMngoAta = await serumAta.getAssociatedTokenAddress(fundAddress, MNGO_MINT.publicKey);
    fundOrcaAta = await serumAta.getAssociatedTokenAddress(fundAddress, ORCA_MINT.publicKey);
    fundRayAta = await serumAta.getAssociatedTokenAddress(fundAddress, RAY_MINT.publicKey);
    fundSrmAta = await serumAta.getAssociatedTokenAddress(fundAddress, SRM_MINT.publicKey);

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
        signers: [openOrdersMngo, openOrdersOrca, openOrdersSrm, manager],
        remainingAccounts,
    });

    fundName = "Metaverse Index";
    fundSymbol = "MVRS";
    num_assets = 3;
    assets = [
      {
        mint: ATLAS_MINT.publicKey,
        market: MARKET_ATLAS_USDC,
        vaultSigner: marketAtlasVaultSigner,
        openOrders: openOrdersAtlas.publicKey
      },
      {
        mint: SLC_MINT.publicKey,
        market: MARKET_SLC_USDC,
        vaultSigner: marketSlcVaultSigner,
        openOrders: openOrdersSlc.publicKey
      },
      {
        mint: WSOL_MINT.publicKey,
        market: MARKET_WSOL_USDC,
        vaultSigner: marketWsolVaultSigner,
        openOrders: openOrdersWsol.publicKey
      },
    ];
    weights = [new anchor.BN(40), new anchor.BN(40), new anchor.BN(20)];
    fundTokenDecimals = 6;
    [fundAddress, fundBump] = await utils.deriveFundAddress(
      program,
      manager.publicKey,
      fundName
    );

    fundUsdcAta = await serumAta.getAssociatedTokenAddress(fundAddress, USDC_MINT.publicKey);
    fundMngoAta = await serumAta.getAssociatedTokenAddress(fundAddress, MNGO_MINT.publicKey);
    fundOrcaAta = await serumAta.getAssociatedTokenAddress(fundAddress, ORCA_MINT.publicKey);
    fundRayAta = await serumAta.getAssociatedTokenAddress(fundAddress, RAY_MINT.publicKey);
    fundSrmAta = await serumAta.getAssociatedTokenAddress(fundAddress, SRM_MINT.publicKey);

    [fundTokenMint, mintBump] = await utils.deriveMintAddress(
      program,
      manager.publicKey,
      fundName
    );

    // mints, atas, markets, and open orders accs for underlying tokens
    remainingAccounts = await utils.genRemainingCreateAccounts(fundAddress, assets);

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
        signers: [openOrdersWsol, openOrdersAtlas, openOrdersSlc, manager],
        remainingAccounts,
    });

    // make sure open orders account is now stored in the market account
    // let oo = await MARKET_MNGO_USDC.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
    // assert.equal(oo[0].address.toBase58(), openOrdersMngo.publicKey.toBase58());
    // oo = await MARKET_RAY_USDC.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
    // assert.equal(oo[0].address.toBase58(), openOrdersRay.publicKey.toBase58());

    // FUND USER
    let userUsdcAta = await USDC_MINT.getOrCreateAssociatedAccountInfo(user);
    let usdcAirdropAmount = utils.usdc(500);
    await USDC_MINT.mintTo(userUsdcAta.address, mintOwner.publicKey, [], usdcAirdropAmount);

    // WRITE TO JSON
    let localAccounts = {
        // unused except for usdc mint
        marketMaker: MARKET_MAKER.account.publicKey,
        mintOwner: mintOwner.publicKey,
        USDC_MINT: USDC_MINT.publicKey,
        // MNGO_MINT: MNGO_MINT.publicKey,
        // RAY_MINT: RAY_MINT.publicKey,

        // necessary
        tokens: {
          [MNGO_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_MNGO_USDC._decoded.ownAddress,
            marketVaultSigner: marketMngoVaultSigner,
            openOrders: openOrdersMngo.publicKey,
            name: "MNGO",
            priceData: "mango-prices.json"
          },

          [ORCA_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_ORCA_USDC._decoded.ownAddress,
            marketVaultSigner: marketOrcaVaultSigner,
            openOrders: openOrdersOrca.publicKey,
            name: "ORCA",
            priceData: "orca-prices.json"
          },

          [RAY_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_RAY_USDC._decoded.ownAddress,
            marketVaultSigner: marketRayVaultSigner,
            openOrders: openOrdersRay.publicKey,
            name: "RAY",
            priceData: "raydium-prices.json"
          },

          [SRM_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_SRM_USDC._decoded.ownAddress,
            marketVaultSigner: marketSrmVaultSigner,
            openOrders: openOrdersSrm.publicKey,
            name: "SRM",
            priceData: "serum-prices.json"
          },

          [WSOL_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_WSOL_USDC._decoded.ownAddress,
            marketVaultSigner: marketWsolVaultSigner,
            openOrders: openOrdersWsol.publicKey,
            name: "WSOL",
            priceData: "solana-prices.json"
          },

          [SLC_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_SLC_USDC._decoded.ownAddress,
            marketVaultSigner: marketSlcVaultSigner,
            openOrders: openOrdersSlc.publicKey,
            name: "SLC",
            priceData: "solice-prices.json"
          },

          [ATLAS_MINT.publicKey.toBase58()]: {
            MARKET_ADDRESS: MARKET_ATLAS_USDC._decoded.ownAddress,
            marketVaultSigner: marketAtlasVaultSigner,
            openOrders: openOrdersAtlas.publicKey,
            name: "ATLAS",
            priceData: "staratlas-prices.json"
          },
        }
    }
    let json = JSON.stringify(localAccounts);

    // console.log(JSON.stringify(json));
    fs.writeFileSync('./app/localAccounts.json', json);

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