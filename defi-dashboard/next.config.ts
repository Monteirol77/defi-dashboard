import type { NextConfig } from "next";

/**
 * O endereço em que o servidor escuta (dev / start) é definido pela CLI do Next,
 * não por este ficheiro: `next dev -H <host>` e `next start -H <host>` em package.json.
 *
 * Por omissão o Next usa **0.0.0.0**, o que aceita ligações via **127.0.0.1** e,
 * na maioria dos sistemas, **localhost** (IPv4). Evita `--hostname 127.0.0.1`, que
 * impede o stack IPv6 (::1) quando o browser resolve "localhost" para IPv6.
 */
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
