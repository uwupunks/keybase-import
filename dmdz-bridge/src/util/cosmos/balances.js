import { ENDPOINTS } from "src/constants/cosmos";

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

export { fetchBalancesAsync, findBalance };
