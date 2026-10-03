import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get('symbols');
  const range = searchParams.get('range') || '1mo';
  const interval = searchParams.get('interval') || '1d';

  if (!symbolsParam) {
    return NextResponse.json({});
  }

  const requestedSymbols = symbolsParam.split(',').filter(Boolean);
  if (requestedSymbols.length === 0) return NextResponse.json({});

  // Siempre pedimos MXN=X para conversiones históricas (asumiremos que varía o usaremos el cierre)
  const symbolsToFetch = Array.from(new Set([...requestedSymbols, 'MXN=X']));

  const results: Record<string, { timestamps: number[], prices: number[], currency: string }> = {};

  await Promise.all(
    symbolsToFetch.map(async (sym) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&range=${range}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        const result = data?.chart?.result?.[0];
        if (!result) return;

        const meta = result.meta;
        const timestamps = result.timestamp || [];
        // Yahoo Finance a veces tiene arrays vacios o nulos si no hubo cotización, los filtramos o mapeamos a 0
        const pricesRaw = result.indicators?.quote?.[0]?.close || [];
        
        // Limpiamos los nulls (locf simple: si es null agarra el anterior)
        const prices: number[] = [];
        let lastValid = meta.previousClose || 0;
        for (let i = 0; i < pricesRaw.length; i++) {
          if (pricesRaw[i] !== null && pricesRaw[i] !== undefined) {
            lastValid = pricesRaw[i];
          }
          prices.push(lastValid);
        }

        results[sym] = {
          timestamps,
          prices,
          currency: meta.currency || 'USD'
        };
      } catch (err) {
        console.warn(`Error fetching historical ${sym} from Yahoo Finance:`, err);
      }
    })
  );

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
    }
  });
}
