import { TransactionExpiredBlockheightExceededError } from "@solana/web3.js";
import promiseRetry from "promise-retry";
import { wait } from "./wait.js";

const COMMITMENT_STRAT = "confirmed";


const pollSignatureStatus = async (txid, signal, connection) => {
  // in case ws socket died
  while (!signal.aborted) {
    await wait(2_000);
    const tx = await connection.getSignatureStatus(txid, {
      searchTransactionHistory: false,
    });
    if (tx?.value?.confirmationStatus === COMMITMENT_STRAT) {
      return tx;
    }
  }
}


export async function transactionSenderAndConfirmationWaiter({
  connection,
  sendTransaction,
  transaction,
  blockhashWithExpiryBlockHeight,
}) {

  const txid = await sendTransaction(transaction, connection);

  const controller = new AbortController();
  const abortSignal = controller.signal;

  const abortableResender = async () => {
    while (true) {
      await wait(5_000);
      if (abortSignal.aborted) return;
      try {
        await sendTransaction(transaction, connection);
      } catch (e) {
        console.warn(`Failed to resend transaction: ${e}`);
      }
    }
  };

  try {
    abortableResender();
    const lastValidBlockHeight =
      blockhashWithExpiryBlockHeight.lastValidBlockHeight - 150;
    if (isNaN(lastValidBlockHeight)) {
      throw new Error(
        "Invalid blockhashWithExpiryBlockHeight",
        blockhashWithExpiryBlockHeight
      );
    }
    // this would throw TransactionExpiredBlockheightExceededError
    await Promise.race([
      connection.confirmTransaction(
        {
          ...blockhashWithExpiryBlockHeight,
          lastValidBlockHeight,
          signature: txid,
          abortSignal,
        },
        COMMITMENT_STRAT
      ),
      pollSignatureStatus(txid, abortSignal, connection),
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
