import { useEffect, useState } from "react";

import { PublicKey } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

const formatUnicornAddress = (address) =>
  `${address.slice(0, 11)}...${address.slice(40, 46)}`;
const formatTxnHash = (address) =>
  `${address.slice(0, 4)}...${address.slice(
    address.length - 4,
    address.length
  )}`;
const formatSolanaAddress = (address) =>
  `${address.slice(0, 4)}...${address.slice(
    address.length - 4,
    address.length
  )}`;
const getCNSAsync = async (address) => {
  const res = await fetch(
    `https://rest.stargaze-apis.com/cosmwasm/wasm/v1/contract/stars1fx74nkqkw2748av8j7ew7r3xt9cgjqduwn8m0ur5lhe49uhlsasszc5fhr/smart/${btoa(
      JSON.stringify({
        name: { address: address },
      })
    )}`
  ).then((r) => r.json());
  return res?.data ? `${res.data}.unicorn` : null;
};

function PendingCosmos({ connection }) {
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    const fetchTxns = async () => {
      const pubKey = new PublicKey(
        "DPiB4nyFyrkKgNPgnf5S2FygMgz1CUBYWiCVLKedvgNW"
      );
      const transactionList = await connection.getSignaturesForAddress(pubKey, {
        limit: 50,
      });

      // This gets you the transaction signatures. To get detailed transaction info:
      const transactionDetails = await connection.getParsedTransactions(
        transactionList.map((t) => t.signature), {
          maxSupportedTransactionVersion: 0
        }
      );
      const filtered = transactionDetails.filter((d) =>
        d.transaction.message.instructions.some(
          (i) => i.parsed?.startsWith && i.parsed?.startsWith("unicorn")
        )
      );
      const txnPromises = filtered.map(async (t) => ({
        from_address: t.transaction.message.accountKeys
          .find((a) => a.signer === true)
          ?.pubkey.toString(),
        memo: t.transaction.message.instructions.find(
          (i) => i.program === "spl-memo"
        )?.parsed,
        amount: t.transaction.message.instructions.find(
          (i) => i?.parsed?.type === "transfer"
        )?.parsed?.info?.amount,
        txhash: t.transaction.signatures[0],
        cns: await getCNSAsync(t.transaction.message.instructions.find(
          (i) => i.program === "spl-memo"
        )?.parsed)
      })),
      settled = await Promise.allSettled(txnPromises).then((results) =>
        results.map((r) => r.value || "")
      );
      setTxns(settled || []);
    };
    fetchTxns();
  }, []);

  return (
    <div>
      Latest Txns:
      {txns?.map((t, i) => (
        <p key={i}>
          From:{" "}
          {
            <a
              href={`https://solscan.io/account/${t.from_address}`}
              target="_blank"
            >
              {formatSolanaAddress(t.from_address)} 
            </a>
          }{" "}
          {}
          <br />
          To:{" "}
          {
            <a
              href={`https://uwu.direct/Unicorn/account/${t.memo}`}
              target="_blank"
            >
              {formatUnicornAddress(t.memo)} {t.cns}
            </a>
          }
          <br />
          Amount: {(t.amount * Math.pow(10, -9)).toPrecision(1)} 💎
          <br />
          Txn:{" "}
          {
            <a
              href={`https://solscan.io/tx/${t.txhash}`}
              target="_blank"
            >
              {formatTxnHash(t.txhash)}
            </a>
          }
        </p>
      ))}
    </div>
  );
}

export default PendingCosmos;
