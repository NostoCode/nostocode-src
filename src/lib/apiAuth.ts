import { NextRequest, NextResponse } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";

/**
 * Reads the NextAuth JWT for a request. Returns null when the caller
 * is not logged in. Routes should answer with `unauthorizedResponse()`.
 */
export async function getAuthToken(req: NextRequest): Promise<JWT | null> {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET });
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );
}

export function forbiddenResponse(
  message = "You do not have permission to perform this action"
): NextResponse {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

export function isAdminToken(token: JWT): boolean {
  return token.userType === "admin";
}
