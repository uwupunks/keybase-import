import throttledQueue from "throttled-queue";

const throttle = throttledQueue(7, 1000);

const getCNSAsync = async (address) => {
  const res = await throttle(async () => {
    const res = await fetch(
      `https://rest.stargaze-apis.com/cosmwasm/wasm/v1/contract/stars1fx74nkqkw2748av8j7ew7r3xt9cgjqduwn8m0ur5lhe49uhlsasszc5fhr/smart/${btoa(
        JSON.stringify({
          name: { address: address },
        })
      )}`
    );
    return res;
  })
    .then((r) => r.json())
    .catch((e) => console.error(e));
  return res?.data ? `${res.data}.unicorn` : null;
};

export { getCNSAsync };
