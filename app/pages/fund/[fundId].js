import Head from 'next/head'
import styles from '../../styles/Home.module.css'
import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar"
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Connection, PublicKey, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import { Market } from '@project-serum/serum';
import * as splToken from '@solana/spl-token';
import idl from '../../public/idl.json';
import localAccounts from '../../localAccounts.json';
import React, { useState, useEffect, useCallback } from 'react';
import { setConstantValue } from 'typescript';

const utils = require("../../utils");
const serumUtils = require("../../serumUtils");

const programID = new PublicKey(idl.metadata.address);
const opts = {
  preflightCommitment: "processed"
}
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export default function Fund() {
  const router = useRouter();
  const { fundId } = router.query;
  const anchorWallet = useAnchorWallet();
  const [fundData, setFundData] = useState(null);
  const [userUsdc, setUserUsdc] = useState(0);
  const [userMngo, setUserMngo] = useState(0);
  const [userRay, setUserRay] = useState(0);
  const [userFund, setUserFund] = useState(0);
  const [traded, setTraded] = useState(0);

  function timestampToDate(ts) {
    let date = new Date(ts*1000);
    console.log(date);
  }

  async function getProvider() {
    const network = "http://127.0.0.1:8899";
    const connection = new Connection(network, Provider.defaultOptions().commitment);

    const provider = new Provider(connection, anchorWallet, Provider.defaultOptions());
    return provider;
  }

  async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
    return (await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        splToken.TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    ))[0];
  }

  async function getTokenAmount(program, wallet, mintKey) {
    let ata = await findAssociatedTokenAddress(wallet, mintKey);
    let amount;
    try {
      amount = await utils.getTokenBalance(program, ata);
    } catch (err) {
      console.log("getTokenBalance error: ", err);
      return 0;
    }
    return amount.uiAmount;
  }

  useEffect(() => {
    const getBalances = async () => {
      let userPublicKey = anchorWallet.publicKey;
      const provider = await getProvider();
      const program = new Program(idl, programID, provider);

      let usdcMint = new PublicKey(localAccounts.USDC_MINT);
      let usdc = await getTokenAmount(program, userPublicKey, usdcMint);
      setUserUsdc(usdc);

      // let mngoMint = new PublicKey(localAccounts.MNGO_MINT);
      // let mngo = await getTokenAmount(program, userPublicKey, mngoMint);
      // setUserMngo(mngo);

      // let rayMint = new PublicKey(localAccounts.RAY_MINT);
      // let ray = await getTokenAmount(program, userPublicKey, rayMint);
      // setUserRay(ray);

      if(fundData != null){
        let fundMint = fundData.indexTokenMint;
        let fundTokens = await getTokenAmount(program, userPublicKey, fundMint);
        setUserFund(fundTokens);
      } else {
        setUserFund(0);
      }
    }

    if(anchorWallet) {
      getBalances()
    } else {
      setUserUsdc(0);
      setUserMngo(0);
      setUserRay(0);
    }
  }, [anchorWallet, fundData, traded]);

  useEffect(() => {
    const getFund = async () => {
      const provider = await getProvider();
      const program = new Program(idl, programID, provider);

      let fundAddress = new PublicKey(fundId);

      let fundAccount = await program.account.fund.fetch(fundAddress);
      console.log("useEffect fund account", fundAccount)

      setFundData(fundData => ({
        publicKey: fundAddress,
        assets: fundAccount.assets,
        weights: fundAccount.weights,
        indexTokenMint: fundAccount.indexTokenMint,
        indexTokenSupply: fundAccount.indexTokenSupply,
        genesis: fundAccount.genesis,
        manager: fundAccount.manager,
        name: utils.u8ToStr(fundAccount.name).replace(/\0.*$/g,''),
        symbol: utils.u8ToStr(fundAccount.symbol).replace(/\0.*$/g,''),
      }));
    }

    if(anchorWallet != undefined) {
      // console.log("anchor wallet connected");
      getFund()
    } else {
      // console.log("anchor wallet disconnected");
    }
  }, [traded]);

  async function findBuyData(program, userPublicKey) {
    let buyDataAccounts = await program.account.buyData.all();
    for(let acc of buyDataAccounts) {
      if(userPublicKey.toBase58() == acc.account.buyer.toBase58()){
        return acc;
      }
    }
  }

  async function fetchMarket(program, address) {
    let marketAddress = new PublicKey(address);
    let market = await Market.load(program.provider.connection, marketAddress, {}, serumUtils.DEX_PID);
    return market;
  }

  async function initBuyData(program, userPublicKey) {
    try {
      let buyAmount = utils.usdc(100);
      console.log("amount to buy: ", buyAmount);

      let fundAddress = new PublicKey(fundId);

      let [buyDataAddress, buyDataBump] = await utils.deriveBuyDataAddress(
          program,
          fundAddress,
          userPublicKey,
      );

      await program.rpc.initBuyData(new BN(buyAmount), {
          accounts: {
              fund: fundAddress,
              buyData: buyDataAddress,
              buyer: userPublicKey,
              systemProgram: SystemProgram.programId,
          },
          signers: []
      });

    } catch (err) {
        console.log("Transaction error: ", err);
    }
  }

  async function buyFund(program, userPublicKey, remainingAccounts) {
    let fundAddress = new PublicKey(fundId);
    let usdcMint = new PublicKey(localAccounts.USDC_MINT);
    let fundUsdcAta = await findAssociatedTokenAddress(fundAddress, usdcMint);
    let fundTokenMint = fundData.indexTokenMint;
    let buyerUsdcAta = await findAssociatedTokenAddress(userPublicKey, usdcMint);
    let buyerIndexAta = await findAssociatedTokenAddress(userPublicKey, fundTokenMint);
    let buyData = await findBuyData(program, userPublicKey);

    try {
      await program.rpc.buyFund({
        accounts: {
          fund: fundAddress,
          fundUsdcAta: fundUsdcAta,
          indexTokenMint: fundTokenMint,
          buyer: userPublicKey,
          buyerUsdcAta: buyerUsdcAta,
          buyerIndexAta: buyerIndexAta,
          buyData: buyData.publicKey,
          tokenProgram: splToken.TOKEN_PROGRAM_ID,
          associatedTokenProgram: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          dexProgram: serumUtils.DEX_PID,
          rent: SYSVAR_RENT_PUBKEY,
        },
        signers: [],
        remainingAccounts,
      });
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  async function initAndBuy() {
    if (!anchorWallet) throw new WalletNotConnectedError();

    let userPublicKey = anchorWallet.publicKey;
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);

    await initBuyData(program, userPublicKey);

    console.log("inited buy account");

    let fundAddress = new PublicKey(fundId);
    let assets = [
      {
        mint: new PublicKey(localAccounts.MNGO_MINT),
        market: await fetchMarket(program, localAccounts.MARKET_MNGO_USDC),
        vaultSigner: new PublicKey(localAccounts.marketMngoVaultSigner),
        openOrders: new PublicKey(localAccounts.openOrdersMngo)
      },
      {
        mint: new PublicKey(localAccounts.RAY_MINT),
        market: await fetchMarket(program, localAccounts.MARKET_RAY_USDC),
        vaultSigner: new PublicKey(localAccounts.marketRayVaultSigner),
        openOrders: new PublicKey(localAccounts.openOrdersRay)
      }
    ];
    for(let asset of assets) {
      console.log("buying asset", asset);
      let remainingAccounts = await utils.genRemainingBuyAccounts(fundAddress, asset);
      await buyFund(program, userPublicKey, remainingAccounts);
    }

    setTraded(traded+1);
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Akura</title>
        <meta name="description" content="Akura Protocol" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />

      {anchorWallet ? (
        <div>
          <p>{userUsdc} USDC, {userFund} fund tokens</p>
          {fundData &&
            <div>
              <div className="fundHeader">
                <h1>{fundData.name} ({fundData.symbol})</h1>
                <div className="buyButtonContainer">
                  <button onClick={initAndBuy} disabled={!anchorWallet}>
                    BUY
                  </button>
                  <button onClick={initAndBuy} disabled={!anchorWallet}>
                    SELL
                  </button>
                </div>
              </div>
              <div className="fundInfoHeader">
                <p>TVL: ${(fundData.indexTokenSupply.toNumber()/(10**6)).toFixed(2)}</p>
                <p>Token Address: {fundData.indexTokenMint.toBase58()}</p>
              </div>
              <div className="priceHistory"></div>
            </div>
          }
        </div>
      ) : (
        <div style={{textAlign: "center", marginTop: "10%"}}>
          <h1>Connect Wallet to View Fund</h1>
        </div>
      )}

      <p>PID: {fundId}</p>

      <footer className={styles.footer}>
      </footer>
    </div>
  )
}