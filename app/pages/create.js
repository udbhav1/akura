import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar"
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Connection, PublicKey, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import { Market } from '@project-serum/serum';
import * as splToken from '@solana/spl-token';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
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

const COLORS = ['#0088FE', '#900000', '#FFBB28', '#FF8042'];

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
const serumUtils = require("../serumUtils");

const programID = new PublicKey(idl.metadata.address);
const opts = {
  preflightCommitment: "processed"
}
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export default function Fund() {

    const anchorWallet = useAnchorWallet();
    const [userUsdc, setUserUsdc] = useState(0);
    const [traded, setTraded] = useState(0);

    async function getProvider() {
      const network = "http://127.0.0.1:8899";
      const connection = new Connection(network, Provider.defaultOptions().commitment);
    
      const provider = new Provider(connection, anchorWallet, Provider.defaultOptions());
      return provider;
    }

    return (
        <div className={styles.container}>
          <Head>
            <title>Akura</title>
            <meta name="description" content="Akura Protocol" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
    
          <Navbar />
        </div>
    )
}