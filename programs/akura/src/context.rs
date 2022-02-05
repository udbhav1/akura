use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use crate::account::*;

#[derive(Accounts)]
#[instruction(
    name: [u8; 30],
    symbol: [u8; 4],
    num_assets: u8,
    assets: [Pubkey; 5],
    weights: [u64; 5],
    bump: u8,
)]
pub struct CreateFund<'info> {
    #[account(
        init,
        seeds=[b"akura fund", manager.to_account_info().key.as_ref()],
        bump = bump,
        payer = manager
    )]
    pub fund: Account<'info, Fund>,
    #[account(mut)]
    pub manager: Signer<'info>,
    pub token_program: Program<'info, Token>,
    #[account(address = spl_associated_token_account::ID)]
    pub ata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent_sysvar: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct SetManager<'info> {
    #[account(mut, has_one = manager)]
    pub fund: Account<'info, Fund>,
    pub manager: Signer<'info>,
    pub system_program: Program<'info, System>,
}