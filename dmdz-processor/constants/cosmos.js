const SERVER = "https://rest.unicorn.meme";

export const UNICORN_RPC = `https://rpc.unicorn.meme`;

export const CONTRACTS = {
  factory: "unicorn1yvgh8xeju5dyr0zxlkvq09htvhjj20fncp5g58np4u25g8rkpgjslkfelc",
  lp: "unicorn1rn9f6ack3u8t3ed04pfaqpmh5zfp2m2ll4mkty",
  swap: "unicorn16jzpxp0e8550c9aht6q9svcux30vtyyyyxv5w2l2djjra46580wsl825uf",
};
export const ENDPOINTS = {
  supply: `${SERVER}/cosmos/bank/v1beta1/supply?pagination.limit=100`,
  factory: `${SERVER}/cosmwasm/wasm/v1/contract/${CONTRACTS.factory}/smart`,
  balances: `${SERVER}/cosmos/bank/v1beta1/balances`,
};

export const STARGAZE = {
  server: "https://rest.stargaze-apis.com",
  contract: "stars1fx74nkqkw2748av8j7ew7r3xt9cgjqduwn8m0ur5lhe49uhlsasszc5fhr",
};

export const DIAMOND_DENOM =
  "factory/unicorn1rn9f6ack3u8t3ed04pfaqpmh5zfp2m2ll4mkty/udiamond";
