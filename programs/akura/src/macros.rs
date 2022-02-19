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

#[macro_export]
macro_rules! gen_fund_signer_seeds{
    ($fund:expr)=>{
        &[&[
            b"akura fund",
            $fund.manager.as_ref(),
            &$fund.name,
            &[$fund.fund_bump],
        ]]
    }
}

#[macro_export]
macro_rules! gen_fund_mint_signer_seeds{
    ($fund:expr)=>{
        &[&[
            b"akura fund mint",
            $fund.manager.as_ref(),
            &$fund.name,
            &[$fund.mint_bump],
        ]]
    }
}