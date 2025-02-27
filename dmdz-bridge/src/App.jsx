import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createTransferInstruction,
} from "@solana/spl-token";

import { Link } from "react-router-dom";

import { Buffer } from "buffer";
import { Connection, PublicKey } from "@solana/web3.js";
import { transactionSenderAndConfirmationWaiter } from "./transactionSender";
import "@solana/wallet-adapter-react-ui/styles.css";
import loadingImg from "./assets/sonicspin.png";
import PendingCosmos from "./PendingCosmos";
import { fetchBalancesAsync, findBalance } from "src/util/cosmos/balances";
import { fetchDiamondBalanceAsync } from "src/util/sol/balances";
import { getDiamondPrice } from "src/util/sol/prices";

const connection = new Connection(
  "https://solana-mainnet.g.alchemy.com/v2/EvvyWFz4R0AwXf9WgxSgtzU7O_ZU27tt",
  {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 30000,
  }
);

function formatToUSD(amount) {
  // 'en-US' for United States English, which uses USD format.
  // You can change the locale for different currency formats.
  const formatter = new Intl.NumberFormat(navigator.language || "en-US", {
    style: "currency",
    currency: "USD",
    // These options are needed to round to two decimal places if necessary
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}
function appendToStorage(key, value) {
  // Get the current value from localStorage, if it exists
  let currentValues = JSON.parse(localStorage.getItem(key)) || [];

  // Ensure currentValues is an array
  if (!Array.isArray(currentValues)) {
    currentValues = [];
  }

  // Append the new value
  currentValues.push(value);

  // Save back to localStorage
  localStorage.setItem(key, JSON.stringify(currentValues));
}
function App() {
  const [memo, setMemo] = useState();
  const [priceSolana, setPriceSolana] = useState();
  const [priceUnicorn, setPriceUnicorn] = useState();
  const [supplyUnicorn, setSupplyUnicorn] = useState();
  const [supplySolana, setSupplySolana] = useState();

  const [amount, setAmount] = useState();
  const [isLoading, setIsLoading] = useState();
  const [txnResult, setTxnResult] = useState();
  const { publicKey, sendTransaction } = useWallet();

  const handleMemoChange = (event) => {
    setMemo(event.target.value);
  };
  const handleAmountChange = (event) => {
    setAmount(event.target.value);
  };
  const resetState = () => {
    setAmount("");
    setMemo("");
    setTxnResult(null);
  };

  const sendTokens = useCallback(async () => {
    try {
      if (!publicKey) {
        alert("Wallet not connected!");
        return;
      }

      if (!amount || !memo) {
        alert("Address and amount required.");
        return;
      }
      if (amount < 0.05) {
        alert("Minimum send is 0.05 💎");
        return;
      }
      if ((Number(amount) + 1) > supplyUnicorn) {
        alert("I'm sorry, but there are not enough 💎's in unicorn land to bridge ATM. Maybe get someone to jeet?");
        return;
      }

      if (memo.length !== 46 || !memo.startsWith("unicorn")) {
        alert(
          "Invalid Unicorn address. (should be like: unicorn1xxxxxxxxxxxxxxxxxxxxxx)"
        );
        return;
      }

      const srcAccount = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          mint: new PublicKey("dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC"),
        }
      );
      const destAccounts = await connection.getParsedTokenAccountsByOwner(
        // unicornbridge.unicorn
        new PublicKey("DPiB4nyFyrkKgNPgnf5S2FygMgz1CUBYWiCVLKedvgNW"),
        {
          mint: new PublicKey("dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC"),
        }
      );
      const computePriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 200000,
      });

      const transferInstruction = createTransferInstruction(
        srcAccount.value[0].pubkey, // Source Token Account
        destAccounts.value[0].pubkey, // Destination Token Account
        publicKey, // Source Token Account owner
        amount * LAMPORTS_PER_SOL, // Amount
        undefined, // Additional signers
        TOKEN_2022_PROGRAM_ID // Token Extension Program ID
      );

      // Instruction to add memo
      const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
        data: Buffer.from(memo, "utf-8"),
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      });
      const transaction = new Transaction().add(
        computePriceInstruction,
        memoInstruction,
        transferInstruction
      );

      setIsLoading(true);
      const blockhashResponse = await connection.getLatestBlockhashAndContext();
      const lastValidBlockHeight = blockhashResponse.value.lastValidBlockHeight;

      const transactionResponse = await transactionSenderAndConfirmationWaiter({
        connection,
        sendTransaction,
        transaction,
        blockhashWithExpiryBlockHeight: {
          blockHash: blockhashResponse.value.blockhash,
          lastValidBlockHeight,
        },
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

        alert("Error: timed out");
        return;
      }
      if (transactionResponse.meta?.err) {
        console.error(transactionResponse.meta?.err);
        alert("Error: " + transactionResponse.meta?.err);
        return;
      }

      const responseSignature =
        transactionResponse?.transaction?.signatures?.[0];
      if (responseSignature) {
        setTxnResult(responseSignature);
        appendToStorage("txns", responseSignature);
      } else {
        alert("Error: txn failed: " + transactionResponse);
      }
    } catch (error) {
      alert("Failed to send transaction: " + error);
    } finally {
      setIsLoading(false);
    }
  }, [amount, memo, publicKey, sendTransaction]);

  useEffect(() => {
    const fetchSolanaPrices = async () => {
      const price = await getDiamondPrice()
      setPriceSolana(price);
    };

    const fetchUnicornPrices = async () => {
      const uwuPriceResponse = await fetch(
          "https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/UwU8RVXB69Y6Dcju6cN2Qef6fykkq6UUNpB15rZku6Z"
        ).then((r) => r.json()),
        rawUwuPrice =
          uwuPriceResponse?.data?.attributes?.token_prices
            ?.UwU8RVXB69Y6Dcju6cN2Qef6fykkq6UUNpB15rZku6Z;

      const prices = await fetch(
          "https://uwu-api.uwu-pro-api.workers.dev/tokens?includeBlackMarket=true"
        ).then((r) => r.json()),
        rawPriceInUwu = prices?.tokens?.filter((p) => p.ticker === "💎")?.[0]
          ?.last_price,
        rawPriceUSD = rawPriceInUwu * rawUwuPrice,
        formattedPrice = formatToUSD(rawPriceUSD);

      setPriceUnicorn(formattedPrice || "");
    };

    const fetchCosmosSupply = async () => {
      const balances = await fetchBalancesAsync(
          "unicorn17jgcwtczvce4c7jkm0hwk98rqq4p7ljftl7gqc"
        ),
        balance = findBalance(
          balances,
          "factory/unicorn1rn9f6ack3u8t3ed04pfaqpmh5zfp2m2ll4mkty/udiamond"
        );
      setSupplyUnicorn(balance || "");
    };

    const fetchSolanaSupply = async () => {
      const balance = await fetchDiamondBalanceAsync(
        "DPiB4nyFyrkKgNPgnf5S2FygMgz1CUBYWiCVLKedvgNW",
        connection
      );
      setSupplySolana(balance || "");
    };

    fetchSolanaPrices();
    fetchUnicornPrices();
    fetchCosmosSupply();
    fetchSolanaSupply();
  }, []);

  return (
    <div>
      <p className="warning">
        Double Check URL: <strong>bridge.uwublack.market</strong>
      </p>
      <WalletMultiButton></WalletMultiButton>
      <p style={{ textAlign: "left" }}>
        <strong>Solana</strong>
        <br />
        Price via ❤️: {priceSolana}
        <br />
        On Bridge: {supplySolana} 💎
        <br />
        <strong>Unicorn</strong>
        <br />
        Price: {priceUnicorn}
        <br />
        On Bridge: {supplyUnicorn} 💎
      </p>
      <h2>💎 Black Market Bridge 💎</h2>
      <p className="success">
        Open Beta - No prior approval required. Bridge transactions will be processed on an ad hoc basis. Contact @unicorn_black_market on TG for help.



        Minimum send is 0.05 💎
      </p>
      <p>
        Destination: 🦄 Unicorn Land 🦄 <br />
        <Link to="/tosolana">Goto Soylana Land</Link>
      </p>
      <p>
        Neigh, neigh. I am the unicorn 🦄 to carry your 💎 to the land of
        plenty. Strap ye 💎s upon my back and let us ride into Unicorn Land!
      </p>
      <p>
        <label htmlFor="address">🦄 Unicorn Address: </label>
        <input
          id="address"
          type="text"
          className="big-text-field"
          value={memo}
          onChange={handleMemoChange}
          placeholder="Address"
        />
      </p>
      <p>
        <label htmlFor="amount">💎 Amount: </label>
        <input
          id="amount"
          type="number"
          className="big-text-field"
          value={amount}
          onChange={handleAmountChange}
          placeholder="Amount"
        />
      </p>
      {amount ? (
        <p>
          Bridge Fee 1.5%
          <br />
          Amount Received:{" "}
          {(amount * LAMPORTS_PER_SOL * 0.985) / LAMPORTS_PER_SOL} 💎
          <br />
          Address: {memo}
        </p>
      ) : null}
      {txnResult ? (
        <p>
          Txn:{" "}
          <a href={`https://solscan.io/tx/${txnResult}`} target="_blank">
            {txnResult}
          </a>
        </p>
      ) : null}
      {isLoading ? (
        <button>
          <img src={loadingImg} />{" "}
        </button>
      ) : txnResult ? (
        <button onClick={resetState}>🦄 OK 🦄</button>
      ) : (
        <button onClick={sendTokens}>🦄 Giddy Up 🦄</button>
      )}

      <p>
        <PendingCosmos connection={connection}></PendingCosmos>
      </p>
    </div>
  );
}

export default App;
