import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');
  if (!symbolsParam) {
    return NextResponse.json({});
  }

  const requestedSymbols = symbolsParam.split(',').filter(Boolean);
  if (requestedSymbols.length === 0) return NextResponse.json({});

  // Asegurarnos de pedir MXN=X para conversiones
  const symbolsToFetch = Array.from(new Set([...requestedSymbols, 'MXN=X']));

  const results: Record<string, { price: number; currency: string }> = {};

  // Hacemos el fetch en paralelo a Yahoo Finance
  await Promise.all(
    symbolsToFetch.map(async (sym) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && meta.regularMarketPrice !== undefined) {
          results[sym] = {
            price: meta.regularMarketPrice,
            currency: meta.currency || 'USD'
          };
        }
      } catch (err) {
        console.warn(`Error fetching ${sym} from Yahoo Finance:`, err);
      }
    })
  );

  const exchangeRateObj = results['MXN=X'];
  const usdToMxnRate = exchangeRateObj?.price || 19.5; // Fallback razonable si falla

  const finalPrices: Record<string, number> = {};

  for (const sym of requestedSymbols) {
    if (results[sym]) {
      let price = results[sym].price;
      // Si la moneda es USD, lo convertimos a MXN para la UI
      if (results[sym].currency === 'USD') {
        price = price * usdToMxnRate;
      }
      finalPrices[sym] = price;
    } else {
      finalPrices[sym] = 0;
    }
  }

  return NextResponse.json(finalPrices);
}
