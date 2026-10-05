const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*$/;

/**
 * Normalises whatever a user pastes ("https://www.Example.com/blog?x=1") into a bare
 * hostname ("example.com"). Returns null if the result is not a valid hostname.
 */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // protocol
  value = value.split(/[/?#]/)[0]!; // path, query, hash
  value = value.replace(/^[^@]*@/, ""); // credentials
  value = value.replace(/:\d+$/, ""); // port
  value = value.replace(/^www\./, "");
  value = value.replace(/\.$/, ""); // trailing dot

  if (value === "localhost") return value;
  return HOSTNAME.test(value) && value.includes(".") ? value : null;
}

/** True when `hostname` is the site's domain or one of its subdomains. */
export function hostnameMatchesDomain(hostname: string, domain: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host === domain || host.endsWith(`.${domain}`);
}

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Unambiguous random slug for public share links. */
export function generateShareSlug(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
