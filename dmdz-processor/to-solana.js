import "dotenv/config";
import { JSONFilePreset } from "lowdb/node";
import { Connection } from "@solana/web3.js";
import { fetchPendingToSolana } from "./pendingSolana/index.js";
import { sendTokens } from "./util/solana/index.js";
import { input } from "@inquirer/prompts";
import throttledQueue from "throttled-queue";
const throttle = throttledQueue(3, 1000);

const LAMPORTS_PER_COSMOS = 1000;
const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_APIKEY}`,
  //`https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`,
  {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 45000,
  }
);

const db = await JSONFilePreset("db.json", { toCosmos: [], toSolana: [] });

//-------to solana-----------
// get dmdz sent to unicornbridge.unicorn
const fetched2 = await fetchPendingToSolana();
const existing2 = db.data.toSolana.map((e) => e.txhash);
const newTxns2 = fetched2
  .filter((t) => !existing2.includes(t.txhash))
  .map((n) => ({ ...n, processed: false }));
await db.update(({ toSolana }) => toSolana.push(...newTxns2));

// process cosmos to solana
const pendingToSolana = db.data.toSolana.filter((p) => p.processed === false);

if (pendingToSolana.length === 0) {
  console.info("No new transactions to process. Exiting...");
  process.exit();
} else {
  console.log(`${pendingToSolana.length} pending transactions...`);
  console.log(pendingToSolana.map(p=>p.txhash))
}
var response;
await input({ message: "Process these now? ctrl+c to exit" });

const promises = pendingToSolana.map(async (p) => {
  try {
    const processedIndex = db.data.toSolana.findIndex(
      (obj) => obj.txhash === p.txhash
    );
    const toProcess = db.data.toSolana[processedIndex];
    const amount = toProcess.amount * LAMPORTS_PER_COSMOS;
    const amountMinusFees =
      parseInt(0.985 * toProcess.amount) * LAMPORTS_PER_COSMOS;
    console.log(`Processing tx: ${toProcess.txhash}`);
    console.log(`Amount: ${amount} lamports`);
    console.log(`Amount After Fees: ${amountMinusFees} `);
    console.log(`Dest: ${toProcess.memo}`);

    //process send
    const processedTxHash = await throttle(async () => {
      const sendResult = await sendTokens(
        connection,
        amountMinusFees,
        toProcess.memo,
        toProcess.from_address
      ).catch((e) => console.error(e));
      return sendResult;
    });

    toProcess.processed = true;
    toProcess.processedTxHash = processedTxHash;
    console.log(`Processed tx: ${toProcess.txhash}`);
    return { src: toProcess.txhash, dest: processedTxHash };
  } catch (e) {
    return { src: p.txhash, error: e };
  }
});

const results = await Promise.allSettled(promises);
console.log(
  results.map((r) => ({ status: r.status, txhash: r.value, error: r.reason }))
);
await db.update(({ toSolana }) => toSolana);
