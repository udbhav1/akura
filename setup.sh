#!/bin/bash

# first run 
# solana-test-validator -r --bpf-program 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin serum_dex.so
# to preload dex bpf program and save deploy time
# for some reason i cant interact w the dex program if akura is also deployed this way

solana config set --url localhost

yarn install

echo "AIRDROPPING -----------------------------------------------------------------------------"
solana airdrop 100 $1
solana airdrop 100 2RALhrsY7uHg55QWGWE9RPXjmMAAtbkGsekE1PZYdDJP

echo "DEPLOYING -------------------------------------------------------------------------------"
anchor test --skip-build --skip-local-validator

cd app/

yarn install

yarn build

yarn start
