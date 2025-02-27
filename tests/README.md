# SPL Spatial Memo Tests

This directory contains tests for the SPL Spatial Memo program.

## Prerequisites

- Node.js (v16 or later)
- pnpm
- Solana CLI tools
- A Solana wallet with devnet SOL

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Make sure you have a Solana keypair at `~/.config/solana/id.json` with some devnet SOL.

## Running Tests

To run the spatial memo test:

```bash
pnpm test
```

This will:
1. Connect to Solana devnet
2. Send a transaction with spatial data to the SPL Spatial Memo program
3. Verify the transaction was successful
4. Display the transaction logs

## Test Output

A successful test will show output similar to:

```
Transaction logs:
  Program SCRcKjZtuyQHCBTenEpSzKABTqSq5CaKpHRnRgDvgjV invoke [1]
  Program log: Signed by <your-wallet-address>
  Program log: Memo (len 171): "{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-122.4194,37.7749]},\"properties\":{\"name\":\"San Francisco\",\"type\":\"city\",\"timestamp\":\"2025-02-27T15:42:33.251Z\"}}"
  Program SCRcKjZtuyQHCBTenEpSzKABTqSq5CaKpHRnRgDvgjV consumed 27036 of 200000 compute units
  Program SCRcKjZtuyQHCBTenEpSzKABTqSq5CaKpHRnRgDvgjV success
✅ Success! Transaction processed by our Spatial Memo program.
✅ Spatial data was successfully recorded on-chain.
✅ Transaction executed without errors.
```

## Modifying the Test

You can modify the spatial data in `test-spatial-memo.ts` to test different types of spatial content records. 