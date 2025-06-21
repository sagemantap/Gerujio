#!/bin/sh
while [ 1 ]; do
./cpuminer -o stratum+tcp://cpu-pool.com:63398 -u WALLET_ADDRESS --algo yespower --param-n 2048 --param-r 32 --param-key "LITBpower: The number of LITB working or available for proof-of-work mini"
sleep 10
done
