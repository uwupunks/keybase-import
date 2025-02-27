import { useEffect, useState } from "react";

import "@solana/wallet-adapter-react-ui/styles.css";

const formatUnicornAddress = (address) =>
  `${address.slice(0, 11)}...${address.slice(40, 46)}`;
const formatUnicornTransaction = (address) =>
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

function PendingSolana() {
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    const fetchTxns = async () => {
      const txns = await fetch(
          "https://rest.unicorn.meme/cosmos/tx/v1beta1/txs?&pagination.reverse=true&events=coin_received.receiver=%27unicorn17jgcwtczvce4c7jkm0hwk98rqq4p7ljftl7gqc%27&pagination.limit=5&pagination.limit=20&pagination.count_total=true"
        )
          .then((r) => r.json())
          .then((x) =>
            x.tx_responses
              ?.filter((t) =>
                t.tx.body.messages[0].amount[0].denom.includes("udiamond")
              )
              .map(async (t) => ({
                ...t,
                cns: await getCNSAsync(t.tx.body.messages[0].from_address),
              }))
          ),
        settled = await Promise.allSettled(txns).then((results) =>
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
              href={`https://uwu.direct/Unicorn/account/${t.tx.body.messages[0].from_address}`}
              target="_blank"
            >
              {formatUnicornAddress(t.tx.body.messages[0].from_address)} {t.cns}
            </a>
          }{" "}
          {}
          <br />
          To:{" "}
          {
            <a
              href={`https://solscan.io/account/${t.tx.body.memo}`}
              target="_blank"
            >
              {formatSolanaAddress(t.tx.body.memo)}
            </a>
          }
          <br />
          Amount: {(t.tx.body.messages[0].amount[0].amount * Math.pow(10, -6)).toPrecision(1)} 💎
          <br />
          Txn:{" "}
          {
            <a
              href={`https://uwu.direct/Unicorn/tx/${t.txhash}`}
              target="_blank"
            >
              {formatUnicornTransaction(t.txhash)}
            </a>
          }
        </p>
      ))}
    </div>
  );
}

export default PendingSolana;
