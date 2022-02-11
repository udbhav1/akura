import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Akura } from '../target/types/akura';
import * as splToken from '@solana/spl-token';
import * as serumAta from '@project-serum/associated-token'
import * as web3 from '@solana/web3.js';
import * as assert from "assert";
const utils = require("./utils");

anchor.setProvider(anchor.Provider.env());

const program = anchor.workspace.Akura as Program<Akura>;

describe('akura', () => {

  it('create fund', async () => {
    console.log("generating keypairs");

    let manager = anchor.web3.Keypair.generate();
    let mintOwner = anchor.web3.Keypair.generate();

    await utils.airdrop(program, manager.publicKey, utils.lamports(1));
    await utils.airdrop(program, mintOwner.publicKey, utils.lamports(1));

    console.log(manager.publicKey);

    assert.equal(manager.publicKey.toBase58(), manager.publicKey.toBase58());
  });
});