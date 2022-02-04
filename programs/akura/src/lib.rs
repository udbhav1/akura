pub mod account;
pub mod context;
pub mod error;
pub mod utils;
use anchor_lang::prelude::*;
use account::*;
use context::*;
use error::*;
use utils::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod akura {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }
}

