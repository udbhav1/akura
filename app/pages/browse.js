import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Link from "next/link";
import Navbar from "../components/Navbar"
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction, Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import idl from '../public/idl.json';
import localAccounts from '../localAccounts.json';
import React, { useState, useEffect } from 'react';

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
        let s = {
          publicKey: fund.publicKey,
          assets: fund.account.assets,
          weights: fund.account.weights,
          indexTokenMint: fund.account.indexTokenMint,
          indexTokenSupply: fund.account.indexTokenSupply,
          manager: fund.account.manager,
          name: utils.u8ToStr(fund.account.name).replace(/\0.*$/g,''),
          symbol: utils.u8ToStr(fund.account.symbol).replace(/\0.*$/g,''),
        }
        processed.push(s);
      }
      console.log(processed[0]);

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
          <p>{userUsdc} USDC</p>
          <div className="fundsContainer">
            {funds.map((fund, index) =>
              <Link href={`/fund/${encodeURIComponent(fund.publicKey)}`} key={index}>
                <div className="fund">
                  <h2>{fund.symbol} - {fund.name} - {fund.indexTokenSupply.toNumber()/(10**6)}</h2>
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

      <footer className={styles.footer}>
      </footer>
    </div>
  )
}