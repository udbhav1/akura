use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    system_instruction::transfer,
    program::invoke,
    program::invoke_signed
};

pub fn create_ata<'info>(
    payer: AccountInfo<'info>,
    wallet: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    ata: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    ata_program: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    rent_sysvar: AccountInfo<'info>,
) -> ProgramResult {

    invoke_signed(
        &spl_associated_token_account::create_associated_token_account(
            &payer.key(),
            &wallet.key(),
            &mint.key(),
        ),
        &[
            ata,
            wallet,
            mint,
            payer,
            token_program,
            ata_program,
            system_program,
            rent_sysvar,
        ],
        &[],
    )?;

    Ok(())
}

pub fn transfer_spl<'info>(
    src: AccountInfo<'info>,
    src_ata: AccountInfo<'info>,
    dst_ata: AccountInfo<'info>,
    amount: u64,
    token_program: AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]]
) -> ProgramResult {

    invoke_signed(
        &spl_token::instruction::transfer(
            &token_program.key(),
            &src_ata.key(),
            &dst_ata.key(),
            &src.key(),
            &[],
            amount,
        )?,
        &[
            src.to_account_info(),
            src_ata.to_account_info(),
            dst_ata.to_account_info(),
            token_program.to_account_info()
        ],
        signer_seeds,
    )?;

    Ok(())
}

// transfer from system-owned account
pub fn transfer_sol<'info>(
    src: AccountInfo<'info>,
    dst: AccountInfo<'info>,
    amount: u64,
    system_program: AccountInfo<'info>
) -> ProgramResult {

    invoke(
        &transfer(&src.key(), &dst.key(), amount),
        &[
            src.to_account_info(),
            dst.to_account_info(),
            system_program.to_account_info()
        ]
    )?;

    Ok(())
}

// https://hackmd.io/XP15aqlzSbG8XbGHXmIRhg
// program account owns the pda
pub fn transfer_from_owned_account(
    src: &mut AccountInfo,
    dst: &mut AccountInfo,
    amount: u64
) -> ProgramResult {
    **src.try_borrow_mut_lamports()? = src
        .lamports()
        .checked_sub(amount)
        .ok_or(ProgramError::InvalidArgument)?;

    **dst.try_borrow_mut_lamports()? = dst
        .lamports()
        .checked_add(amount)
        .ok_or(ProgramError::InvalidArgument)?;

    Ok(())
}

#[macro_export]
macro_rules! require{
       ($a:expr,$b:expr)=>{
           {
               if !$a {
                   return $b
               }
           }
       }
}