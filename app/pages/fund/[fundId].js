import Head from 'next/head'
import styles from '../../styles/Home.module.css'
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar"
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Connection, PublicKey, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import { Market } from '@project-serum/serum';
import * as splToken from '@solana/spl-token';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import Modal from 'react-modal';
import React, { useState, useEffect } from 'react';

import idl from '../../public/idl.json';
import localAccounts from '../../localAccounts.json';
import mangoPrices from '../../public/prices/mango-prices.json';
import orcaPrices from '../../public/prices/orca-prices.json';
import raydiumPrices from '../../public/prices/raydium-prices.json';
import serumPrices from '../../public/prices/serum-prices.json';
import solanaPrices from '../../public/prices/solana-prices.json';
import solicePrices from '../../public/prices/solice-prices.json';
import staratlasPrices from '../../public/prices/staratlas-prices.json';

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
// console.log(tokenToPrice);
// console.log(tokenToName);
// console.log(nameToToken);

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
  const [fundPrice, setFundPrice] = useState(null);
  const [subtokenInfo, setSubtokenInfo] = useState(null);
  const [currentVal, setCurrentVal] = useState(0);
  const [buyData, setBuyData] = useState(null);
  const [sellData, setSellData] = useState(null);
  const [userUsdc, setUserUsdc] = useState(0);
  const [userMngo, setUserMngo] = useState(0);
  const [userRay, setUserRay] = useState(0);
  const [userFund, setUserFund] = useState(0);
  const [traded, setTraded] = useState(0);

  function timestampToDate(ts) {
    let date = new Date(ts);
    let suffix = " AM"
    let hours = date.getUTCHours();
    if(hours >= 12){
      suffix = " PM";
      hours -= 12;
    }
    return hours.toString() + ":" + date.getUTCMinutes() + suffix + ", " + (date.getMonth()+1).toString() + "/" + date.getUTCDate() + "/" + date.getFullYear();
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

  function getPieChartInfo(fundData) {
    let res = [];
    let totalWeight = fundData.weights.reduce(
      (prev, current) => prev + current.toNumber(),
      0
    );
    for(let i = 0; i < fundData.numAssets; i++) {
      let address = fundData.assets[i].toBase58();
      let name = tokenToName[address];
      let weight = fundData.weights[i].toNumber()/totalWeight;
      let ph = tokenToPrice[address]
      let lastPrice = ph[ph.length - 1][1];
      res.push({
        address: address,
        name: name,
        weight: weight,
        lastPrice: lastPrice
      })
    }
    // sort descending
    res.sort((a, b) => (a.weight < b.weight) ? 1 : -1);
    return res;
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
        numAssets: fundAccount.numAssets,
        indexTokenMint: fundAccount.indexTokenMint,
        indexTokenSupply: fundAccount.indexTokenSupply,
        genesis: fundAccount.genesis,
        manager: fundAccount.manager,
        name: utils.u8ToStr(fundAccount.name).replace(/\0.*$/g,''),
        symbol: utils.u8ToStr(fundAccount.symbol).replace(/\0.*$/g,''),
      }));

      // price history calculation
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
      setFundPrice(old => fundPrices);
      setCurrentVal(fundPrices[fundPrices.length-1][1]);
      // console.log(fundPrice);
      // console.log(fundData);

      let subtokenInfo = getPieChartInfo(fundAccount);
      setSubtokenInfo(old => subtokenInfo);

    }

    if(anchorWallet != undefined) {
      // console.log("anchor wallet connected");
      getFund()
    } else {
      // console.log("anchor wallet disconnected");
    }
  }, [traded]);

  useEffect(() => {
    const getBuySellData = async () => {
      const provider = await getProvider();
      const program = new Program(idl, programID, provider);
      let fundAddress = new PublicKey(fundId);

      let [buyDataAddress, buyDataBump] = await utils.deriveBuyDataAddress(
        program,
        fundAddress,
        anchorWallet.publicKey,
      );
      let [sellDataAddress, sellDataBump] = await utils.deriveSellDataAddress(
        program,
        fundAddress,
        anchorWallet.publicKey,
      );
      setBuyData(buyDataAddress);
      setSellData(sellDataAddress);
    }
    if(anchorWallet != undefined) {
      getBuySellData()
    }
  }, [])

  async function fetchMarket(program, address) {
    let marketAddress = new PublicKey(address);
    let market = await Market.load(program.provider.connection, marketAddress, {}, serumUtils.DEX_PID);
    return market;
  }

  async function initBuyData(program, userPublicKey, amount) {
    try {
      let buyAmount = utils.usdc(amount);
      console.log("amount to buy: ", buyAmount);

      let fundAddress = new PublicKey(fundId);

      await program.rpc.initBuyData(new BN(buyAmount), {
          accounts: {
              fund: fundAddress,
              buyData: buyData,
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

    try {
      await program.rpc.buyFund({
        accounts: {
          fund: fundAddress,
          fundUsdcAta: fundUsdcAta,
          curMint: usdcMint,
          indexTokenMint: fundTokenMint,
          buyer: userPublicKey,
          buyerUsdcAta: buyerUsdcAta,
          buyerIndexAta: buyerIndexAta,
          buyData: buyData,
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

  async function initAndBuy(amount) {
    if (!anchorWallet) throw new WalletNotConnectedError();

    let userPublicKey = anchorWallet.publicKey;
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);

    await initBuyData(program, userPublicKey, amount);

    console.log("inited buy account");

    let fundAddress = new PublicKey(fundId);
    let assets = []
    for(let i = 0; i < fundData.numAssets; i++){
      let address = fundData.assets[i].toBase58();
      let localData = localAccounts.tokens[address];
      let market = await fetchMarket(program, localData["MARKET_ADDRESS"]);
      let mint = address;
      let vaultSigner = localData.marketVaultSigner;
      let openOrdersAccount = await market.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
      let openOrdersAddress = openOrdersAccount[0].address;
      assets.push({
        mint: new PublicKey(mint),
        market: market,
        vaultSigner: new PublicKey(vaultSigner),
        openOrders: openOrdersAddress,
      })
    }
    console.log("assets to buy", assets);
    for(let asset of assets) {
      console.log("buying asset", asset);
      let remainingAccounts = await utils.genRemainingBuyAccounts(fundAddress, asset);
      await buyFund(program, userPublicKey, remainingAccounts);
    }

    setTraded(traded+1);
  }

  async function initSellData(program, userPublicKey, amount) {
    try {
      let sellAmount = utils.usdc(amount);
      console.log("amount to sell: ", sellAmount);

      let fundAddress = new PublicKey(fundId);

      await program.rpc.initSellData(new BN(sellAmount), {
          accounts: {
              fund: fundAddress,
              sellData: sellData,
              seller: userPublicKey,
              systemProgram: SystemProgram.programId,
          },
          signers: []
      });

    } catch (err) {
        console.log("Transaction error: ", err);
    }
  }

  async function sellFund(program, userPublicKey, remainingAccounts) {
    let fundAddress = new PublicKey(fundId);
    let usdcMint = new PublicKey(localAccounts.USDC_MINT);
    let fundUsdcAta = await findAssociatedTokenAddress(fundAddress, usdcMint);
    let fundTokenMint = fundData.indexTokenMint;
    let sellerUsdcAta = await findAssociatedTokenAddress(userPublicKey, usdcMint);
    let sellerIndexAta = await findAssociatedTokenAddress(userPublicKey, fundTokenMint);

    try {
      await program.rpc.sellFund({
        accounts: {
          fund: fundAddress,
          fundUsdcAta: fundUsdcAta,
          indexTokenMint: fundTokenMint,
          seller: userPublicKey,
          sellerUsdcAta: sellerUsdcAta,
          sellerIndexAta: sellerIndexAta,
          sellData: sellData,
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

  async function initAndSell(amount) {
    if (!anchorWallet) throw new WalletNotConnectedError();

    let userPublicKey = anchorWallet.publicKey;
    const provider = await getProvider();
    const program = new Program(idl, programID, provider);

    await initSellData(program, userPublicKey, amount);

    console.log("inited sell account");

    let fundAddress = new PublicKey(fundId);
    let assets = []
    for(let i = 0; i < fundData.numAssets; i++){
      let address = fundData.assets[i].toBase58();
      let localData = localAccounts.tokens[address];
      let market = await fetchMarket(program, localData["MARKET_ADDRESS"]);
      let mint = address;
      let vaultSigner = localData.marketVaultSigner;
      let openOrdersAccount = await market.findOpenOrdersAccountsForOwner(program.provider.connection, fundAddress);
      let openOrdersAddress = openOrdersAccount[0].address;
      assets.push({
        mint: new PublicKey(mint),
        market: market,
        vaultSigner: new PublicKey(vaultSigner),
        openOrders: openOrdersAddress,
      })
    }
    console.log("assets to sell", assets);
    for(let asset of assets) {
      console.log("selling asset", asset);
      let remainingAccounts = await utils.genRemainingBuyAccounts(fundAddress, asset);
      await sellFund(program, userPublicKey, remainingAccounts);
    }

    setTraded(traded+1);
  }

  async function buy() {
    let amt = prompt("How much USDC to spend?");
    await initAndBuy(amt);
  }

  async function sell() {
    let amt = prompt("How many fund tokens to sell?");
    await initAndSell(amt);
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
          {fundData &&
            <div>
              <div className="fundHeader">
                <h1>{fundData.name} ({fundData.symbol})</h1>
                <div className="buyButtonContainer">
                  <button onClick={buy} disabled={!anchorWallet}>
                    BUY
                  </button>
                  <button onClick={sell} disabled={!anchorWallet}>
                    SELL
                  </button>
                </div>
              </div>
              <div className="fundInfoHeader">
                <h2>Total Supply: {(fundData.indexTokenSupply.toNumber()/(10**6)).toFixed(2)}</h2>
                <div className="tokensOwned">
                  <p><strong>Owned: </strong>{userFund.toFixed(2)}</p>
                  <p><strong>USDC: </strong>{userUsdc.toFixed(2)}</p>
                </div>
                <div className="break"></div>
                <p className="address">Token Address: <a rel="noreferrer" href={"https://explorer.solana.com/address/" + fundData.indexTokenMint.toBase58() + "?cluster=custom"} target="_blank">{fundData.indexTokenMint.toBase58()}</a></p>
                <div className="break"></div>
                <p className="creator">Fund Creator: <a rel="noreferrer" href={"https://explorer.solana.com/address/" + fundData.manager.toBase58() + "?cluster=custom"} target="_blank">{fundData.manager.toBase58()}</a></p>
              </div>
              {fundPrice &&
                <div className="priceHistory">
                  {(currentVal < 1) &&
                    <h2 style={{color: "red"}}>-{(100*(1 - currentVal)).toFixed(2)}%</h2>
                  }
                  {(currentVal > 1) &&
                    <h2 style={{color: "green"}}>+{(100*(currentVal - 1)).toFixed(2)}%</h2>
                  }
                  <ResponsiveContainer width="100%" height="86%">
                    <LineChart data={fundPrice.map(x => ({"ts": x[0], "price": x[1]}))} onMouseMove={props => { if(props.activeTooltipIndex != undefined) {setCurrentVal(fundPrice[props.activeTooltipIndex][1])} }} onMouseLeave={props => setCurrentVal(fundPrice[fundPrice.length-1][1])}>
                      <Tooltip cursor={{stroke: "#fff", strokeWidth: 2}} itemStyle={{color: "black"}} labelStyle={{color: "black"}} labelFormatter={(value, name, props) => timestampToDate(fundPrice[value][0])} formatter={(value, name, props) => value.toFixed(3) }/>
                      <YAxis hide={true} domain={[dataMin => (dataMin*0.9), dataMax => (dataMax*1.05)]}/>
                      <Line type="monotone" dot={false} dataKey="price" stroke="#888FFF" strokeWidth={2} /> 
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              }
              {subtokenInfo &&
                <div className="tokenInfo">
                  <div className="tokensContainer">
                    <h1>Assets</h1>
                    <div className="tokenList">
                      {subtokenInfo.map((entry, index) => (
                        <div key={entry.name} className="listEntry">
                          <div className="logoContainer">
                            <img src={nameToImage[entry.name]}/>
                          </div>
                          <div className="nameContainer">
                            <a style={{color: COLORS[index % COLORS.length]}}><strong>{entry.name}</strong></a>
                          </div>
                          <a>{(entry.weight*100).toFixed(2)}%</a>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="tokensPieChart">
                    <PieChart width={400} height={400} style={{margin: "auto"}}>
                      <Pie
                        data={subtokenInfo}
                        innerRadius={120}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="weight"
                        nameKey="name"
                        startAngle={0}
                        stroke="none"
                      >
                        {subtokenInfo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => (100*value).toFixed(2).toString() + "%"} />
                    </PieChart>
                  </div>
                </div>
            }
            </div>
          }
        </div>
      ) : (
        <div style={{textAlign: "center", marginTop: "10%"}}>
          <h1>Connect Wallet to View Fund</h1>
        </div>
      )}

      <div className="spacer"></div>
      <footer className={styles.footer}>
      </footer>
    </div>
  )
}