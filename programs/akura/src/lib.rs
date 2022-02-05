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
    pub fn create_fund(
        ctx: Context<CreateFund>,
        name: [u8; 30],
        symbol: [u8; 4],
        num_assets: u8,
        assets: [Pubkey; 5],
        weights: [u64; 5],
        bump: u8,
    ) -> ProgramResult {
        let fund: &mut Account<Fund> = &mut ctx.accounts.fund;
        let manager = &ctx.accounts.manager;
        let token_program = &ctx.accounts.token_program;
        let ata_program = &ctx.accounts.ata_program;
        let system_program = &ctx.accounts.system_program;
        let rent_sysvar = &ctx.accounts.rent_sysvar;

        fund.name = name;
        fund.symbol = symbol;
        fund.manager = *manager.key;

        fund.num_assets = num_assets;
        fund.assets = assets;
        fund.weights = weights;
        fund.tvl = 0;

        fund.fund_token_supply = 0;

        fund.bump = bump;

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
}