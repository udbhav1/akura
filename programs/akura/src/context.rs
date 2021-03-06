use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::account::*;

#[derive(Accounts)]
#[instruction(
    name: [u8; 30],
    symbol: [u8; 4],
    num_assets: u8,
    weights: [u64; 5],
    token_decimals: u8,
)]
pub struct CreateFund<'info> {
    #[account(
        init,
        seeds = [b"akura fund", manager.to_account_info().key.as_ref(), &name],
        bump,
        payer = manager
    )]
    pub fund: Box<Account<'info, Fund>>,

    #[account(
        init,
        payer = manager,
        associated_token::mint = usdc_mint,
        associated_token::authority = fund
    )]
    pub fund_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [b"akura fund mint", manager.to_account_info().key.as_ref(), &name],
        bump,
        payer = manager,
        mint::decimals = token_decimals,
        mint::authority = index_token_mint
    )]
    pub index_token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub manager: Signer<'info>,

    // TODO add check once on devnet/mainnet
    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub dex_program: Program<'info, anchor_spl::dex::Dex>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetManager<'info> {
    #[account(mut, has_one = manager)]
    pub fund: Account<'info, Fund>,
    pub manager: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitBuyData<'info> {
    pub fund: Account<'info, Fund>,
    #[account(
        init_if_needed,
        seeds = [
            b"akura buy data",
            fund.to_account_info().key.as_ref(),
            buyer.to_account_info().key.as_ref()
        ],
        bump,
        payer = buyer,
    )]
    pub buy_data: Account<'info, BuyData>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyFund<'info> {
    #[account(mut)]
    pub fund: Box<Account<'info, Fund>>,

    // TODO validate this is the fund's usdc ata once on devnet/mainnet with usdc address
    #[account(mut)]
    pub fund_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub index_token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    // TODO validate once on devnet/mainnet with usdc address
    #[account(mut)]
    pub buyer_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = index_token_mint,
        associated_token::authority = buyer
    )]
    pub buyer_index_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            b"akura buy data",
            fund.to_account_info().key.as_ref(),
            buyer.to_account_info().key.as_ref()
        ],
        bump
    )]

    pub buy_data: Box<Account<'info, BuyData>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub dex_program: Program<'info, anchor_spl::dex::Dex>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct InitSellData<'info> {
    pub fund: Account<'info, Fund>,
    #[account(
        init_if_needed,
        seeds = [
            b"akura sell data",
            fund.to_account_info().key.as_ref(),
            seller.to_account_info().key.as_ref()
        ],
        bump,
        payer = seller,
    )]
    pub sell_data: Account<'info, SellData>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellFund<'info> {
    #[account(mut)]
    pub fund: Box<Account<'info, Fund>>,

    // TODO validate this is the fund's usdc ata once on devnet/mainnet with usdc address
    #[account(mut)]
    pub fund_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub index_token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub seller: Signer<'info>,

    // TODO validate once on devnet/mainnet with usdc address
    #[account(mut)]
    pub seller_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub seller_index_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            b"akura sell data",
            fund.to_account_info().key.as_ref(),
            seller.to_account_info().key.as_ref()
        ],
        bump
    )]
    pub sell_data: Box<Account<'info, SellData>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub dex_program: Program<'info, anchor_spl::dex::Dex>,
    pub rent: Sysvar<'info, Rent>
}