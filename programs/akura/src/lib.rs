pub mod account;
pub mod context;
pub mod errors;
pub mod macros;
pub mod utils;
use anchor_lang::prelude::*;
use account::*;
use context::*;
use errors::*;
use utils::*;


declare_id!("4CZ51joXxrsSXBQLXVPS5qbFsXyMCxw3NvGYYPpcmYWo");

#[program]
pub mod akura {
    use super::*;
    pub fn create_fund<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateFund<'info>>,
        name: [u8; 30],
        symbol: [u8; 4],
        num_assets: u8,
        weights: [u64; 5],
        _token_decimals: u8,
    ) -> ProgramResult {
        let fund = &mut ctx.accounts.fund;
        let manager = &ctx.accounts.manager;
        let index_token_mint = &ctx.accounts.index_token_mint;
        let token_program = &ctx.accounts.token_program;
        let ata_program = &ctx.accounts.associated_token_program;
        let system_program = &ctx.accounts.system_program;
        let dex_program = &ctx.accounts.dex_program;
        let rent_sysvar = &ctx.accounts.rent;

        fund.name = name;
        fund.symbol = symbol;
        fund.manager = *manager.key;

        fund.num_assets = num_assets;
        fund.weights = weights;

        fund.index_token_mint = index_token_mint.key();
        fund.index_token_supply = 0;
        fund.mint_bump = *ctx.bumps.get("index_token_mint").unwrap();

        fund.fund_bump = *ctx.bumps.get("fund").unwrap();

        // let remaining = ctx.remaining_accounts.len();
        // require!(
        //     remaining == (num_assets*2) as usize,
        //     Err(AkuraError::InvalidRemainingAccounts.into())
        // );
        let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();

        for i in 0..num_assets {
            // TODO switch to try_accounts with a new #derive accounts struct with token account validation like crate does
            // TODO validate that this is a legitimate mint
            let asset_mint = next_account_info(remaining_accounts_iter)?;
            // TODO validate this is the right address
            let fund_ata = next_account_info(remaining_accounts_iter)?;

            fund.assets[i as usize] = *asset_mint.key;

            // if usdc is in the pool then dont need to re init ata
            create_ata_if_necessary(
                &manager.to_account_info(),
                &fund.to_account_info(),
                &asset_mint.to_account_info(),
                &fund_ata.to_account_info(),
                &token_program.to_account_info(),
                &ata_program.to_account_info(),
                &system_program.to_account_info(),
                &rent_sysvar.to_account_info()
            )?;

            // set up buying and selling for this asset on serum
            let market = next_account_info(remaining_accounts_iter)?;
            let open_orders = next_account_info(remaining_accounts_iter)?;

            init_open_orders_account(
                &open_orders.to_account_info(),
                &fund.to_account_info(),
                &market.to_account_info(),
                &manager.to_account_info(),
                &dex_program.to_account_info(),
                rent_sysvar,
                gen_fund_signer_seeds!(fund),
            )?;
        }

        Ok(())

    }

    pub fn set_manager(
        ctx: Context<SetManager>,
        new_manager: Pubkey
    ) -> ProgramResult {
        let fund: &mut Account<Fund> = &mut ctx.accounts.fund;

        fund.manager = new_manager;

        Ok(())
    }

    pub fn buy_fund<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyFund<'info>>,
        amount: u64
    ) -> ProgramResult {
        msg!("BUYING FUND");
        let fund: &mut Account<Fund> = &mut ctx.accounts.fund;
        let fund_usdc_ata = &ctx.accounts.fund_usdc_ata;
        let index_mint = &ctx.accounts.index_token_mint;
        let buyer = &ctx.accounts.buyer;
        let buyer_usdc_ata = &ctx.accounts.buyer_usdc_ata;
        let buyer_index_ata = &ctx.accounts.buyer_index_ata;
        let token_program = &ctx.accounts.token_program;
        let _system_program = &ctx.accounts.system_program;
        let dex_program = &ctx.accounts.dex_program;
        let rent_sysvar = &ctx.accounts.rent;

        // TODO validate accounts

        msg!("transferring spl");

        transfer_spl(
            &buyer.to_account_info(),
            &buyer_usdc_ata.to_account_info(),
            &fund_usdc_ata.to_account_info(),
            amount,
            &token_program.to_account_info(),
            &[]
        )?;

        msg!("loading remaining accounts:");

        let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();
        let market = next_account_info(remaining_accounts_iter)?;
        let open_orders = next_account_info(remaining_accounts_iter)?;
        let request_queue = next_account_info(remaining_accounts_iter)?;
        let event_queue = next_account_info(remaining_accounts_iter)?;
        let bids = next_account_info(remaining_accounts_iter)?;
        let asks = next_account_info(remaining_accounts_iter)?;
        let coin_vault = next_account_info(remaining_accounts_iter)?;
        let pc_vault = next_account_info(remaining_accounts_iter)?;
        let vault_signer = next_account_info(remaining_accounts_iter)?;
        let coin_wallet = next_account_info(remaining_accounts_iter)?;

        serum_buy(
            amount,
            &fund_usdc_ata.to_account_info(),
            coin_wallet,
            &fund.to_account_info(),
            market,
            open_orders,
            request_queue,
            event_queue,
            bids,
            asks,
            coin_vault,
            pc_vault,
            vault_signer,
            dex_program,
            token_program,
            rent_sysvar,
            gen_fund_signer_seeds!(fund),
        )?;

        msg!("minting index tokens");

        mint_spl(
            &index_mint.to_account_info(),
            &index_mint.to_account_info(),
            &buyer_index_ata.to_account_info(),
            amount,
            &token_program.to_account_info(),
            gen_fund_mint_signer_seeds!(fund),
        )?;

        fund.index_token_supply += amount;

        Ok(())
    }

    pub fn sell_fund(
        ctx: Context<SellFund>,
        amount: u64
    ) -> ProgramResult {
        let fund: &mut Account<Fund> = &mut ctx.accounts.fund;
        let fund_usdc_ata = &ctx.accounts.fund_usdc_ata;
        let mint = &ctx.accounts.index_token_mint;
        let seller = &ctx.accounts.seller;
        let seller_usdc_ata = &ctx.accounts.seller_usdc_ata;
        let seller_index_ata = &ctx.accounts.seller_index_ata;
        let token_program = &ctx.accounts.token_program;
        let _system_program = &ctx.accounts.system_program;

        transfer_spl(
            &fund.to_account_info(),
            &fund_usdc_ata.to_account_info(),
            &seller_usdc_ata.to_account_info(),
            amount,
            &token_program.to_account_info(),
            gen_fund_signer_seeds!(fund),
        )?;

        burn_spl(
            &mint.to_account_info(),
            &seller_index_ata.to_account_info(),
            &seller.to_account_info(),
            amount,
            &token_program.to_account_info(),
            gen_fund_mint_signer_seeds!(fund),
        )?;

        fund.index_token_supply -= amount;

        Ok(())
    }
}
