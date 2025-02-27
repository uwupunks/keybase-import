# dmdz-processor
Process bridge transactions to/from solana/cosmos

# Install
`npm i`

# Setup
Copy the `.env.example` into a .env file and add the required API keys.

You will need a solana file wallet (token mint authority) and a cosmos mnemonic to sign the transactions. Place these in the .env file

# Running

Process pending cosmos transactions
`npm run to-cosmos`

Process pending salami transactions
`npm run to-solana`

# Persistence
A simple db.json file is created to track which pending transactions have been processed.

NOTE: for first time use, be sure to seed the DB and set 'processed": true' on each DB otherwise you will process duplicate transactions.

TODO: Seed DB functionality

```
    {
      "from_address": "Ef9iYPyBCxM5FPQWpcsZDk5ddTtEQeeqnGb1nwrqqbg",
      "memo": "unicorn12q9hscscxt0j2vxtas4vpenj7fh6apvv2r90s0",
      "amount": 2750000,
      "txhash": "fkaGKNuxnc7944JRmVWfx4ZegdjcmMyq8kyUC83AEWQJyrhz74Zx6QEPsHpR4PyBr2tERZgspySQt4VneycPHnw",
      "blockTime": 1729110720,
      "cns": somebody.unicorn,
      "processed": true,
      "processedTxHash": "83F7E6028BA0D4B7D58EC190F2E700CF320933B0B9CDA2D8EDED7635FC9B5E06"
    },
```