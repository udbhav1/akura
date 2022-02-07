use anchor_lang::prelude::*;

#[error]
pub enum AkuraError {
    #[msg("Remaining accounts passed are invalid.")]
    InvalidRemainingAccounts,
}