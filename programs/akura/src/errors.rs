use anchor_lang::prelude::*;

#[error]
pub enum AkuraError {
    #[msg("Asset weights passed are invalid")]
    InvalidWeights,
    #[msg("Remaining accounts passed are invalid.")]
    InvalidRemainingAccounts,
    #[msg("Buy data passed is invalid.")]
    InvalidBuyData,
    #[msg("Sell data passed is invalid.")]
    InvalidSellData,
    #[msg("Index token mint passed is invalid.")]
    InvalidFundMint,
    #[msg("Asset mint passed does not match next asset to buy.")]
    WrongTokenMint,
    #[msg("Fund asset ATA passed in remaining accounts does not match asset to buy.")]
    InvalidFundAta,
}