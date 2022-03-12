import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction, Connection, PublicKey } from '@solana/web3.js';
import { Program, Provider, web3, BN } from '@project-serum/anchor';
import * as splToken from '@solana/spl-token';
import idl from '../public/idl.json';
import localAccounts from '../localAccounts.json';
import React, { useCallback } from 'react';

const utils = require("../utils");
const serumUtils = require("../serumUtils");

const programID = new PublicKey(idl.metadata.address);
const opts = {
  preflightCommitment: "processed"
}

const InitBuyData = () => {
    const anchorWallet = useAnchorWallet();

    async function getProvider() {
        const network = "http://127.0.0.1:8899";
        const connection = new Connection(network, Provider.defaultOptions().commitment);

        const provider = new Provider(connection, anchorWallet, Provider.defaultOptions());
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

    async function initBuyData(program, userPublicKey) {
        try {
            let usdc = new PublicKey(localAccounts.USDC_MINT);
            let buyerUsdcAta = await findAssociatedTokenAddress(userPublicKey, usdc);
            console.log(buyerUsdcAta.toBase58());
            // will be init'ed by the program


            let temp = await utils.getTokenBalance(program, buyerUsdcAta);
            console.log(temp);

            let buyAmount = utils.usdc(100);
            console.log("amount to buy: ", buyAmount);

            const fundAccounts = await program.account.fund.all();
            console.log(fundAccounts);

            let fundAddress = fundAccounts[0].publicKey;

            let fundTokenMint = fundAccounts[0].account.indexTokenMint;

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

            // let buyerFundAta = await findAssociatedTokenAddress(userPublicKey, fundTokenMint);
            // temp = await utils.getTokenBalance(program, buyerFundAta);
            // console.log(temp)

        } catch (err) {
            console.log("Transaction error: ", err);
        }
    }

    const onClick = useCallback(async () => {
        if (!anchorWallet) throw new WalletNotConnectedError();

        let userPublicKey = anchorWallet.publicKey;
        const provider = await getProvider();
        const program = new Program(idl, programID, provider);

        await initBuyData(program, userPublicKey);

    }, [anchorWallet]);

    return (
        <button onClick={onClick} disabled={!anchorWallet}>
            Init Buy Data
        </button>
    );
};

export default InitBuyData