pub mod account;
pub mod context;
pub mod errors;
pub mod macros;
pub mod utils;
use anchor_lang::prelude::*;
use account::*;
use context::*;
use errors::*;
use utils::*;

use anchor_spl::token;
use anchor_spl::associated_token::get_associated_token_address;

declare_id!("4CZ51joXxrsSXBQLXVPS5qbFsXyMCxw3NvGYYPpcmYWo");

#[program]
pub mod akura {
    use super::*;

    pub fn create_fund<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateFund<'info>>,
        name: [u8; 30],
        symbol: [u8; 4],
        num_assets: u8,
        weights: [u64; 5],
        _token_decimals: u8,
    ) -> ProgramResult {
        let fund = &mut ctx.accounts.fund;
        let manager = &ctx.accounts.manager;
        let index_token_mint = &ctx.accounts.index_token_mint;
        let _token_program = &ctx.accounts.token_program;
        let _ata_program = &ctx.accounts.associated_token_program;
        let _system_program = &ctx.accounts.system_program;
        let dex_program = &ctx.accounts.dex_program;
        let rent_sysvar = &ctx.accounts.rent;

        // only first [num_assets] values should be non-zero
        // second check to ensure no u64 overflows later
        for i in 0..5 {
            if i < num_assets {
                require!(weights[i as usize] > 0, Err(AkuraError::InvalidWeights.into()));
                require!(weights[i as usize] < 1000000, Err(AkuraError::InvalidWeights.into()))
            } else {
                require!(weights[i as usize] == 0, Err(AkuraError::InvalidWeights.into()));
            }
        }

        fund.name = name;
        fund.symbol = symbol;
        fund.manager = *manager.key;

        fund.num_assets = num_assets;
        fund.weights = weights;

        fund.index_token_mint = index_token_mint.key();
        fund.index_token_supply = 0;

        let clock: Clock = Clock::get().unwrap();
        fund.genesis = clock.unix_timestamp as u64;

        fund.mint_bump = *ctx.bumps.get("index_token_mint").unwrap();
        fund.fund_bump = *ctx.bumps.get("fund").unwrap();

        let remaining = ctx.remaining_accounts.len();
        require!(
            remaining == (num_assets*3) as usize,
            Err(AkuraError::InvalidRemainingAccounts.into())
        );
        let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();

        for i in 0..num_assets {
            // TODO validate that this is a legitimate mint
            let asset_mint = next_account_info(remaining_accounts_iter)?;

            fund.assets[i as usize] = *asset_mint.key;

            // set up buying and selling for this asset on serum
            // dex program handles validation
            let market = next_account_info(remaining_accounts_iter)?;
            let open_orders = next_account_info(remaining_accounts_iter)?;

            init_open_orders_account(
                &open_orders.to_account_info(),
                &fund.to_account_info(),
                &market.to_account_info(),
                &manager.to_account_info(),
                &dex_program.to_account_info(),
                rent_sysvar,
                gen_fund_signer_seeds!(fund),
            )?;
        }

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

    pub fn init_buy_data(
        ctx: Context<InitBuyData>,
        amount: u64,
    ) -> ProgramResult {
        let fund = &ctx.accounts.fund;
        let buy_data = &mut ctx.accounts.buy_data;
        let buyer = &ctx.accounts.buyer;

        buy_data.fund = fund.to_account_info().key();
        buy_data.buyer = *buyer.key;
        buy_data.amount = amount;
        buy_data.supply_snapshot = fund.index_token_supply;
        buy_data.usdc_refunded = 0;
        buy_data.asset_index = 0;

        buy_data.bump = *ctx.bumps.get("buy_data").unwrap();

        Ok(())
    }

    pub fn buy_fund<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyFund<'info>>
    ) -> ProgramResult {
        let fund: &mut Account<Fund> = &mut ctx.accounts.fund;
        let fund_usdc_ata = &ctx.accounts.fund_usdc_ata;
        let index_mint = &ctx.accounts.index_token_mint;
        let buyer = &ctx.accounts.buyer;
        let buyer_usdc_ata = &ctx.accounts.buyer_usdc_ata;
        let buyer_index_ata = &ctx.accounts.buyer_index_ata;
        let buy_data = &mut ctx.accounts.buy_data;
        let token_program = &ctx.accounts.token_program;
        let ata_program = &ctx.accounts.associated_token_program;
        let system_program = &ctx.accounts.system_program;
        let dex_program = &ctx.accounts.dex_program;
        let rent_sysvar = &ctx.accounts.rent;
        
        // buy_data must match this fund
        require!(
            buy_data.fund == fund.to_account_info().key(),
            Err(AkuraError::InvalidBuyData.into())
        );
        // ensure init_buy_data was run first
        require!(
            buy_data.amount != 0,
            Err(AkuraError::InvalidBuyData.into())
        );

        require!(
            fund.index_token_mint == index_mint.to_account_info().key(),
            Err(AkuraError::InvalidFundMint.into())
        );

        msg!("BUYING FUND");

        // guaranteed to not overflow on multiplication
        // total_weight guaranteed to be > 0
        let total_weight: u64 = fund.weights.iter().sum();
        let amount = (fund.weights[buy_data.asset_index as usize]*buy_data.amount)/total_weight;

        let old_usdc_amount = token::accessor::amount(&fund_usdc_ata.to_account_info())?;

        msg!("TRANSFERRING USDC");

        transfer_spl(
            &buyer.to_account_info(),
            &buyer_usdc_ata.to_account_info(),
            &fund_usdc_ata.to_account_info(),
            amount,
            &token_program.to_account_info(),
            &[]
        )?;

        msg!("READING REMAINING ACCOUNTS");

        let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();
        let market = next_account_info(remaining_accounts_iter)?;
        let open_orders = next_account_info(remaining_accounts_iter)?;
        let request_queue = next_account_info(remaining_accounts_iter)?;
        let event_queue = next_account_info(remaining_accounts_iter)?;
        let bids = next_account_info(remaining_accounts_iter)?;
        let asks = next_account_info(remaining_accounts_iter)?;
        let coin_vault = next_account_info(remaining_accounts_iter)?;
        let pc_vault = next_account_info(remaining_accounts_iter)?;
        let vault_signer = next_account_info(remaining_accounts_iter)?;
        let coin_wallet = next_account_info(remaining_accounts_iter)?;
        let asset_mint = next_account_info(remaining_accounts_iter)?;

        require!(
            asset_mint.to_account_info().key() == fund.assets[buy_data.asset_index as usize],
            Err(AkuraError::WrongTokenMint.into())
        );

        let fund_asset_ata = get_associated_token_address(
            &fund.to_account_info().key(),
            &asset_mint.to_account_info().key()
        );

        require!(
            fund_asset_ata == coin_wallet.to_account_info().key(),
            Err(AkuraError::InvalidFundAta.into())
        );

        if coin_wallet.to_account_info().data_is_empty() {
            create_ata(
                &buyer.to_account_info(),
                &fund.to_account_info(),
                &asset_mint.to_account_info(),
                &coin_wallet.to_account_info(),
                &token_program.to_account_info(),
                &ata_program.to_account_info(),
                &system_program.to_account_info(),
                &rent_sysvar.to_account_info()
            )?;
        }

        serum_swap(
            amount,
            Side::Bid,
            &fund_usdc_ata.to_account_info(),
            coin_wallet,
            &fund.to_account_info(),
            market,
            open_orders,
            request_queue,
            event_queue,
            bids,
            asks,
            coin_vault,
            pc_vault,
            vault_signer,
            dex_program,
            token_program,
            rent_sysvar,
            gen_fund_signer_seeds!(fund),
        )?;

        buy_data.asset_index += 1;

        // refund any usdc left unspent bc of slippage on the swap and record for later
        let new_usdc_amount = token::accessor::amount(&fund_usdc_ata.to_account_info())?;

        let refund_amount = new_usdc_amount - old_usdc_amount;
        buy_data.usdc_refunded += refund_amount;

        msg!("refunding {} usdc", refund_amount);

        transfer_spl(
            &fund.to_account_info(),
            &fund_usdc_ata.to_account_info(),
            &buyer_usdc_ata.to_account_info(),
            refund_amount,
            &token_program.to_account_info(),
            gen_fund_signer_seeds!(fund),
        )?;

        if buy_data.asset_index == fund.num_assets {

            let mint_amount = buy_data.amount - buy_data.usdc_refunded;

            msg!("minting {} index tokens", mint_amount);

            mint_spl(
                &index_mint.to_account_info(),
                &index_mint.to_account_info(),
                &buyer_index_ata.to_account_info(),
                mint_amount,
                &token_program.to_account_info(),
                gen_fund_mint_signer_seeds!(fund),
            )?;

            fund.index_token_supply += mint_amount;

            // reset buy data
            buy_data.amount = 0;
            buy_data.supply_snapshot = 0;
            buy_data.usdc_refunded = 0;
            buy_data.asset_index = 0;
        }

        Ok(())
    }

    pub fn init_sell_data(
        ctx: Context<InitSellData>,
        amount: u64,
    ) -> ProgramResult {
        let fund = &ctx.accounts.fund;
        let sell_data = &mut ctx.accounts.sell_data;
        let seller = &ctx.accounts.seller;

        sell_data.fund = fund.to_account_info().key();
        sell_data.seller = *seller.key;
        sell_data.amount = amount;
        sell_data.supply_snapshot = fund.index_token_supply;
        sell_data.asset_index = 0;

        sell_data.bump = *ctx.bumps.get("sell_data").unwrap();

        Ok(())
    }

    pub fn sell_fund<'info>(
        ctx: Context<'_, '_, '_, 'info, SellFund<'info>>
    ) -> ProgramResult {
        let fund: &mut Account<Fund> = &mut ctx.accounts.fund;
        let fund_usdc_ata = &ctx.accounts.fund_usdc_ata;
        let index_mint = &ctx.accounts.index_token_mint;
        let seller = &ctx.accounts.seller;
        let seller_usdc_ata = &ctx.accounts.seller_usdc_ata;
        let seller_index_ata = &ctx.accounts.seller_index_ata;
        let sell_data = &mut ctx.accounts.sell_data;
        let token_program = &ctx.accounts.token_program;
        let _system_program = &ctx.accounts.system_program;
        let dex_program = &ctx.accounts.dex_program;
        let rent_sysvar = &ctx.accounts.rent;

        // buy_data must match this fund
        require!(
            sell_data.fund == fund.to_account_info().key(),
            Err(AkuraError::InvalidSellData.into())
        );
        // ensure init_buy_data was run first
        require!(
            sell_data.amount != 0,
            Err(AkuraError::InvalidSellData.into())
        );

        require!(
            fund.index_token_mint == index_mint.to_account_info().key(),
            Err(AkuraError::InvalidFundMint.into())
        );

        if sell_data.asset_index == 0 {

            msg!("burning index tokens");

            burn_spl(
                &index_mint.to_account_info(),
                &seller_index_ata.to_account_info(),
                &seller.to_account_info(),
                sell_data.amount,
                &token_program.to_account_info(),
                gen_fund_mint_signer_seeds!(fund),
            )?;

            fund.index_token_supply -= sell_data.amount;
        }

        let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();
        let market = next_account_info(remaining_accounts_iter)?;
        let open_orders = next_account_info(remaining_accounts_iter)?;
        let request_queue = next_account_info(remaining_accounts_iter)?;
        let event_queue = next_account_info(remaining_accounts_iter)?;
        let bids = next_account_info(remaining_accounts_iter)?;
        let asks = next_account_info(remaining_accounts_iter)?;
        let coin_vault = next_account_info(remaining_accounts_iter)?;
        let pc_vault = next_account_info(remaining_accounts_iter)?;
        let vault_signer = next_account_info(remaining_accounts_iter)?;
        let coin_wallet = next_account_info(remaining_accounts_iter)?;

        // require!(
        //     asset_mint.to_account_info().key() == fund.assets[buy_data.asset_index as usize],
        //     Err(AkuraError::WrongTokenMint.into())
        // );

        // let fund_asset_ata = get_associated_token_address(
        //     &fund.to_account_info().key(),
        //     &asset_mint.to_account_info().key()
        // );

        // require!(
        //     fund_asset_ata == coin_wallet.to_account_info().key(),
        //     Err(AkuraError::InvalidFundAta.into())
        // );

        // guaranteed to not overflow on multiplication
        // supply_snapshot can't be zero since this seller at least owns some
        let reserve = token::accessor::amount(&coin_wallet.to_account_info())?;
        let amount = (reserve*sell_data.amount)/sell_data.supply_snapshot;

        msg!("amount to swap: {}", amount);

        let old_usdc_amount = token::accessor::amount(&fund_usdc_ata.to_account_info())?;

        serum_swap(
            amount,
            Side::Ask,
            &fund_usdc_ata.to_account_info(),
            coin_wallet,
            &fund.to_account_info(),
            market,
            open_orders,
            request_queue,
            event_queue,
            bids,
            asks,
            coin_vault,
            pc_vault,
            vault_signer,
            dex_program,
            token_program,
            rent_sysvar,
            gen_fund_signer_seeds!(fund),
        )?;

        sell_data.asset_index += 1;

        let new_usdc_amount = token::accessor::amount(&fund_usdc_ata.to_account_info())?;
        let liquidated_amount = new_usdc_amount - old_usdc_amount;

        transfer_spl(
            &fund.to_account_info(),
            &fund_usdc_ata.to_account_info(),
            &seller_usdc_ata.to_account_info(),
            liquidated_amount,
            &token_program.to_account_info(),
            gen_fund_signer_seeds!(fund),
        )?;

        if sell_data.asset_index == fund.num_assets {
            // reset sell data
            sell_data.amount = 0;
            sell_data.supply_snapshot = 0;
            sell_data.asset_index = 0;
        }

        Ok(())
    }
}