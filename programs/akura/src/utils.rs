use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    system_instruction,
    program::invoke,
    program::invoke_signed
};
use std::mem::size_of;
use std::num::NonZeroU64;
use anchor_spl::dex::serum_dex::state::OpenOrders;
use anchor_spl::token;
use anchor_spl::dex;
use anchor_spl::dex::serum_dex::state::MarketState;
use anchor_spl::dex::serum_dex::instruction::SelfTradeBehavior;
use anchor_spl::dex::serum_dex::matching::{OrderType, Side as SerumSide};

mod empty {
    use super::*;
    declare_id!("HJt8Tjdsc9ms9i4WCZEzhzr4oyf3ANcdzXrNdLPFqm3M");
}

pub fn create_account<'info>(
    new_account: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
    lamports: u64,
    space: u64,
 ) -> ProgramResult {
    invoke(
        &system_instruction::create_account(
            &payer.key(),
            &new_account.key(),
            lamports,
            space,
            &owner.key()
        ),
        &[
            payer.to_account_info(),
            new_account.to_account_info(),
        ]
    )?;

    Ok(())
}

pub fn create_ata<'info>(
    payer: &AccountInfo<'info>,
    wallet: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    ata: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    ata_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    rent_sysvar: &AccountInfo<'info>,
) -> ProgramResult {

    invoke_signed(
        &spl_associated_token_account::create_associated_token_account(
            &payer.key(),
            &wallet.key(),
            &mint.key(),
        ),
        &[
            ata.to_account_info(),
            wallet.to_account_info(),
            mint.to_account_info(),
            payer.to_account_info(),
            token_program.to_account_info(),
            ata_program.to_account_info(),
            system_program.to_account_info(),
            rent_sysvar.to_account_info(),
        ],
        &[],
    )?;

    Ok(())
}

pub fn create_ata_if_necessary<'info>(
    payer: &AccountInfo<'info>,
    wallet: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    ata: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    ata_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    rent_sysvar: &AccountInfo<'info>,
) -> ProgramResult {

    if ata.to_account_info().data_is_empty() {
        create_ata(
            payer,
            wallet,
            mint,
            ata,
            token_program,
            ata_program,
            system_program,
            rent_sysvar
        )?;
    }

    Ok(())
}

pub fn transfer_spl<'info>(
    src: &AccountInfo<'info>,
    src_ata: &AccountInfo<'info>,
    dst_ata: &AccountInfo<'info>,
    amount: u64,
    token_program: &AccountInfo<'info>,
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
    src: &AccountInfo<'info>,
    dst: &AccountInfo<'info>,
    amount: u64,
    system_program: &AccountInfo<'info>
) -> ProgramResult {

    invoke(
        &system_instruction::transfer(&src.key(), &dst.key(), amount),
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

pub fn mint_spl<'info>(
    mint: &AccountInfo<'info>,
    mint_owner: &AccountInfo<'info>,
    dst: &AccountInfo<'info>,
    amount: u64,
    token_program: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]]
) -> ProgramResult {

    invoke_signed(
        &spl_token::instruction::mint_to(
            &token_program.key(),
            &mint.key(),
            &dst.key(),
            &mint_owner.key(),
            &[],
            amount,
        )?,
        &[
            mint.to_account_info(),
            dst.to_account_info(),
            mint_owner.to_account_info(),
            token_program.to_account_info()
        ],
        signer_seeds,
    )?;

    Ok(())
}

pub fn burn_spl<'info>(
    mint: &AccountInfo<'info>,
    dst: &AccountInfo<'info>,
    dst_owner: &AccountInfo<'info>,
    amount: u64,
    token_program: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]]
) -> ProgramResult {

    invoke_signed(
        &spl_token::instruction::burn(
            &token_program.key(),
            &dst.key(),
            &mint.key(),
            &dst_owner.key(),
            &[],
            amount,
        )?,
        &[
            mint.to_account_info(),
            dst.to_account_info(),
            dst_owner.to_account_info(),
            token_program.to_account_info()
        ],
        signer_seeds,
    )?;

    Ok(())
}

//////////////////// DEX UTILS ////////////////////

pub fn init_open_orders_account<'info>(
    open_orders: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    market: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    dex_program: &AccountInfo<'info>,
    rent_sysvar: &Sysvar<'info, Rent>,
    signer_seeds: &[&[&[u8]]]
 ) -> ProgramResult {
     // 12 is from from anchor cfo example
    let space = 12 + size_of::<OpenOrders>();
    let exemption = rent_sysvar.minimum_balance(space);

    create_account(
        open_orders,
        payer,
        dex_program,
        exemption,
        space as u64,
    )?;

    let cpi_accounts = dex::InitOpenOrders {
        open_orders: open_orders.to_account_info(),
        authority: authority.to_account_info(),
        market: market.to_account_info(),
        rent: rent_sysvar.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(dex_program.to_account_info(), cpi_accounts);

    dex::init_open_orders(cpi_ctx.with_signer(signer_seeds))?;

    Ok(())
}

#[inline(never)]
pub fn serum_swap<'info>(
    amount: u64,
    side: Side,
    usdc_wallet: &AccountInfo<'info>,
    base_wallet: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    market: &AccountInfo<'info>,
    open_orders: &AccountInfo<'info>,
    request_queue: &AccountInfo<'info>,
    event_queue: &AccountInfo<'info>,
    bids: &AccountInfo<'info>,
    asks: &AccountInfo<'info>,
    coin_vault: &AccountInfo<'info>,
    pc_vault: &AccountInfo<'info>,
    vault_signer: &AccountInfo<'info>,
    dex_program: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    rent_sysvar: &Sysvar<'info, Rent>,
    signer_seeds: &[&[&[u8]]],
) -> ProgramResult {
    // let mut exr = serum_swap::ExchangeRate {
    //     rate: 0,
    //     from_decimals: 6,
    //     quote_decimals: 6,
    //     strict: false
    // };

    // exr.quote_decimals = 0;
    let referral = Option::<AccountInfo<'info>>::None;

    let from_token;
    let to_token;
    if let Side::Bid = side {
        from_token = usdc_wallet;
        to_token = base_wallet;
    } else {
        from_token = base_wallet;
        to_token = usdc_wallet;
    }

    let _from_amount_before = token::accessor::amount(from_token)?;
    let _to_amount_before = token::accessor::amount(to_token)?;

    let market_accounts: MarketAccounts;
    let orderbook: OrderbookClient;

    if let Side::Bid = side {
        market_accounts = MarketAccounts {
            market: market.to_account_info(),
            open_orders: open_orders.to_account_info(),
            request_queue: request_queue.to_account_info(),
            event_queue: event_queue.to_account_info(),
            bids: bids.to_account_info(),
            asks: asks.to_account_info(),
            order_payer_token_account: usdc_wallet.to_account_info(),
            coin_vault: coin_vault.to_account_info(),
            pc_vault: pc_vault.to_account_info(),
            vault_signer: vault_signer.to_account_info(),
            coin_wallet: base_wallet.to_account_info(),
        };

        orderbook = OrderbookClient {
            market: market_accounts,
            authority: authority.to_account_info(),
            pc_wallet: usdc_wallet.to_account_info(),
            dex_program: dex_program.to_account_info(),
            token_program: token_program.to_account_info(),
            rent: rent_sysvar.to_account_info()
        };

        msg!("buying tokens");
        orderbook.buy(amount, None, signer_seeds)?;
    } else {
        market_accounts = MarketAccounts {
            market: market.to_account_info(),
            open_orders: open_orders.to_account_info(),
            request_queue: request_queue.to_account_info(),
            event_queue: event_queue.to_account_info(),
            bids: bids.to_account_info(),
            asks: asks.to_account_info(),
            order_payer_token_account: base_wallet.to_account_info(),
            coin_vault: coin_vault.to_account_info(),
            pc_vault: pc_vault.to_account_info(),
            vault_signer: vault_signer.to_account_info(),
            coin_wallet: base_wallet.to_account_info(),
        };

        orderbook = OrderbookClient {
            market: market_accounts,
            authority: authority.to_account_info(),
            pc_wallet: usdc_wallet.to_account_info(),
            dex_program: dex_program.to_account_info(),
            token_program: token_program.to_account_info(),
            rent: rent_sysvar.to_account_info()
        };

        msg!("selling tokens");
        orderbook.sell(amount, None, signer_seeds)?;
    }

    msg!("settling order");
    orderbook.settle(referral, signer_seeds)?;

    Ok(())
}

/// pretty much the serum_swap code but with signer seeds

// Returns the amount of lots for the base currency of a trade with `size`.
fn coin_lots(market: &MarketState, size: u64) -> u64 {
    size.checked_div(market.coin_lot_size).unwrap()
}

// Market accounts are the accounts used to place orders against the dex minus
// common accounts, i.e., program ids, sysvars, and the `pc_wallet`.
#[derive(Accounts, Clone)]
pub struct MarketAccounts<'info> {
    #[account(mut)]
    pub market: AccountInfo<'info>,
    #[account(mut)]
    pub open_orders: AccountInfo<'info>,
    #[account(mut)]
    pub request_queue: AccountInfo<'info>,
    #[account(mut)]
    pub event_queue: AccountInfo<'info>,
    #[account(mut)]
    pub bids: AccountInfo<'info>,
    #[account(mut)]
    pub asks: AccountInfo<'info>,
    // The `spl_token::Account` that funds will be taken from, i.e., transferred
    // from the user into the market's vault.
    //
    // For bids, this is the base currency. For asks, the quote.
    #[account(mut, constraint = order_payer_token_account.key != &empty::ID)]
    pub order_payer_token_account: AccountInfo<'info>,
    // Also known as the "base" currency. For a given A/B market,
    // this is the vault for the A mint.
    #[account(mut)]
    pub coin_vault: AccountInfo<'info>,
    // Also known as the "quote" currency. For a given A/B market,
    // this is the vault for the B mint.
    #[account(mut)]
    pub pc_vault: AccountInfo<'info>,
    // PDA owner of the DEX's token accounts for base + quote currencies.
    pub vault_signer: AccountInfo<'info>,
    // User wallets.
    #[account(mut, constraint = coin_wallet.key != &empty::ID)]
    pub coin_wallet: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum Side {
    Bid,
    Ask,
}

impl From<Side> for SerumSide {
    fn from(side: Side) -> SerumSide {
        match side {
            Side::Bid => SerumSide::Bid,
            Side::Ask => SerumSide::Ask,
        }
    }
}

// Client for sending orders to the Serum DEX.
#[derive(Clone)]
struct OrderbookClient<'info> {
    market: MarketAccounts<'info>,
    authority: AccountInfo<'info>,
    pc_wallet: AccountInfo<'info>,
    dex_program: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    rent: AccountInfo<'info>,
}

impl<'info> OrderbookClient<'info> {
    // Executes the sell order portion of the swap, purchasing as much of the
    // quote currency as possible for the given `base_amount`.
    //
    // `base_amount` is the "native" amount of the base currency, i.e., token
    // amount including decimals.
    #[inline(never)]
    fn sell(
        &self,
        base_amount: u64,
        srm_msrm_discount: Option<AccountInfo<'info>>,
        signer_seeds: &[&[&[u8]]]
    ) -> ProgramResult {
        let limit_price = 1;
        let max_coin_qty = {
            // The loaded market must be dropped before CPI.
            let market = MarketState::load(&self.market.market, &dex::ID)?;
            coin_lots(&market, base_amount)
        };
        let max_native_pc_qty = u64::MAX;
        self.order_cpi(
            limit_price,
            max_coin_qty,
            max_native_pc_qty,
            Side::Ask,
            srm_msrm_discount,
            signer_seeds
        )
    }

    // Executes the buy order portion of the swap, purchasing as much of the
    // base currency as possible, for the given `quote_amount`.
    //
    // `quote_amount` is the "native" amount of the quote currency, i.e., token
    // amount including decimals.
    #[inline(never)]
    fn buy(
        &self,
        quote_amount: u64,
        srm_msrm_discount: Option<AccountInfo<'info>>,
        signer_seeds: &[&[&[u8]]]
    ) -> ProgramResult {
        let limit_price = u64::MAX;
        let max_coin_qty = u64::MAX;
        let max_native_pc_qty = quote_amount;
        self.order_cpi(
            limit_price,
            max_coin_qty,
            max_native_pc_qty,
            Side::Bid,
            srm_msrm_discount,
            signer_seeds
        )
    }

    // Executes a new order on the serum dex via CPI.
    //
    // * `limit_price` - the limit order price in lot units.
    // * `max_coin_qty`- the max number of the base currency lot units.
    // * `max_native_pc_qty` - the max number of quote currency in native token
    //                         units (includes decimals).
    // * `side` - bid or ask, i.e. the type of order.
    // * `referral` - referral account, earning a fee.
    #[inline(never)]
    fn order_cpi(
        &self,
        limit_price: u64,
        max_coin_qty: u64,
        max_native_pc_qty: u64,
        side: Side,
        srm_msrm_discount: Option<AccountInfo<'info>>,
        signer_seeds: &[&[&[u8]]]
    ) -> ProgramResult {
        // Client order id is only used for cancels. Not used here so hardcode.
        let client_order_id = 0;
        // Limit is the dex's custom compute budge parameter, setting an upper
        // bound on the number of matching cycles the program can perform
        // before giving up and posting the remaining unmatched order.
        let limit = 65535;

        let mut ctx = CpiContext::new(self.dex_program.clone(), self.clone().into());
        if let Some(srm_msrm_discount) = srm_msrm_discount {
            ctx = ctx.with_remaining_accounts(vec![srm_msrm_discount]);
        }
        dex::new_order_v3(
            ctx.with_signer(signer_seeds),
            side.into(),
            NonZeroU64::new(limit_price).unwrap(),
            NonZeroU64::new(max_coin_qty).unwrap(),
            NonZeroU64::new(max_native_pc_qty).unwrap(),
            SelfTradeBehavior::DecrementTake,
            OrderType::ImmediateOrCancel,
            client_order_id,
            limit,
        )
    }

    #[inline(never)]
    fn settle(
        &self,
        referral: Option<AccountInfo<'info>>,
        signer_seeds: &[&[&[u8]]]
    ) -> ProgramResult {
        let settle_accs = dex::SettleFunds {
            market: self.market.market.clone(),
            open_orders: self.market.open_orders.clone(),
            open_orders_authority: self.authority.clone(),
            coin_vault: self.market.coin_vault.clone(),
            pc_vault: self.market.pc_vault.clone(),
            coin_wallet: self.market.coin_wallet.clone(),
            pc_wallet: self.pc_wallet.clone(),
            vault_signer: self.market.vault_signer.clone(),
            token_program: self.token_program.clone(),
        };
        let mut ctx = CpiContext::new(self.dex_program.clone(), settle_accs);
        if let Some(referral) = referral {
            ctx = ctx.with_remaining_accounts(vec![referral]);
        }
        dex::settle_funds(ctx.with_signer(signer_seeds))
    }
}

impl<'info> From<OrderbookClient<'info>> for dex::NewOrderV3<'info> {
    fn from(c: OrderbookClient<'info>) -> dex::NewOrderV3<'info> {
        dex::NewOrderV3 {
            market: c.market.market.clone(),
            open_orders: c.market.open_orders.clone(),
            request_queue: c.market.request_queue.clone(),
            event_queue: c.market.event_queue.clone(),
            market_bids: c.market.bids.clone(),
            market_asks: c.market.asks.clone(),
            order_payer_token_account: c.market.order_payer_token_account.clone(),
            open_orders_authority: c.authority.clone(),
            coin_vault: c.market.coin_vault.clone(),
            pc_vault: c.market.pc_vault.clone(),
            token_program: c.token_program.clone(),
            rent: c.rent.clone(),
        }
    }
}