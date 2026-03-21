import DashboardClient from "@/components/DashboardClient";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            DeFi Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Uniswap (UNI) e Pendle (PENDLE) — preços USD/EUR, gráficos, Stochastic RSI, paper trading e agente.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardClient />
        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Dados CoinGecko. Dashboard e paper trading usam a mesma fonte e taxa EUR/USD.
        </p>
      </main>
    </div>
  );
}
