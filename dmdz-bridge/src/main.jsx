import React from "react";
import ReactDOM from "react-dom/client";

// Solana Libs
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

// Cosmos Libs
import { ChainProvider } from "@cosmos-kit/react";
import { wallets as keplr } from "@cosmos-kit/keplr";
import { wallets as leap } from "@cosmos-kit/leap";
import { GasPrice } from "@cosmjs/stargate";
import "@interchain-ui/react/styles";
import { getSigningCosmosClientOptions } from "interchain";

import { isMobile } from "react-device-detect";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./index.css";
import ToSolana from "src/ToSolana";
import PendingSolana from "./PendingSolana";

// Solana
const network = "mainnet-beta";
const endpoint = clusterApiUrl(network);
const wallets = [new SolflareWalletAdapter()];

// Cosmos
const chain = {
  chain_name: "unicorn",
  chain_id: "unicorn-420",
};
const chainAssets = {
  chain_name: "unicorn",
  assets: [],
};
const signerOptions = {
  // eslint-disable-next-line no-unused-vars
  signingStargate: (_chain) => {
    return getSigningCosmosClientOptions();
  },
  signingCosmwasm: (chain) => {
    switch (chain.chain_name) {
      case "unicorn":
        return {
          gasPrice: GasPrice.fromString("0.001uwunicorn"),
        };
    }
  },
  // eslint-disable-next-line no-unused-vars
  preferredSignType: (_chain) => {
    return "amino";
  },
};
const cosmosWallets = isMobile
  ? [keplr[1], leap[1]]
  : [keplr[0], leap[0], leap[2]];

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/tosolana",
    element: <ToSolana />,
  },
  {
    path: "/tounicorn",
    element: <App />,
  },
  {
    path: "/pending",
    element: <PendingSolana />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChainProvider
      chains={[chain]}
      assetLists={[chainAssets]}
      wallets={cosmosWallets}
      walletConnectOptions={{
        signClient: { projectId: "42be0f17bcc9f94c391f66c133aaa401" },
      }}
      signerOptions={signerOptions}
      endpointOptions={{
        endpoints: {
          unicorn: {
            rpc: ["https://rpc.unicorn.meme"],
            rest: ["https://rest.unicorn.meme"],
          },
        },
      }}
    >
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <RouterProvider router={router} />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ChainProvider>
  </React.StrictMode>
);
