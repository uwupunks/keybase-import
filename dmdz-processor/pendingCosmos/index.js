import { getCNSAsync } from "../util/cns.js";
import throttledQueue from "throttled-queue";
import { Connection } from "@solana/web3.js";

const throttle = throttledQueue(7, 1000);
const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_APIKEY}`,
  //`https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,
  //'https://api.mainnet-beta.solana.com',
  {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 45000,
  }
);
const requestOptions = {
  method: "get",
  headers: {
    accept: "application/json",
    ApiKey: process.env.SOLANAFM_APIKEY,
  },
};

const fetchPendingToCosmos = async () => {
  try {
    const fromTimestamp = "1734588000",
      toTimestamp = parseInt(new Date().getTime() / 1000).toString();
    const transfers = await fetch(
      `https://api.solana.fm/v0/accounts/${process.env.SOL_BRIDGE_ADDRESS}/transactions?utcFrom=${fromTimestamp}&utcTo=${toTimestamp}&inflow=true&mint=${process.env.DIAMOND_MINT_ADDRESS}&page=1`,
      requestOptions
    )
      .then((res) => res.json())
      .then((res) => {
        console.log(res);
        return res?.result?.data?.filter(
          (t) =>
            t.confirmationStatus === "finalized" &&
            t.memo &&
            t.memo.includes("unicorn")
        );
      })
      .catch((err) => console.error(err));

    const parsedTransactions = await connection.getParsedTransactions(
      transfers.map((t) => t?.signature),
      {
        maxSupportedTransactionVersion: 0,
        encoding: "jsonParsed",
      }
    );
    const txnPromises = parsedTransactions.map(async (t) => ({
        from_address: t.transaction.message.accountKeys
          .find((a) => a.signer)
          ?.pubkey?.toString(),
        memo: t.transaction.message.instructions.find(
          (ins) => ins.program === "spl-memo"
        )?.parsed,
        amount:
          t.transaction.message.instructions.find(
            (ins) =>
              ins.program === "spl-token" &&
              ins.parsed.info.destination === process.env.SOL_BRIDGE_TOKEN_ACCT
          )?.parsed.info.amount ||
          t.transaction.message.instructions.find(
            (ins) =>
              ins.program === "spl-token" &&
              ins.parsed.info.destination === process.env.SOL_BRIDGE_TOKEN_ACCT
          )?.parsed.info.tokenAmount.amount,
        txhash: t.transaction.signatures[0],
        blockTime: t.blockTime,
        cns: await throttle(async () => {
          return await getCNSAsync(
            t.transaction.message.instructions.find(
              (ins) => ins.program === "spl-memo"
            )?.parsed
          );
        }),
      })),
      settled = await Promise.allSettled(txnPromises).then((results) =>
        results.map((r) => r.value)
      );
    return settled || [];
  } catch (e) {
    console.error("ERROR: could not fetch pending txns from solana");
    console.error(e);
    return [];
  }
};

export { fetchPendingToCosmos };
