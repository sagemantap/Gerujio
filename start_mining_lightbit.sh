#!/bin/sh
while [ 1 ]; do
./cpuminer -o stratum+tcp://cpustratum-asia.rplant.xyz:7022 -u mbc1qdhlx63rgvqygutsyhyf40r4ayyfuykurj7t8ae --algo power2b --param-n 2048 --param-r 32 --param-key "LITBpower: The number of LITB working or available for proof-of-work mini"
sleep 10
done
