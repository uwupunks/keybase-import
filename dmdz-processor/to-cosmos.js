import "dotenv/config";
import { JSONFilePreset } from "lowdb/node";
import { fetchPendingToCosmos } from "./pendingCosmos/index.js";
import { buildMessage, signAndBroadcastMessages } from "./util/cosmos/index.js";
import { input } from "@inquirer/prompts";

const LAMPORTS_PER_COSMOS = 1000;

const db = await JSONFilePreset("db.json", { toCosmos: [], toSolana: [] });

//-------to cosmos-----------
// get dmdz sent to unicornbridge.sol
const fetched = await fetchPendingToCosmos();
const existing = db.data.toCosmos.map((e) => e.txhash);
const newTxns = fetched
  .filter((t) => !existing.includes(t.txhash))
  .map((n) => ({ ...n, processed: false }));
await db.update(({ toCosmos }) => toCosmos.push(...newTxns));

// process solana to cosmos
const pendingToCosmos = db.data.toCosmos.filter((p) => p.processed === false);

console.log(pendingToCosmos);
if (pendingToCosmos.length === 0) {
  console.info("No new transactions to process. Exiting...");
  process.exit();
} else {
  console.log(`${pendingToCosmos.length} pending transactions...`);
  console.log(pendingToCosmos.map(p=>p.txhash))
}
await input({ message: "Process these now? ctrl+c to exit" });

const messages = pendingToCosmos.map((p) => {
  try {
    const processedIndex = db.data.toCosmos.findIndex(
      (obj) => obj.txhash === p.txhash
    );
    const toProcess = db.data.toCosmos[processedIndex];
    const amount = parseInt(toProcess.amount / LAMPORTS_PER_COSMOS);
    const amountMinusFees = parseInt(
      (0.985 * toProcess.amount) / LAMPORTS_PER_COSMOS
    );
    console.log(`Processing tx: ${toProcess.txhash}`);
    console.log(`Amount: ${amount} cosmos units`);
    console.log(`Amount After Fees: ${amountMinusFees} `);
    console.log(`Dest: ${toProcess.memo}`);

    //build message
    const message = buildMessage(
      amountMinusFees,
      toProcess.memo,
      toProcess.from_address
    );

    toProcess.processed = true;
    console.log(
      `Built message: to:${message.value.toAddress} amt: ${message?.value?.amount[0]?.amount} `
    );
    return message;
  } catch (e) {
    console.error(e);
    return null;
  }
});

const transactionHash = await signAndBroadcastMessages(messages);

// Update DB with multi send tx hash
if (transactionHash) {
  console.log(`Multi Send Success: ${transactionHash}`);
  pendingToCosmos.map((p) => {
    try {
      const processedIndex = db.data.toCosmos.findIndex(
        (obj) => obj.txhash === p.txhash
      );
      const toProcess = db.data.toCosmos[processedIndex];
      toProcess.processedTxHash = transactionHash;
      console.log(toProcess);
    } catch (e) {
      console.error(e);
    }
  });

  await db.update(({ toCosmos }) => toCosmos);
} else {
  console.error(`Multi Send ERROR`);
}
