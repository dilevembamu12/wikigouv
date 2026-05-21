import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type KeycloakRole = { id: string; name: string };
type KeycloakUser = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
};

@Injectable()
export class IamService {
  private readonly realm: string;
  private readonly apiClientId: string;
  private readonly adminClientId: string;
  private readonly adminClientSecret: string;
  private readonly issuerUrl: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.realm = this.config.get<string>('KEYCLOAK_REALM', 'wikigouv');
    this.apiClientId = this.config.get<string>('KEYCLOAK_API_CLIENT_ID', 'wikigouv-api');
    this.adminClientId = this.config.get<string>('KEYCLOAK_ADMIN_CLIENT_ID', 'wikigouv-admin-service');
    this.adminClientSecret = this.config.get<string>('KEYCLOAK_ADMIN_CLIENT_SECRET', '');
    this.issuerUrl = this.config.get<string>('KEYCLOAK_ISSUER_URL', '');
    this.baseUrl = this.issuerUrl.replace(new RegExp(`/realms/${this.realm}$`), '');
  }

  async listClientRoles(): Promise<KeycloakRole[]> {
    const token = await this.getAdminAccessToken();
    const clientUuid = await this.getClientUuid(token);
    const roles = await this.kcFetch<KeycloakRole[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/clients/${clientUuid}/roles`,
      token
    );
    return roles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listUsersWithRoles(
    search?: string,
    page = 1,
    pageSize = 20
  ): Promise<{
    items: Array<{
      id: string;
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      enabled?: boolean;
      roles: string[];
    }>;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const token = await this.getAdminAccessToken();
    const clientUuid = await this.getClientUuid(token);
    const q = new URLSearchParams();
    const safePage = Math.max(1, Number(page || 1));
    const safePageSize = Math.max(1, Math.min(100, Number(pageSize || 20)));
    q.set('first', String((safePage - 1) * safePageSize));
    q.set('max', String(safePageSize));
    if (search) q.set('search', search);

    const users = await this.kcFetch<KeycloakUser[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/users?${q.toString()}`,
      token
    );

    const enriched = await Promise.all(
      users.map(async (user) => {
        const mappings = await this.kcFetch<KeycloakRole[]>(
          `${this.baseUrl}/admin/realms/${this.realm}/users/${user.id}/role-mappings/clients/${clientUuid}`,
          token
        );

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          enabled: user.enabled,
          roles: mappings.map((r) => r.name).sort()
        };
      })
    );

    const totalQuery = new URLSearchParams();
    if (search) totalQuery.set('search', search);
    totalQuery.set('max', '10000');
    const totalUsers = await this.kcFetch<KeycloakUser[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/users?${totalQuery.toString()}`,
      token
    );

    const total = totalUsers.length;
    return {
      items: enriched,
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize))
    };
  }

  async syncUserClientRoles(userId: string, requestedRoles: string[]): Promise<{
    userId: string;
    roles: string[];
    oldRoles: string[];
    addedRoles: string[];
    removedRoles: string[];
  }> {
    const token = await this.getAdminAccessToken();
    const clientUuid = await this.getClientUuid(token);
    const availableRoles = await this.listClientRolesByToken(token, clientUuid);
    const requestedSet = new Set(requestedRoles);
    const validRequested = availableRoles.filter((r) => requestedSet.has(r.name));

    const current = await this.kcFetch<KeycloakRole[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
      token
    );
    const oldRoles = current.map((r) => r.name).sort();
    const currentSet = new Set(oldRoles);

    const toAdd = validRequested.filter((r) => !currentSet.has(r.name));
    const requestedNames = new Set(validRequested.map((r) => r.name));
    const toRemove = current.filter((r) => !requestedNames.has(r.name));

    if (toAdd.length > 0) {
      await this.kcFetchNoContent(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
        token,
        'POST',
        toAdd
      );
    }
    if (toRemove.length > 0) {
      await this.kcFetchNoContent(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
        token,
        'DELETE',
        toRemove
      );
    }

    const refreshed = await this.kcFetch<KeycloakRole[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/clients/${clientUuid}`,
      token
    );

    const newRoles = refreshed.map((r) => r.name).sort();
    return {
      userId,
      roles: newRoles,
      oldRoles,
      addedRoles: toAdd.map((r) => r.name).sort(),
      removedRoles: toRemove.map((r) => r.name).sort()
    };
  }

  private async getAdminAccessToken(): Promise<string> {
    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('client_id', this.adminClientId);
    body.set('client_secret', this.adminClientSecret);

    const response = await fetch(`${this.issuerUrl}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Impossible d’obtenir le token admin Keycloak');
    }

    const json = (await response.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new InternalServerErrorException('Token admin Keycloak manquant');
    }
    return json.access_token;
  }

  private async getClientUuid(token: string): Promise<string> {
    const clients = await this.kcFetch<Array<{ id: string; clientId: string }>>(
      `${this.baseUrl}/admin/realms/${this.realm}/clients?clientId=${encodeURIComponent(this.apiClientId)}`,
      token
    );
    const target = clients.find((c) => c.clientId === this.apiClientId);
    if (!target?.id) {
      throw new InternalServerErrorException('Client Keycloak API introuvable');
    }
    return target.id;
  }

  private async listClientRolesByToken(token: string, clientUuid: string): Promise<KeycloakRole[]> {
    return this.kcFetch<KeycloakRole[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/clients/${clientUuid}/roles`,
      token
    );
  }

  private async kcFetch<T>(url: string, token: string): Promise<T> {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new InternalServerErrorException(`Keycloak request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }

  private async kcFetchNoContent(
    url: string,
    token: string,
    method: 'POST' | 'DELETE',
    payload: unknown
  ): Promise<void> {
    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new InternalServerErrorException(`Keycloak role update failed (${response.status})`);
    }
  }
}
