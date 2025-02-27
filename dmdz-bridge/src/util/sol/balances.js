import { PublicKey } from "@solana/web3.js";

const fetchDiamondBalanceAsync = async (address, connection) => {
  if (!address || !connection) {
    return null;
  }

  const accountPublicKey = new PublicKey(address);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    accountPublicKey,
    {
      mint: new PublicKey("dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC"),
    }
  );

  return tokenAccounts?.value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount
};

export { fetchDiamondBalanceAsync };
