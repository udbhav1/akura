use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use anchor_spl::associated_token::AssociatedToken;
use crate::account::*;

#[derive(Accounts)]
#[instruction(
    name: [u8; 30],
    symbol: [u8; 4],
    num_assets: u8,
    weights: [u64; 5],
    fund_bump: u8,
    mint_bump: u8
)]
pub struct CreateFund<'info> {
    #[account(
        init,
        // seeds = [b"akura fund", manager.to_account_info().key.as_ref(), String::from_utf8(name.to_vec()).unwrap().as_bytes()],
        seeds = [b"akura fund", manager.to_account_info().key.as_ref()],
        bump = fund_bump,
        payer = manager
    )]
    pub fund: Account<'info, Fund>,
    #[account(
        init,
        seeds = [b"akura fund mint", manager.to_account_info().key.as_ref()],
        bump = mint_bump,
        payer = manager,
        mint::decimals = 9,
        mint::authority = index_token_mint
    )]
    pub index_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub manager: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub ata_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct SetManager<'info> {
    #[account(mut, has_one = manager)]
    pub fund: Account<'info, Fund>,
    pub manager: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyFund<'info> {
    #[account(mut)]
    pub fund: Account<'info, Fund>,
    #[account(mut)]
    pub index_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct SellFund<'info> {
    #[account(mut)]
    pub fund: Account<'info, Fund>,
    #[account(mut)]
    pub index_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}