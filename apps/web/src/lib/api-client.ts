import type { Request } from 'express';

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

function extractErrorMessage(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const msg = (err as { message?: unknown }).message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) {
    const lines = msg.map((x) => String(x ?? '').trim()).filter(Boolean);
    return lines.length ? lines.join(' | ') : null;
  }
  return null;
}

export function getAccessToken(req: Request): string | null {
  const auth = req.header('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.header('cookie'));
  return (
    cookies.wg_access_token ??
    cookies.kc_access_token ??
    cookies.access_token ??
    null
  );
}

export async function fetchApiJson<T>(
  req: Request,
  path: string
): Promise<{ ok: boolean; status: number; data: T | null; errorMessage?: string | null }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7890';
  const token = getAccessToken(req);
  if (!token) return { ok: false, status: 401, data: null, errorMessage: 'Session invalide. Veuillez vous reconnecter.' };

  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      let errorMessage: string | null = null;
      try {
        const err = (await response.json()) as unknown;
        errorMessage = extractErrorMessage(err);
      } catch {
        // no-op
      }
      return { ok: false, status: response.status, data: null, errorMessage };
    }
    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data, errorMessage: null };
  } catch {
    return { ok: false, status: 503, data: null, errorMessage: 'Service indisponible. Reessayez dans un instant.' };
  }
}

export async function fetchApiPublicJson<T>(
  path: string
): Promise<{ ok: boolean; status: number; data: T | null; errorMessage?: string | null }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7890';

  try {
    const response = await fetch(`${apiBase}${path}`);
    if (!response.ok) {
      let errorMessage: string | null = null;
      try {
        const err = (await response.json()) as unknown;
        errorMessage = extractErrorMessage(err);
      } catch {
        // no-op
      }
      return { ok: false, status: response.status, data: null, errorMessage };
    }
    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data, errorMessage: null };
  } catch {
    return { ok: false, status: 503, data: null, errorMessage: 'Service indisponible. Reessayez dans un instant.' };
  }
}

export async function postApiJson<T>(
  req: Request,
  path: string,
  payload: unknown
): Promise<{ ok: boolean; status: number; data: T | null; errorMessage?: string | null }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7890';
  const token = getAccessToken(req);
  if (!token) return { ok: false, status: 401, data: null, errorMessage: 'Session invalide. Veuillez vous reconnecter.' };

  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let errorMessage: string | null = null;
      try {
        const err = (await response.json()) as unknown;
        errorMessage = extractErrorMessage(err);
      } catch {
        // no-op
      }
      return { ok: false, status: response.status, data: null, errorMessage };
    }
    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data, errorMessage: null };
  } catch {
    return { ok: false, status: 503, data: null, errorMessage: 'Service indisponible. Reessayez dans un instant.' };
  }
}

export async function patchApiJson<T>(
  req: Request,
  path: string,
  payload: unknown
): Promise<{ ok: boolean; status: number; data: T | null; errorMessage?: string | null }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7890';
  const token = getAccessToken(req);
  if (!token) return { ok: false, status: 401, data: null, errorMessage: 'Session invalide. Veuillez vous reconnecter.' };

  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let errorMessage: string | null = null;
      try {
        const err = (await response.json()) as unknown;
        errorMessage = extractErrorMessage(err);
      } catch {
        // no-op
      }
      return { ok: false, status: response.status, data: null, errorMessage };
    }
    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data, errorMessage: null };
  } catch {
    return { ok: false, status: 503, data: null, errorMessage: 'Service indisponible. Reessayez dans un instant.' };
  }
}

export async function postApiEmpty(
  req: Request,
  path: string
): Promise<{ ok: boolean; status: number }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7890';
  const token = getAccessToken(req);
  if (!token) return { ok: false, status: 401 };

  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 503 };
  }
}

export async function postApiMultipart<T>(
  req: Request,
  path: string,
  file: { buffer: Buffer; originalname: string; mimetype: string }
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7890';
  const token = getAccessToken(req);
  if (!token) return { ok: false, status: 401, data: null };

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
  formData.append('file', blob, file.originalname);

  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`
      },
      body: formData
    });
    if (!response.ok) return { ok: false, status: response.status, data: null };
    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: 503, data: null };
  }
}
