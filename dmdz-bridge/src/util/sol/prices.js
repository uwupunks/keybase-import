// outside of func call for performance
const formatter = new Intl.NumberFormat(navigator.language || "en-US", {
  style: "currency",
  currency: "USD",
  // These options are needed to round to two decimal places if necessary
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatToUSD(amount) {
  return formatter.format(amount);
}

const getDiamondPriceViaHeart = async () => {
  const getHeartsPerDiamond = await fetch(
      "https://price.jup.ag/v6/price?ids=dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC&vsToken=whheYm7JzA2DsAofFKvXtNdJ8HhQDxa72fa52pdHaoB"
    ).then((r) => r.json()),
    heartsPerDiamond =
      getHeartsPerDiamond?.data?.dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC
        ?.price,
    getUsdcPerHeart = await fetch(
      "https://price.jup.ag/v6/price?ids=whheYm7JzA2DsAofFKvXtNdJ8HhQDxa72fa52pdHaoB&vsToken=USDC"
    ).then((r) => r.json()),
    usdcPerHeart =
      getUsdcPerHeart?.data?.whheYm7JzA2DsAofFKvXtNdJ8HhQDxa72fa52pdHaoB?.price,
    rawPrice = heartsPerDiamond * usdcPerHeart,
    formattedPrice = formatToUSD(rawPrice);

  return formattedPrice || "";
};
const getDiamondPriceViaSol = async () => {
  const getSolPerDiamond = await fetch(
      "https://price.jup.ag/v6/price?ids=dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC&vsToken=So11111111111111111111111111111111111111112"
    ).then((r) => r.json()),
    solPerdiamond =
      getSolPerDiamond?.data?.dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC
        ?.price,
    getSolPrice = await fetch(
      "https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112&vsToken=USDC"
    ).then((r) => r.json()),
    usdcPerSol =
      getSolPrice?.data?.So11111111111111111111111111111111111111112?.price,
    rawPrice = solPerdiamond * usdcPerSol,
    formattedPrice = formatToUSD(rawPrice);

  return formattedPrice || "";
};
const getDiamondPrice = async () => {
  const priceRes = await fetch(
      "https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC"
    ).then((r) => r.json()),
    rawPrice =priceRes?.data?.attributes?.token_prices?.dmdzXMTG1zXsK2seVYd3iLLhYMKwkGNUwaYSLSYvtSC,
    formattedPrice = formatToUSD(rawPrice);

  return formattedPrice || "";
};

export { getDiamondPriceViaHeart, formatToUSD, getDiamondPrice };
