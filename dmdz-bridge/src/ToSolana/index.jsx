import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Cosmos Libs
import { useChain } from "@cosmos-kit/react";
import { cosmos } from "juno-network";

// Solana Libs
import { Connection, PublicKey } from "@solana/web3.js";

import loadingImg from "assets/sonicspin.png";
import "./index.css";
import PendingSolana from "../PendingSolana";
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
function ToSolana() {
  const [memo, setMemo] = useState();
  const [priceSolanaViaHeart, setPriceSolanaViaHeart] = useState();
  const [priceUnicorn, setPriceUnicorn] = useState();
  const [supplyUnicorn, setSupplyUnicorn] = useState();
  const [supplySolana, setSupplySolana] = useState();

  const [amount, setAmount] = useState();
  const [isLoading, setIsLoading] = useState();
  const [txnResult, setTxnResult] = useState();

  const {
    username,
    connect,
    disconnect,
    getSigningStargateClient,
    address,
    isWalletConnected,
  } = useChain("unicorn");

  const sendTokens = async () => {
    if (isWalletConnected && memo && amount) {
      try {
        setIsLoading(true);

        const validatedAddress = new PublicKey(memo);
        if (!validatedAddress) {
          alert("Invalid Solana address.");
          return;
        }

        if (amount < 0.05) {
          alert("Minimum send is 0.05 💎");
          return;
        }

        const client = await getSigningStargateClient();

        const { send } = cosmos.bank.v1beta1.MessageComposer.withTypeUrl;

        const msg = send({
          amount: [
            {
              denom:
                "factory/unicorn1rn9f6ack3u8t3ed04pfaqpmh5zfp2m2ll4mkty/udiamond",
              amount: String(amount * Math.pow(10, 6)),
            },
          ],
          toAddress: "unicorn17jgcwtczvce4c7jkm0hwk98rqq4p7ljftl7gqc",
          fromAddress: address,
        });

        const fee = {
          amount: [
            {
              denom: "uwunicorn",
              amount: "2891",
            },
          ],
          gas: "115632",
        };
        const res = await client.signAndBroadcast(address, [msg], fee, memo);

        /** Error code. The transaction succeeded if and only if code is 0. */
        if (res.code === 0) {
          setTxnResult(res.transactionHash);
          appendToStorage("txns", res.transactionHash);
        } else {
          throw new Error(res.rawLog);
        }
      } catch (err) {
        alert(`send failed with error: ${err}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("Validation Error or wallet not connected.");
      return null;
    }
  };

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

  useEffect(() => {
    const fetchSolanaPrices = async () => {
      const price = await getDiamondPrice();
      setPriceSolanaViaHeart(price);
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
      {!isWalletConnected ? (
        <button
          id="wallet"
          onClick={async () => {
            await connect();
          }}
        >
          Connect
        </button>
      ) : (
        <p>
          {username}
          <br />
          <button
            id="wallet"
            onClick={async () => {
              await disconnect();
            }}
          >
            Disconnect
          </button>
        </p>
      )}

      <p style={{ textAlign: "left" }}>
        <strong>Solana</strong>
        <br />
        Price via ❤️: {priceSolanaViaHeart}
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
        Open Beta - No prior approval required. Bridge transactions will be
        processed on an ad hoc basis. Contact @unicorn_black_market on TG for
        help.

        Minimum send is 0.05 💎
      </p>
      <p>
        Destination: Soylana Land <br />
        <Link to="/">Goto 🦄 Unicorn Land 🦄</Link>
      </p>
      <p>
        Neigh, neigh. I am the unicorn 🦄 to carry your 💎 to SOLANA. Strap ye
        💎s upon my back and let us ride!
      </p>

      <p>
        <label htmlFor="address">Solana Address: </label>
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
          Amount Received: {amount * 0.985} 💎
          <br />
          Address: {memo}
        </p>
      ) : null}
      {txnResult ? (
        <p>
          Txn:{" "}
          <a
            href={`https://uwu.direct/Unicorn/tx/${txnResult}`}
            target="_blank"
          >
            {txnResult}
          </a>
        </p>
      ) : null}

      {!isWalletConnected ? (
        <button
          id="wallet"
          onClick={async () => {
            await connect();
          }}
        >
          Connect
        </button>
      ) : isLoading ? (
        <button>
          <img src={loadingImg} />{" "}
        </button>
      ) : txnResult ? (
        <button onClick={resetState}>🦄 OK 🦄</button>
      ) : (
        <button onClick={sendTokens}>🦄 Giddy Up 🦄</button>
      )}
      <p>
        <PendingSolana></PendingSolana>
      </p>
    </div>
  );
}

export default ToSolana;
