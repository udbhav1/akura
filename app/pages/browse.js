import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Link from "next/link";
import Navbar from "../components/Navbar"
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction, Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import React, { useState, useEffect } from 'react';

import idl from '../public/idl.json';
import localAccounts from '../localAccounts.json';
import mangoPrices from '../public/prices/mango-prices.json';
import orcaPrices from '../public/prices/orca-prices.json';
import raydiumPrices from '../public/prices/raydium-prices.json';
import serumPrices from '../public/prices/serum-prices.json';
import solanaPrices from '../public/prices/solana-prices.json';
import solicePrices from '../public/prices/solice-prices.json';
import staratlasPrices from '../public/prices/staratlas-prices.json';

let tokenToPrice = {}
let tokenToName = {}
let nameToToken = {}
let nameToImage = {}

for(let token in localAccounts.tokens){
  let address = token;
  let name = localAccounts.tokens[token].name;
  tokenToName[address] = name;
  nameToToken[name] = address;
  switch(name) {
    case "MNGO":
      tokenToPrice[address] = mangoPrices.prices;
      nameToImage[name] = "/tokenLogos/mangoLogo.png";
    break;
    case "ORCA":
      tokenToPrice[address] = orcaPrices.prices;
      nameToImage[name] = "/tokenLogos/orcaLogo.svg";
    break;
    case "RAY":
      tokenToPrice[address] = raydiumPrices.prices;
      nameToImage[name] = "/tokenLogos/raydiumLogo.png";
    break;
    case "SRM":
      tokenToPrice[address] = serumPrices.prices;
      nameToImage[name] = "/tokenLogos/serumLogo.png";
    break;
    case "WSOL":
      tokenToPrice[address] = solanaPrices.prices;
      nameToImage[name] = "/tokenLogos/solanaLogo.png";
    break;
    case "SLC":
      tokenToPrice[address] = solicePrices.prices;
      nameToImage[name] = "/tokenLogos/soliceLogo.png";
    break;
    case "ATLAS":
      tokenToPrice[address] = staratlasPrices.prices;
      nameToImage[name] = "/tokenLogos/staratlasLogo.png";
    break;
  }
}
// console.log(tokenToPrice);
// console.log(tokenToName);
// console.log(nameToToken);

const utils = require("../utils");

const programID = new PublicKey(idl.metadata.address);
const opts = {
  preflightCommitment: "processed"
}

export default function Browse() {
  let provider = null;

  const anchorWallet = useAnchorWallet();
  const [funds, setFunds] = useState([]);
  const [fetchedFunds, setFetchedFunds] = useState(false);
  const [userUsdc, setUserUsdc] = useState(0);
  const [userMngo, setUserMngo] = useState(0);
  const [userRay, setUserRay] = useState(0);

  async function getProvider() {
    if(provider == null) {
      const network = "http://127.0.0.1:8899";
      const connection = new Connection(network, Provider.defaultOptions().commitment);

      provider = new Provider(connection, anchorWallet, Provider.defaultOptions());
    }
    return provider;
  }

  async function findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
    const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
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

  function normalizeOnFirst(priceHistory) {
    let arr = [];
    let base = priceHistory[0][1];
    for(let step of priceHistory){
      let [ts, val] = step;
      arr.push([ts, val/base]);
    }
    return arr;
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
    }

    if(anchorWallet) {
      getBalances()
    } else {
      setUserUsdc(0);
      setUserMngo(0);
      setUserRay(0);
    }
  }, [anchorWallet]);

  useEffect(() => {
    const getFunds = async () => {
      let userPublicKey = anchorWallet.publicKey;
      const provider = await getProvider();
      const program = new Program(idl, programID, provider);

      const fundAccounts = await program.account.fund.all();
      let processed = [];

      for(let fund of fundAccounts){

        // get last price of fund relative to starting price
        let fundAccount = fund.account;
        let totalWeight = fundAccount.weights.reduce(
          (prev, current) => prev + current.toNumber(),
          0
        );
        let fundPrices = [];
        let first = true;
        let minL = Math.pow(10, 1000);
        for(let i = 0; i < fundAccount.numAssets; i++){
          let address = fundAccount.assets[i].toBase58();
          let weight = fundAccount.weights[i].toNumber();
          let priceHistory = normalizeOnFirst(tokenToPrice[address]);
          minL = Math.min(minL, priceHistory.length);
          for(let j = 0; j < minL; j++){
            let [ts, val] = priceHistory[j];
            if(first){
              fundPrices.push([ts, val*(weight/totalWeight)])
            } else {
              fundPrices[j][1] += val*(weight/totalWeight)
            }
          }
          if(first){ first = false }
        }
        fundPrices = fundPrices.slice(0, minL);
        let currentVal = fundPrices[fundPrices.length-1][1];

        let s = {
          publicKey: fund.publicKey,
          assets: fund.account.assets.slice(0, fund.account.numAssets),
          weights: fund.account.weights.slice(0, fund.account.numAssets),
          numAssets: fund.account.numAssets,
          indexTokenMint: fund.account.indexTokenMint,
          indexTokenSupply: fund.account.indexTokenSupply,
          manager: fund.account.manager,
          name: utils.u8ToStr(fund.account.name).replace(/\0.*$/g,''),
          symbol: utils.u8ToStr(fund.account.symbol).replace(/\0.*$/g,''),
          currentPrice: currentVal,
        }
        processed.push(s);
      }

      setFunds(processed);
      setFetchedFunds(true);
    }

    if(anchorWallet != undefined && !fetchedFunds) {
      console.log("anchor wallet connected");
      getFunds();
    } else if (anchorWallet == undefined) {
      console.log("anchor wallet disconnected");
    }
  }, [anchorWallet]);

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
          <div className="fundsContainer">
            <h1>Featured Funds</h1>
            {funds.map((fund, index) =>
              <Link href={`/fund/${encodeURIComponent(fund.publicKey)}`} key={index}>
                <div className="fund">
                  <div className="fundName">
                    <a><strong>{fund.name}</strong></a>
                  </div>
                  <div className="fundSupply">
                    <a style={{fontSize: "18px"}}>
                      <strong>
                      ${(fund.indexTokenSupply/(10**6)).toFixed(2)}
                      </strong>
                    </a>
                    <a style={{fontSize: "13px", color: "#aaa"}}>Deposited</a>
                  </div>
                  <div className="fundPerformance">
                    {fund.currentPrice < 1 &&
                      <a style={{color: "red"}}><strong>-{(100*(1 - fund.currentPrice)).toFixed(2)}%</strong></a>
                    }
                    {fund.currentPrice > 1 &&
                      <a style={{color: "green"}}><strong>+{(100*(fund.currentPrice-1)).toFixed(2)}%</strong></a>
                    }
                    <a style={{fontSize: "13px", color: "#aaa"}}>Since Inception</a>
                  </div>
                  <div className="fundAssets">
                    {fund.assets.map((asset, index) =>
                      <div className="fundAsset" key={fund.publicKey.toBase58() + asset.toBase58()}>
                        <div className="logoContainer">
                          <img src={nameToImage[tokenToName[asset.toBase58()]]} />
                        </div>
                        <div className="nameContainer">
                          <a><strong>{tokenToName[asset.toBase58()]}</strong></a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div style={{textAlign: "center", marginTop: "10%"}}>
          <h1>Connect Wallet to Browse Funds</h1>
        </div>
      )}

      <div className="spacer"></div>

      <footer className={styles.footer}>
      </footer>
    </div>
  )
}