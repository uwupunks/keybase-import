import ProtoSigning from "@cosmjs/proto-signing";
import Stargate from "@cosmjs/stargate";
import { cosmos } from "juno-network";

import {
  ENDPOINTS,
  UNICORN_RPC,
  DIAMOND_DENOM,
} from "../../constants/cosmos.js";

const client = await Stargate.StargateClient.connect(UNICORN_RPC);
console.log(
  "With client, chain id:",
  await client.getChainId(),
  ", height:",
  await client.getHeight()
);
console.log(
  "Bridge balances:",
  (await client.getAllBalances(process.env.UNICORN_BRIDGE_ADDRESS)).map(b=>`${b.denom}: ${b.amount/1000000}`)
);

const getSigner = async () => {
  return ProtoSigning.DirectSecp256k1HdWallet.fromMnemonic(
    process.env.UNICORN_SIGNER,
    {
      prefix: "unicorn",
    }
  );
};

const signer = await getSigner();
const signerAddress = (await signer.getAccounts())[0].address;

const fetchBalancesAsync = async (address) => {
  if (!address) {
    return null;
  }

  const res = await fetch(`${ENDPOINTS.balances}/${address}`);
  const data = await res.json();
  return data.balances;
};

const findBalance = (balances, denom) => {
  if (!balances || !denom) {
    return null;
  }
  const balance = balances.find((b) => b.denom === denom);
  return balance ? Number(balance.amount) / 1000000 : 0;
};

const buildMessage = (amount, dest, memo) => {
  if (!amount || !dest || !memo) {
    throw new Error("sendTokens : amount, dest, and memo required");
  }

  try {
    const msg = {
      typeUrl: "/cosmos.bank.v1beta1.MsgSend",
      value: {
        amount: [
          {
            denom: DIAMOND_DENOM,
            amount: String(amount),
          },
        ],
        toAddress: dest,
        fromAddress: signerAddress,
      },
    };
    return msg;
  } catch (err) {
    console.error(`build message failed with error: ${err}`);
    return null;
  }
};

const signAndBroadcastMessages = async (messages) => {
  try {
    const client = await Stargate.SigningStargateClient.connectWithSigner(
      UNICORN_RPC,
      signer,
      {
        gasPrice: Stargate.GasPrice.fromString("0.001uwunicorn"),
      }
    );

    const res = await client.signAndBroadcast(
      signerAddress,
      messages,
      "auto"
    );

    /** Error code. The transaction succeeded if and only if code is 0. */
    if (res.code === 0) {
      return res.transactionHash;
    } else {
      throw new Error(res.rawLog);
    }
  } catch (err) {
    console.error(`Multi send failed with error: ${err}`);
    return null;
  }
};

export {
  fetchBalancesAsync,
  findBalance,
  buildMessage,
  signAndBroadcastMessages,
};
