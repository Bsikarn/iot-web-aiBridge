/**
 * Secret Header & Dashboard Authorization Helper for IoT Board and API Routes
 */

export function getBoardSecretKey(): string {
  return process.env.BOARD_SECRET_KEY || process.env.NEXT_PUBLIC_BOARD_SECRET_KEY || "";
}

/**
 * Validates request authorization.
 * Allows access if EITHER:
 * 1. Request header `x-board-key` matches `process.env.BOARD_SECRET_KEY`
 * 2. OR Request originates from Same-Origin / Web Dashboard (referer, origin, sec-fetch-site, host)
 */
export function isAuthorizedBoardRequest(req: Request): boolean {
  const secretKey = getBoardSecretKey();
  const reqKey = req.headers.get('x-board-key');

  // 1. Hardware Board Key Match
  if (secretKey && reqKey === secretKey) {
    return true;
  }

  // 2. Same-Origin & Web Dashboard Browser Access
  const host = req.headers.get('host') || '';
  const referer = req.headers.get('referer') || '';
  const origin = req.headers.get('origin') || '';
  const secFetchSite = req.headers.get('sec-fetch-site') || '';

  // Browser Same-Origin fetches
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
    return true;
  }

  // Match referer/origin against current host
  if (host && (referer.includes(host) || origin.includes(host))) {
    return true;
  }

  // Match against known domains and Vercel URLs or localhost
  const vercelUrl = process.env.VERCEL_URL || '';
  if (
    referer.includes('ai-brigde.vercel.app') || origin.includes('ai-brigde.vercel.app') ||
    referer.includes('aicalculate-iot.vercel.app') || origin.includes('aicalculate-iot.vercel.app') ||
    referer.includes('localhost') || origin.includes('localhost') ||
    (vercelUrl && (referer.includes(vercelUrl) || origin.includes(vercelUrl)))
  ) {
    return true;
  }

  return false;
}
