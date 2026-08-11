/**
 * Secret Header Authorization Helper for IoT Board and API Routes
 */

export function getBoardSecretKey(): string {
  return process.env.BOARD_SECRET_KEY || process.env.NEXT_PUBLIC_BOARD_SECRET_KEY || "";
}

export function isAuthorizedBoardRequest(req: Request): boolean {
  const secretKey = getBoardSecretKey();
  // If BOARD_SECRET_KEY environment variable is missing, deny authorization
  if (!secretKey) {
    return false;
  }
  const reqKey = req.headers.get('x-board-key');
  return reqKey === secretKey;
}
