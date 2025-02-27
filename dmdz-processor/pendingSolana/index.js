import { getCNSAsync } from "../util/cns.js";

const fetchPendingToSolana = async () => {
  const txns = await fetch(
      "https://rest.unicorn.meme/cosmos/tx/v1beta1/txs?&pagination.reverse=true&events=coin_received.receiver=%27unicorn17jgcwtczvce4c7jkm0hwk98rqq4p7ljftl7gqc%27&&pagination.limit=200&pagination.count_total=true"
    )
      .then((r) => r.json())
      .then((x) =>
        x.tx_responses
          ?.filter((t) =>
            t.tx.body.messages[0].amount[0].denom === 'factory/unicorn1rn9f6ack3u8t3ed04pfaqpmh5zfp2m2ll4mkty/udiamond'
          )
          .map(async (t) => ({
            ...t,
            cns: await getCNSAsync(t.tx.body.messages[0].from_address),
          }))
      ),
    settled = await Promise.allSettled(txns).then((results) =>
      results.map((r) => ({
        from_address: r.value.tx.body.messages[0].from_address,
        amount: r.value.tx.body.messages[0].amount[0].amount,
        memo: r.value.tx.body.memo,
        txhash: r.value.txhash,
        blockTime: r.value.height,
      }))
    );
  return settled || [];
};
export { fetchPendingToSolana };
