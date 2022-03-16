# Akura

Akura brings permissionless, non-custodial index funds & ETFs to Solana. Anyone can create a fund and earn fees based on how much other users deposit. All funds are tokenized and can be traded on a DEX, used as collateral, or farmed in liquidity pools.

Akura currently uses the Serum orderbook to buy and sell the underlying assets in a fund, but in the future it will also integrate with swap aggregators to get the best prices.

## Demo Video

## Run UI Locally

Total setup time should be less than 5 minutes

```
git clone https://github.com/udbhav1/akura && cd akura

# in a separate terminal session in this directory, run
solana-test-validator -r --bpf-program 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin serum_dex.so

# edit 'userAddress.json' to be your browser wallet address, then
./setup.sh <your browser wallet address>
```

Visit `localhost:3000` to interact with the frontend

