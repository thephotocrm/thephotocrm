import * as client from "openid-client";
import memoize from "memoizee";
import crypto from "crypto";

// Google's OIDC discovery endpoint
const GOOGLE_DISCOVERY_URL = "https://accounts.google.com";

const getGoogleOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(GOOGLE_DISCOVERY_URL),
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET
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
  const config = await getGoogleOidcConfig();
  
  const authUrl = client.buildAuthorizationUrl(config, {
    client_id: process.env.GOOGLE_CLIENT_ID!,
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
  const config = await getGoogleOidcConfig();
  
  // openid-client requires URL parameters as full URL objects
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set('code', code);
  
  const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
    pkce: false,
    expectedNonce: undefined,
    expectedState: undefined,
  });

  const claims = tokens.claims();
  
  return {
    sub: claims.sub as string,
    email: claims.email as string,
    email_verified: claims.email_verified as boolean | undefined,
    first_name: claims.given_name as string | undefined,
    last_name: claims.family_name as string | undefined,
    profile_image_url: claims.picture as string | undefined,
  };
}
