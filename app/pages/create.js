import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useRouter } from "next/router";
import Navbar from "../components/Navbar"
import { EventEmitter, WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Connection, PublicKey, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import { Market } from '@project-serum/serum';
import * as splToken from '@solana/spl-token';
import { Tooltip, PieChart, Pie, Cell } from 'recharts';
import Modal from 'react-modal';
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

const COLORS = ['#6a0dad', '#0088FE', '#900000', '#FFBB28', '#50C878', '#FF8042', '#00008b'];

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

let defaultTokenWeight = {}

for(let token in localAccounts.tokens){
    defaultTokenWeight[token] = 0;
}

defaultTokenWeight[nameToToken["WSOL"]] = 1;
// console.log(tokenToPrice);
// console.log(tokenToName);
// console.log(nameToToken);

const utils = require("../utils");
const serumUtils = require("../serumUtils");

const programID = new PublicKey(idl.metadata.address);
const opts = {
  preflightCommitment: "processed"
}
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export default function Fund() {
    const router = useRouter();
    const anchorWallet = useAnchorWallet();
    const [tokenWeight, setTokenWeight] = useState(defaultTokenWeight);
    const [fundName, setFundName] = useState("");
    const [fundSymbol, setFundSymbol] = useState("");

    async function getProvider() {
      const network = "http://127.0.0.1:8899";
      const connection = new Connection(network, Provider.defaultOptions().commitment);
    
      const provider = new Provider(connection, anchorWallet, Provider.defaultOptions());
      return provider;
    }

    function chartData(weights) {
      let res = [];
      let totalWeight = Object.values(weights).reduce((a, b) => a + b);
      for(let key in weights){
          res.push({
              address: key,
              name: tokenToName[key],
              weight: weights[key]/totalWeight
          })
      }
      return res;
    }

    async function fetchMarket(program, address) {
        let marketAddress = new PublicKey(address);
        let market = await Market.load(program.provider.connection, marketAddress, {}, serumUtils.DEX_PID);
        return market;
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

    async function createFund() {
      if (!anchorWallet) throw new WalletNotConnectedError();

      let userPublicKey = anchorWallet.publicKey;
      const provider = await getProvider();
      const program = new Program(idl, programID, provider);

      try {
        let assetsSelected = [];
        let weights = []
        let openOrders = [];
        for(let key in tokenWeight){
            if(tokenWeight[key] > 0) {
                assetsSelected.push(key);
                weights.push(new BN(tokenWeight[key]));
                let t = web3.Keypair.generate();
                openOrders.push(t);
            }
        }

        let numAssets = assetsSelected.length;

        let assets = [];
        for(let i = 0; i < numAssets; i++){
            let localData = localAccounts.tokens[assetsSelected[i]];
            let market = await fetchMarket(program, localData["MARKET_ADDRESS"]);
            let mint = assetsSelected[i];
            let vaultSigner = localData.marketVaultSigner;
            let openOrdersKeypair = openOrders[i];
            assets.push({
              mint: new PublicKey(mint),
              market: market,
              vaultSigner: new PublicKey(vaultSigner),
              openOrders: openOrdersKeypair.publicKey,
            })
        }

        let fundAddress, fundBump;
        [fundAddress, fundBump] = await utils.deriveFundAddress(
            program,
            userPublicKey,
            fundName
        );

        let fundTokenMint, mintBump;
        [fundTokenMint, mintBump] = await utils.deriveMintAddress(
            program,
            userPublicKey,
            fundName
        );

        let fundTokenDecimals = 6;

        let usdcMint = new PublicKey(localAccounts.USDC_MINT);
        let fundUsdcAta = await findAssociatedTokenAddress(fundAddress, usdcMint);

        let remainingAccounts = await utils.genRemainingCreateAccounts(fundAddress, assets);

        await program.rpc.createFund(utils.strToU8(fundName),
                                    utils.strToU8(fundSymbol),
                                    new BN(numAssets),
                                    weights,
                                    new BN(fundTokenDecimals), {
          accounts: {
            fund: fundAddress,
            fundUsdcAta: fundUsdcAta,
            manager: userPublicKey,
            indexTokenMint: fundTokenMint,
            usdcMint: usdcMint,
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            associatedTokenProgram: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            dexProgram: serumUtils.DEX_PID,
            rent: SYSVAR_RENT_PUBKEY,
          },
          signers: openOrders,
          remainingAccounts,
        });

        // then redirect to fund page
        router.push("/fund/" + fundAddress);

      } catch (err) {
        console.log("Transaction error: ", err);
      }

    }

    function handleTextChange(event) {
      if(event.target.name == "fundName"){
          setFundName(event.target.value);
      } else if(event.target.name =="fundSymbol"){
          setFundSymbol(event.target.value);
      }
    }

    function handleWeightChange(event) {
      if(event.target.value == "" || parseInt(event.target.value) < 0){
        setTokenWeight(old => ({
            ...old,
            [event.target.name]: 0
        }))
      } else {
        setTokenWeight(old => ({
            ...old,
            [event.target.name]: parseInt(event.target.value)
        }))
      }
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
            <div className="createContainer">
                <div className="createFundInfo">
                    <div className="nameContainer">
                        <a><strong>Fund Name:</strong></a>
                        <input type="text" name="fundName" className="nameInput" onChange={handleTextChange} />
                    </div>
                    <div className="symbolContainer">
                        <a><strong>Fund Symbol:</strong></a>
                        <input type="text" name="fundSymbol" className="symbolInput" onChange={handleTextChange} />
                    </div>
                </div> 
                <div className="createTokenList">
                    <form>
                        {
                            Object.entries(tokenToName).map((entry, index) => (
                                <div key={entry[0]} className="tokenEntry">
                                    <div className="logoContainer">
                                        <img src={nameToImage[entry[1]]}/>
                                    </div>
                                    <div className="nameContainer">
                                        <a><strong>{entry[1]}</strong></a>
                                    </div>
                                    <input type="number" name={entry[0]} value={tokenWeight[entry[0]]} className="numInput" onChange={handleWeightChange} />
                                </div>
                            ))   
                        }
                    </form>
                </div>
                <div className="chartPreview">
                    <PieChart width={500} height={500} style={{margin: "auto"}}>
                    <Pie
                        data={chartData(tokenWeight)}
                        innerRadius={120}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="weight"
                        nameKey="name"
                        startAngle={0}
                        stroke="none"
                    >
                        {chartData(tokenWeight).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => (value*100).toFixed(2).toString() + "%"} />
                    </PieChart>
                </div>
                <div className="createButtonContainer">
                  <button className="createButton" onClick={createFund}>CREATE</button>
                </div>
            </div>
          ) : (
            <div style={{textAlign: "center", marginTop: "10%"}}>
              <h1>Connect Wallet to Create Fund</h1>
            </div>
          )}

          <div className="spacer"></div>

          <footer className={styles.footer}>
          </footer>
        </div>
    )
}