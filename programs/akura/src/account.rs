use anchor_lang::prelude::*;

// change everywhere else if changed here
pub const MAX_ASSETS: usize = 5;

#[account]
#[derive(Default)]
pub struct Fund {
    pub name: [u8; 30],
    pub symbol: [u8; 4],
    pub manager: Pubkey,

    pub num_assets: u8,
    pub assets: [Pubkey; MAX_ASSETS],
    pub weights: [u64; MAX_ASSETS],

    pub index_token_mint: Pubkey,
    pub mint_bump: u8,
    // doubles as tvl since its 1:1 with deposit currency
    pub index_token_supply: u64,

    pub fund_bump: u8,
}