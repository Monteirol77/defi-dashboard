# DeFi Dashboard

Next.js + Tailwind para acompanhar **Uniswap (UNI)** e **Pendle (PENDLE)** com a API gratuita CoinGecko.

## Funcionalidades

- **Dashboard**: preço USD e EUR, variação 24h, market cap, volume; gráfico 7d/30d (linha ou velas); MA 7d e 30d; Stochastic RSI (14,3,3) com %K/%D e zonas 20/80; actualização a cada 30s
- **Paper trading**: 10.000€ fictícios, compra/venda manual UNI e PENDLE, posições e histórico com motivo
- **Agente**: mesmas regras Stoch RSI + stop 3% / take-profit 8%; risco (20% por trade, max 2 posições, paragem &lt; 7.000€); relatório (operações, win rate, P&L total, maior perda)

## Correr

```bash
npm install
npm run dev
```

Abrir [http://127.0.0.1:3000](http://127.0.0.1:3000).

## IDs CoinGecko

- `uniswap` (UNI)
- `pendle` (PENDLE)
