/**
 * Utilidad para consultar APIs de precios públicas (CoinGecko / Finnhub / Yahoo Finance)
 * y guardarlas en caché local para no quemar el límite gratuito.
 */

const CACHE_KEY = 'fintrack_prices_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface PriceCache {
  timestamp: number;
  prices: Record<string, number>;
}

/**
 * Consulta CoinGecko para criptomonedas y acciones simples.
 * @param symbols Lista de símbolos ej. ['BTC', 'ETH']
 */
export async function fetchCryptoPrices(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};

  const cachedStr = localStorage.getItem(CACHE_KEY);
  const cache: PriceCache = cachedStr ? JSON.parse(cachedStr) : { timestamp: 0, prices: {} };

  const now = Date.now();
  const isCacheValid = (now - cache.timestamp) < CACHE_TTL_MS;

  // Filtrar los símbolos que nos faltan en caché o si expiró
  const symbolsToFetch = isCacheValid
    ? symbols.filter(sym => typeof cache.prices[sym.toUpperCase()] === 'undefined')
    : symbols;

  if (symbolsToFetch.length > 0) {
    try {
      // Mapeo básico para asegurar que las cryptos principales tengan formato de Yahoo Finance (BTC-USD)
      const mappedSymbols = symbolsToFetch.map(s => {
        const upper = s.toUpperCase();
        if (upper === 'BTC' || upper === 'ETH' || upper === 'SOL' || upper === 'USDC' || upper === 'USDT') {
          return `${upper}-USD`;
        }
        return upper;
      });

      const query = mappedSymbols.join(',');

      // Consultamos nuestro endpoint proxy
      const res = await fetch(`/api/prices?symbols=${query}`);
      if (res.ok) {
        const data = await res.json();
        
        // Guardar en la caché. data contiene llaves como "BTC-USD" o "QQQM"
        symbolsToFetch.forEach((sym, idx) => {
          const mapped = mappedSymbols[idx];
          if (data[mapped] !== undefined) {
            cache.prices[sym.toUpperCase()] = data[mapped];
          }
        });

        cache.timestamp = now;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch (err) {
      console.warn("Error fetching prices from local API", err);
    }
  }

  // Retornamos lo que hay en caché (ya sea actualizado o lo que había si la red falló pero no expiró)
  const result: Record<string, number> = {};
  symbols.forEach(sym => {
    result[sym.toUpperCase()] = cache.prices[sym.toUpperCase()] || 0;
  });
  return result;
}
