import * as client from "openid-client";
import memoize from "memoizee";
import crypto from "crypto";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export interface GoogleUserClaims {
  sub: string; // Google user ID
  email: string;
  email_verified?: boolean; // Whether email is verified
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
}

/**
 * Generate cryptographically secure state token for CSRF protection
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate the Google OAuth authorization URL with CSRF protection
 */
export async function getGoogleAuthUrl(redirectUri: string, state: string): Promise<string> {
  const config = await getOidcConfig();
  
  const authUrl = client.buildAuthorizationUrl(config, {
    client_id: process.env.REPL_ID!,
    redirect_uri: redirectUri,
    scope: "openid email profile",
    response_type: "code",
    state, // CSRF protection
  });

  return authUrl.href;
}

/**
 * Exchange authorization code for user claims
 */
export async function exchangeCodeForClaims(
  code: string,
  redirectUri: string
): Promise<GoogleUserClaims> {
  const config = await getOidcConfig();
  
  const tokens = await client.authorizationCodeGrant(config, {
    client_id: process.env.REPL_ID!,
    code,
    redirect_uri: redirectUri,
  });

  const claims = tokens.claims();
  
  return {
    sub: claims.sub as string,
    email: claims.email as string,
    email_verified: claims.email_verified as boolean | undefined,
    first_name: claims.first_name as string | undefined,
    last_name: claims.last_name as string | undefined,
    profile_image_url: claims.profile_image_url as string | undefined,
  };
}
