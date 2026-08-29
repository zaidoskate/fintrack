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
      // Mapeo básico de símbolos de CoinGecko (puedes extender esto o hacer que el usuario seleccione la ID)
      const coingeckoMap: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'USDC': 'usd-coin',
        'USDT': 'tether'
      };

      const ids = symbolsToFetch
        .map(s => coingeckoMap[s.toUpperCase()] || s.toLowerCase())
        .join(',');

      // Consultamos CoinGecko Simple Price API
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=mxn,usd`);
      if (res.ok) {
        const data = await res.json();
        
        // Guardar en la caché (preferimos MXN si está, o USD)
        // Podríamos manejar la conversión en el futuro, pero aquí asumimos MXN para simplificar o USD como fallback
        symbolsToFetch.forEach(sym => {
          const id = coingeckoMap[sym.toUpperCase()] || sym.toLowerCase();
          if (data[id]) {
            // Prioridad a MXN, luego a USD (CoinGecko provee ambos si se piden, pero devolvemos un numero flotante)
            // Asumiremos MXN para mantenerlo simple.
            cache.prices[sym.toUpperCase()] = data[id].mxn || data[id].usd || 0;
          }
        });

        cache.timestamp = now;
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch (err) {
      console.warn("Error fetching prices from CoinGecko", err);
    }
  }

  // Retornamos lo que hay en caché (ya sea actualizado o lo que había si la red falló pero no expiró)
  const result: Record<string, number> = {};
  symbols.forEach(sym => {
    result[sym.toUpperCase()] = cache.prices[sym.toUpperCase()] || 0;
  });
  return result;
}
