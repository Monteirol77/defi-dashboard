import { getCryptoApiBody } from "@/lib/crypto-cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const body = await getCryptoApiBody();
    return Response.json(body, {
      headers: {
        "Cache-Control": "private, max-age=55, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("[api/crypto]", message);
    return Response.json(
      {
        error: message,
        hint: "Sem dados em cache. CoinGecko pode estar com limite (429). Tenta dentro de 1 minuto ou usa uma API key.",
      },
      { status: 502 }
    );
  }
}
