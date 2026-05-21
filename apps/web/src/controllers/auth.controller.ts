import { Controller, Get, Query, Render, Req, Res } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import type { AuthUser, PageContext } from '../security/auth.types';

type RequestWithAuth = Request & { authUser?: AuthUser };

@Controller()
export class AuthController {
  private sanitizeReturnTo(input?: string): string {
    const fallback = '/dashboard';
    if (!input || !String(input).trim()) return fallback;
    let value = String(input).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // keep raw value
    }
    if (!value.startsWith('/') || value.startsWith('//')) return fallback;
    if (value.startsWith('/login') || value.startsWith('/logout') || value.startsWith('/auth/')) {
      return fallback;
    }
    return value;
  }

  private getSafeReturnToFromReferer(req: Request): string | null {
    const referer = req.get('referer');
    if (!referer) return null;

    try {
      const refererUrl = new URL(referer);
      const host = (req.get('host') || '').toLowerCase();
      if (!host || refererUrl.host.toLowerCase() !== host) return null;
      const candidate = `${refererUrl.pathname || '/'}${refererUrl.search || ''}${refererUrl.hash || ''}`;
      const safe = this.sanitizeReturnTo(candidate);
      if (safe === '/dashboard') return null;
      return safe;
    } catch {
      return null;
    }
  }

  private resolveKeycloakBaseUrl(): string {
    const explicit =
      process.env.NEXT_PUBLIC_KEYCLOAK_URL ??
      process.env.KEYCLOAK_BASE_URL ??
      process.env.KEYCLOAK_ISSUER_URL;
    if (explicit && explicit.trim()) {
      const raw = explicit.trim().replace(/\/+$/, '');
      if (/\/realms\/[^/]+$/i.test(raw)) {
        return raw.replace(/\/realms\/[^/]+$/i, '');
      }
      return raw;
    }
    return 'http://localhost:18080';
  }

  private parseCookies(header?: string): Record<string, string> {
    if (!header) return {};
    return header.split(';').reduce<Record<string, string>>((acc, item) => {
      const idx = item.indexOf('=');
      if (idx <= 0) return acc;
      const key = item.slice(0, idx).trim();
      const value = decodeURIComponent(item.slice(idx + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
  }

  private base64Url(input: Buffer): string {
    return input
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private createPkcePair(): { verifier: string; challenge: string } {
    const verifier = this.base64Url(randomBytes(32));
    const challenge = this.base64Url(createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
  }

  private getKeycloakLoginUrl(params: {
    state: string;
    nonce: string;
    codeChallenge: string;
    redirectUri: string;
  }): string {
    const base = this.resolveKeycloakBaseUrl();
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'wikigouv';
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'wikigouv-web';
    const scope = process.env.OIDC_SCOPE ?? 'openid';

    const authUrl = new URL(`${base}/realms/${realm}/protocol/openid-connect/auth`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', params.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', params.state);
    authUrl.searchParams.set('nonce', params.nonce);
    authUrl.searchParams.set('code_challenge', params.codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    return authUrl.toString();
  }

  private resolveRedirectUri(req: Request): string {
    const configured = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI;
    if (configured && configured.trim()) return configured.trim();
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol || 'http';
    return `${proto}://${host}/auth/callback`;
  }

  private buildTokenEndpoints(baseRaw: string, realm: string): string[] {
    const base = baseRaw.replace(/\/+$/, '');
    const endpoints: string[] = [];
    endpoints.push(`${base}/realms/${realm}/protocol/openid-connect/token`);
    if (!/\/auth$/i.test(base)) {
      endpoints.push(`${base}/auth/realms/${realm}/protocol/openid-connect/token`);
    }
    return Array.from(new Set(endpoints));
  }

  @Get('/login')
  @Render('pages/auth/login')
  login(
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
    @Query('error') error?: string,
    @Query('returnTo') returnTo?: string
  ) {
    const state = this.base64Url(randomBytes(16));
    const nonce = this.base64Url(randomBytes(16));
    const pkce = this.createPkcePair();
    const redirectUri = this.resolveRedirectUri(req);

    res.cookie('wg_oidc_state', state, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
    res.cookie('wg_oidc_nonce', nonce, { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
    res.cookie('wg_pkce_verifier', pkce.verifier, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    });
    res.cookie('wg_oidc_redirect_uri', redirectUri, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    });
    const safeReturnTo =
      this.sanitizeReturnTo(returnTo) === '/dashboard' && !returnTo
        ? (this.getSafeReturnToFromReferer(req) ?? '/dashboard')
        : this.sanitizeReturnTo(returnTo);
    res.cookie('wg_return_to', safeReturnTo, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    });

    const page: PageContext = {
      title: 'Connexion SSO - Wikigouv',
      activeNav: 'login',
      user: req.authUser ?? null,
      alert: error
        ? { type: 'danger', message: `Erreur de connexion SSO: ${error}` }
        : {
            type: 'info',
            message:
              "Authentification centralisée: connectez-vous via Keycloak. Aucun mot de passe local n'est géré ici."
          }
    };

    return {
      page,
      keycloakLoginUrl: this.getKeycloakLoginUrl({
        state,
        nonce,
        codeChallenge: pkce.challenge,
        redirectUri
      })
    };
  }

  @Get('/auth/callback')
  async callback(
    @Req() req: RequestWithAuth,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string
  ) {
    if (error) {
      const message = encodeURIComponent(`${error}: ${errorDescription ?? 'OIDC callback failed'}`);
      return res.redirect(`/login?error=${message}`);
    }

    if (!code || !state) {
      return res.redirect('/login?error=missing_code_or_state');
    }

    const cookies = this.parseCookies(req.headers.cookie);
    const expectedState = cookies.wg_oidc_state;
    const codeVerifier = cookies.wg_pkce_verifier;
    const redirectUri = cookies.wg_oidc_redirect_uri || this.resolveRedirectUri(req);
    if (!expectedState || expectedState !== state || !codeVerifier) {
      return res.redirect('/login?error=invalid_state_or_pkce');
    }

    const base = this.resolveKeycloakBaseUrl();
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'wikigouv';
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'wikigouv-web';
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET ?? process.env.OIDC_CLIENT_SECRET ?? '';
    const tokenEndpoints = this.buildTokenEndpoints(base, realm);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    if (clientSecret.trim()) {
      body.set('client_secret', clientSecret.trim());
    }

    try {
      let response: globalThis.Response | null = null;
      for (const endpoint of tokenEndpoints) {
        // Rebuild body each attempt (URLSearchParams is consumed by fetch in some runtimes)
        const attemptBody = new URLSearchParams(body.toString());
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: attemptBody
        });
        if (response.ok) break;
        // Retry next endpoint only when not found; otherwise keep current response
        if (response.status !== 404) break;
      }

      if (!response) {
        return res.redirect('/login?error=oidc_network_error');
      }

      if (!response.ok) {
        let providerError = '';
        try {
          const errData = (await response.json()) as Record<string, unknown>;
          const e = String(errData.error ?? '').trim();
          const d = String(errData.error_description ?? '').trim();
          providerError = [e, d].filter(Boolean).join(': ');
        } catch {
          providerError = `http_${response.status}`;
        }
        return res.redirect(
          `/login?error=${encodeURIComponent(providerError || 'token_exchange_failed')}`
        );
      }

      const tokenSet = (await response.json()) as {
        access_token?: string;
        id_token?: string;
      };
      if (!tokenSet.access_token) {
        return res.redirect('/login?error=missing_access_token');
      }

      res.clearCookie('wg_oidc_state', { path: '/' });
      res.clearCookie('wg_oidc_nonce', { path: '/' });
      res.clearCookie('wg_pkce_verifier', { path: '/' });
      res.clearCookie('wg_oidc_redirect_uri', { path: '/' });
      const safeReturnTo = this.sanitizeReturnTo(cookies.wg_return_to);
      res.clearCookie('wg_return_to', { path: '/' });
      res.cookie('wg_access_token', tokenSet.access_token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/'
      });
      if (tokenSet.id_token) {
        res.cookie('wg_id_token', tokenSet.id_token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          path: '/'
        });
      }

      return res.redirect(safeReturnTo);
    } catch {
      return res.redirect('/login?error=oidc_network_error');
    }
  }

  @Get('/register')
  @Render('pages/auth/register')
  register(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Inscription SSO - Wikigouv',
      activeNav: 'register',
      user: req.authUser ?? null
    };
    return { page };
  }

  @Get('/forgot-password')
  @Render('pages/auth/forgot-password')
  forgotPassword(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Récupération - Wikigouv',
      user: req.authUser ?? null,
      alert: {
        type: 'warning',
        message: 'Réinitialisation de mot de passe gérée uniquement par Keycloak IAM.'
      }
    };
    return { page };
  }

  @Get('/reset-password')
  @Render('pages/auth/reset-password')
  resetPassword(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Reset Password - Wikigouv',
      user: req.authUser ?? null,
      alert: {
        type: 'warning',
        message: "Ce flux est désactivé côté Wikigouv. Utilisez l'écran Keycloak."
      }
    };
    return { page };
  }

  @Get('/verification')
  @Render('pages/auth/verification')
  verification(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Vérification - Wikigouv',
      user: req.authUser ?? null
    };
    return { page };
  }

  @Get('/unauthorized')
  @Render('pages/auth/unauthorized')
  unauthorized(@Req() req: RequestWithAuth) {
    const page: PageContext = {
      title: 'Accès refusé - Wikigouv',
      user: req.authUser ?? null
    };
    return { page };
  }

  @Get('/logout')
  logout(@Req() req: RequestWithAuth, @Res() res: Response) {
    const base = this.resolveKeycloakBaseUrl();
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'wikigouv';
    const postLogoutRedirectUri =
      process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI ?? 'http://localhost:3000/login';
    const cookies = this.parseCookies(req.headers.cookie);
    const idTokenHint = cookies.wg_id_token;
    const logoutUrl = new URL(`${base}/realms/${realm}/protocol/openid-connect/logout`);
    logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
    if (idTokenHint) {
      logoutUrl.searchParams.set('id_token_hint', idTokenHint);
    }

    res.clearCookie('wg_access_token', { path: '/' });
    res.clearCookie('wg_id_token', { path: '/' });
    res.clearCookie('wg_oidc_state', { path: '/' });
    res.clearCookie('wg_oidc_nonce', { path: '/' });
    res.clearCookie('wg_pkce_verifier', { path: '/' });
    res.clearCookie('wg_oidc_redirect_uri', { path: '/' });
    res.clearCookie('wg_return_to', { path: '/' });
    if (!idTokenHint) {
      return res.redirect('/login?error=logout_without_id_token_hint');
    }
    return res.redirect(logoutUrl.toString());
  }
}
