import { TransactionExpiredBlockheightExceededError } from "@solana/web3.js";
import promiseRetry from "promise-retry";
import { wait } from "./wait.js";

import throttledQueue from "throttled-queue";
const throttle = throttledQueue(3, 1000);

const COMMITMENT_STRAT = "confirmed";

const pollSignatureStatus = async (txid, signal, connection, controller) => {
  // in case ws socket died
  while (!signal.aborted) {
    await wait(4_000);
    const tx = await throttle(async () => {
      return await connection.getSignatureStatus(txid, {
        searchTransactionHistory: false,
      });
    });
    if (tx?.value?.confirmationStatus === COMMITMENT_STRAT) {
      controller.abort();
      return tx;
    }
  }
};

export async function transactionSenderAndConfirmationWaiter({
  connection,
  transaction,
}) {
  const txid = await connection.sendTransaction(transaction, {
    commitment: COMMITMENT_STRAT,
  });

  const controller = new AbortController();
  const abortSignal = controller.signal;

  const abortableResender = async () => {
    while (true) {
      if (abortSignal.aborted) return;
      
      await wait(5_000);
      const status = await connection.getSignatureStatus(txid, {
        searchTransactionHistory: false,
      });
      if (status?.value?.confirmationStatus !== COMMITMENT_STRAT) {
        try {
          await connection.sendTransaction(transaction);
        } catch (e) {
          console.warn(`Failed to resend transaction: ${e}`);
        }
      }
    }
  };

  try {
    abortableResender();
    // this would throw TransactionExpiredBlockheightExceededError
    await Promise.race([
      connection.confirmTransaction(txid, COMMITMENT_STRAT),
      pollSignatureStatus(txid, abortSignal, connection, controller),
    ]);
  } catch (e) {
    if (e instanceof TransactionExpiredBlockheightExceededError) {
      console.error(e);
      // we consume this error and getTransaction would return null
      return null;
    } else {
      // invalid state from web3.js
      throw e;
    }
  } finally {
    controller.abort();
  }

  // in case rpc is not synced yet, we add some retries
  const response = promiseRetry(
    async (retry) => {
      const response = await connection.getTransaction(txid, {
        commitment: COMMITMENT_STRAT,
        maxSupportedTransactionVersion: 0,
      });
      if (!response) {
        retry(response);
      }
      return response;
    },
    {
      retries: 5,
      minTimeout: 2e3,
    }
  );

  return response;
}
