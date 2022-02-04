use anchor_lang::prelude::*;

#[error]
pub enum AkuraError {
    #[msg("Title must be less than 50 characters.")]
    TitleOverflow,
}