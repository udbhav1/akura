pub mod account;
pub mod context;
pub mod error;
pub mod utils;
use anchor_lang::prelude::*;
use account::*;
use context::*;
use error::*;
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
        fund_bump: u8,
        mint_bump: u8,
    ) -> ProgramResult {
        let fund = &mut ctx.accounts.fund;
        let manager = &ctx.accounts.manager;
        let index_token_mint = &ctx.accounts.index_token_mint;
        let token_program = &ctx.accounts.token_program;
        let ata_program = &ctx.accounts.ata_program;
        let system_program = &ctx.accounts.system_program;
        let rent_sysvar = &ctx.accounts.rent;

        fund.name = name;
        fund.symbol = symbol;
        fund.manager = *manager.key;

        fund.num_assets = num_assets;
        fund.weights = weights;
        fund.tvl = 0;

        fund.index_token_mint = index_token_mint.key();
        fund.index_token_supply = 0;
        fund.mint_bump = mint_bump;

        fund.fund_bump = fund_bump;

        let remaining = ctx.remaining_accounts.len();

        msg!("REMAINING ACCOUNTS PASSED: {}", remaining);
        require!(
            remaining == (num_assets*2) as usize,
            Err(AkuraError::InvalidRemainingAccounts.into())
        );
        let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();

        for i in 0..num_assets {
            // TODO switch to try_accounts with a new #derive accounts struct with token account validation like crate does
            // TODO validate that this is a legitimate mint
            let asset_mint = next_account_info(remaining_accounts_iter)?;
            // TODO validate this is the right address
            let fund_ata = next_account_info(remaining_accounts_iter)?;

            fund.assets[i as usize] = *asset_mint.key;

            create_ata(
                manager.to_account_info(),
                fund.to_account_info(),
                asset_mint.to_account_info(),
                fund_ata.to_account_info(),
                token_program.to_account_info(),
                ata_program.to_account_info(),
                system_program.to_account_info(),
                rent_sysvar.to_account_info()
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

    pub fn buy_fund(
        ctx: Context<BuyFund>,
        amount: u64
    ) -> ProgramResult {
        let fund: &mut Account<Fund> = &mut ctx.accounts.fund;

        Ok(())
    }
}