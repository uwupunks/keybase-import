import fs from "fs";
import {
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { transactionSenderAndConfirmationWaiter } from "./transactionSender/index.js";
import throttledQueue from "throttled-queue";
const throttle = throttledQueue(3, 1000);

function loadKeypairFromFile() {
  const secret = JSON.parse(fs.readFileSync(process.env.SOL_SIGNER).toString());
  const secretKey = Uint8Array.from(secret);
  return Keypair.fromSecretKey(secretKey);
}
const mintWallet = loadKeypairFromFile();

const sendTokens = async (connection, amountInLamports, dest, memo) => {
  try {
    if (!amountInLamports || !dest) {
      console.error("Address and amount required.");
      return;
    }
    if (amountInLamports / LAMPORTS_PER_SOL < 0.000197) {
      console.error("Minimum send is 0.0002 💎");
      return;
    }

    const srcAccount = await connection.getParsedTokenAccountsByOwner(
      mintWallet.publicKey,
      {
        mint: new PublicKey(process.env.DIAMOND_MINT_ADDRESS),
      }
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintWallet,
      new PublicKey(process.env.DIAMOND_MINT_ADDRESS),
      new PublicKey(dest),
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const computePriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 200000,
    });

    const transferInstruction = createTransferInstruction(
      srcAccount.value[0].pubkey, // Source Token Account
      toTokenAccount.address, // Destination Token Account
      mintWallet.publicKey, // Source Token Account owner
      amountInLamports, // Amount
      undefined, // Additional signers
      TOKEN_2022_PROGRAM_ID // Token Extension Program ID
    );

    // Instruction to add memo
    const memoInstruction = new TransactionInstruction({
      keys: [
        { pubkey: mintWallet.publicKey, isSigner: true, isWritable: true },
      ],
      data: Buffer.from(memo, "utf-8"),
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    });

    const blockhashResponse = await throttle(async () => {
      return await connection
        .getLatestBlockhashAndContext()
        .catch(console.error);
    });
    if (!blockhashResponse?.value?.blockhash) {
      throw new Error("Could not get blockhash from RPC");
    }

    const messageV0 = new TransactionMessage({
      payerKey: mintWallet.publicKey,
      recentBlockhash: blockhashResponse.value.blockhash,
      instructions: [
        computePriceInstruction,
        memoInstruction,
        transferInstruction,
      ],
    }).compileToV0Message();

    // make a versioned transaction
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([mintWallet]);

    console.log(`Create New transaction: ${Buffer.from(transaction.signatures[0]).toString('hex')}`);

    const transactionResponse = await transactionSenderAndConfirmationWaiter({
      connection,
      transaction,
    });
    // If we are not getting a response back, the transaction has not confirmed.
    if (!transactionResponse) {
      console.error("Transaction not confirmed");
      console.error("RETRY with new blockhash...");

      console.error("TODO retry with new blockhash...");
      // const messageV0 = new web3.TransactionMessage({
      //   payerKey: payer.publicKey,
      //   recentBlockhash: await connection
      //     .getLatestBlockhash()
      //     .then((res) => res.blockhash),
      //   instructions,
      // }).compileToV0Message();
      // const transaction = new web3.VersionedTransaction(messageV0);
      // transaction.sign([payer]);
      // const serializedTransaction = Buffer.from(transaction.serialize());
      // const transactionResponse =
      //   await transactionSenderAndConfirmationWaiter({
      //     connection,
      //     serializedTransaction,
      //     blockhashWithExpiryBlockHeight: {
      //       blockHash: transaction.message.recentBlockhash,
      //       lastValidBlockHeight: transaction.lastValidBlockHeight,
      //     },
      //   });
      // if (!transactionResponse) {
      //   console.error("RETRY FAILED...");
      // }

      console.error("Error: timed out");
      return;
    }
    if (transactionResponse.meta?.err) {
      console.error(transactionResponse.meta?.err);
      return;
    }

    const responseSignature = transactionResponse?.transaction?.signatures?.[0];

    return responseSignature;
  } catch (error) {
    console.error("Failed to send transaction: " + error);
  }
};

export { sendTokens };
