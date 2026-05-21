import { Body, Controller, Get, Param, Post, Redirect, Render, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { fetchApiJson, patchApiJson, postApiJson } from '../lib/api-client';
import { AuthUser, PageContext } from '../security/auth.types';
import { WebAuthGuard } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };

@Controller('/admin/categories')
@UseGuards(WebAuthGuard)
export class CategoriesController {
  private extractSubCategoriesFromBody(
    body: Record<string, unknown>,
    forUpdate: boolean
  ): Array<{ id?: string; title?: string; slug?: string; icon?: string }> {
    const subMap = new Map<string, { id?: string; title?: string; slug?: string; icon?: string }>();

    // Case 1: flat keys => sub_categories[idx][field]
    Object.keys(body).forEach((key) => {
      const m = key.match(/^sub_categories\[(.+?)\]\[(title|slug|icon)\]$/);
      if (!m) return;
      const idx = m[1];
      const field = m[2] as 'title' | 'slug' | 'icon';
      if (!subMap.has(idx)) subMap.set(idx, forUpdate ? { id: idx } : {});
      subMap.get(idx)![field] = String(body[key] ?? '');
    });

    // Case 2: nested object => sub_categories: { idx: { title, slug, icon } }
    const nested = body.sub_categories;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      Object.entries(nested as Record<string, unknown>).forEach(([idx, value]) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        const row = value as Record<string, unknown>;
        if (!subMap.has(idx)) subMap.set(idx, forUpdate ? { id: idx } : {});
        const target = subMap.get(idx)!;
        if (row.title !== undefined) target.title = String(row.title ?? '');
        if (row.slug !== undefined) target.slug = String(row.slug ?? '');
        if (row.icon !== undefined) target.icon = String(row.icon ?? '');
      });
    }

    const rows = Array.from(subMap.values());
    if (forUpdate) {
      rows.forEach((row) => {
        if (row.id && !/^[0-9a-f-]{8,}$/i.test(row.id)) row.id = '';
      });
    }
    return rows;
  }

  private buildPage(req: RequestWithAuth, title: string): PageContext {
    return {
      title: `${title} - Wikigouv`,
      activeNav: 'courses',
      currentPath: req.path,
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Categories' }]
    };
  }

  @Get()
  @Render('pages/panel/categories-list')
  async list(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'Categories');
    const api = await fetchApiJson<{ items?: Array<Record<string, unknown>> }>(req, '/api/admin/education/categories?page=1&pageSize=100');
    return {
      page,
      categories: api.data?.items ?? [],
      listStatus: api.status
    };
  }

  @Get('create')
  @Render('pages/panel/categories-create')
  async createForm(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'New Category');
    return { page, category: null, subCategories: [] };
  }

  @Post('store')
  @Redirect('/admin/categories')
  async store(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      locale?: string;
      title?: string;
      slug?: string;
      icon?: string;
      order?: string;
      has_sub?: string;
      [k: string]: unknown;
    }
  ) {
    const sub_categories = this.extractSubCategoriesFromBody(
      body as Record<string, unknown>,
      false
    );

    const result = await postApiJson(req, '/api/admin/education/categories', {
      title: String(body.title ?? ''),
      slug: String(body.slug ?? ''),
      icon: String(body.icon ?? ''),
      order: body.order ? Number(body.order) : null,
      status: 'ACTIVE',
      sub_categories: body.has_sub === 'on' || sub_categories.length > 0 ? sub_categories : []
    });
    const subCount = sub_categories.filter((s) => String(s.title ?? '').trim().length > 0).length;
    return {
      url: result.ok
        ? `/admin/categories?ok=created_sub_${subCount}`
        : `/admin/categories/create?error=create_${result.status}`
    };
  }

  @Get(':id/edit')
  @Render('pages/panel/categories-create')
  async editForm(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page = this.buildPage(req, 'Edit Category');
    const result = await fetchApiJson<{ category?: Record<string, unknown>; subCategories?: Array<Record<string, unknown>> }>(
      req,
      `/api/admin/education/categories/${encodeURIComponent(id)}`
    );
    return {
      page,
      category: result.data?.category ?? null,
      subCategories: result.data?.subCategories ?? []
    };
  }

  @Post(':id/update')
  @Redirect('/admin/categories')
  async update(
    @Req() req: RequestWithAuth,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    const sub_categories = this.extractSubCategoriesFromBody(
      body as Record<string, unknown>,
      true
    );

    const result = await patchApiJson(req, `/api/admin/education/categories/${encodeURIComponent(id)}`, {
      title: String(body.title ?? ''),
      slug: String(body.slug ?? ''),
      icon: String(body.icon ?? ''),
      order: body.order ? Number(body.order) : null,
      status: String(body.status ?? 'ACTIVE'),
      sub_categories: body.has_sub === 'on' || sub_categories.length > 0 ? sub_categories : []
    });
    const subCount = sub_categories.filter((s) => String(s.title ?? '').trim().length > 0).length;
    return {
      url: result.ok
        ? `/admin/categories?ok=updated_sub_${subCount}`
        : `/admin/categories/${encodeURIComponent(id)}/edit?error=update_${result.status}`
    };
  }

  @Post(':id/delete')
  @Redirect('/admin/categories')
  async delete(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const result = await postApiJson(req, `/api/admin/education/categories/${encodeURIComponent(id)}/delete`, {});
    return { url: result.ok ? '/admin/categories?ok=deleted' : `/admin/categories?error=delete_${result.status}` };
  }

  @Get('trends')
  @Render('pages/panel/categories-trends-list')
  async trends(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'Trending Categories');
    const result = await fetchApiJson<{ items?: Array<Record<string, unknown>> }>(req, '/api/admin/education/categories/trends?page=1&pageSize=100');
    return { page, trends: result.data?.items ?? [], listStatus: result.status };
  }

  @Get('trends/create')
  @Render('pages/panel/categories-trends-create')
  async trendCreateForm(@Req() req: RequestWithAuth) {
    const page = this.buildPage(req, 'New Trend Category');
    const categoriesRes = await fetchApiJson<{ items?: Array<Record<string, unknown>> }>(req, '/api/admin/education/categories?page=1&pageSize=200');
    return { page, trend: null, categories: categoriesRes.data?.items ?? [] };
  }

  @Post('trends/store')
  @Redirect('/admin/categories/trends')
  async trendStore(@Req() req: RequestWithAuth, @Body() body: { category_id?: string; icon?: string; color?: string }) {
    const result = await postApiJson(req, '/api/admin/education/categories/trends', body);
    return { url: result.ok ? '/admin/categories/trends?ok=created' : `/admin/categories/trends/create?error=create_${result.status}` };
  }

  @Get('trends/:id/edit')
  @Render('pages/panel/categories-trends-create')
  async trendEditForm(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const page = this.buildPage(req, 'Edit Trend Category');
    const [trendRes, categoriesRes] = await Promise.all([
      fetchApiJson<Record<string, unknown>>(req, `/api/admin/education/categories/trends/${encodeURIComponent(id)}`),
      fetchApiJson<{ items?: Array<Record<string, unknown>> }>(req, '/api/admin/education/categories?page=1&pageSize=200')
    ]);
    return { page, trend: trendRes.data ?? null, categories: categoriesRes.data?.items ?? [] };
  }

  @Post('trends/:id/update')
  @Redirect('/admin/categories/trends')
  async trendUpdate(@Req() req: RequestWithAuth, @Param('id') id: string, @Body() body: { category_id?: string; icon?: string; color?: string }) {
    const result = await patchApiJson(req, `/api/admin/education/categories/trends/${encodeURIComponent(id)}`, body);
    return { url: result.ok ? '/admin/categories/trends?ok=updated' : `/admin/categories/trends/${encodeURIComponent(id)}/edit?error=update_${result.status}` };
  }

  @Post('trends/:id/delete')
  @Redirect('/admin/categories/trends')
  async trendDelete(@Req() req: RequestWithAuth, @Param('id') id: string) {
    const result = await postApiJson(req, `/api/admin/education/categories/trends/${encodeURIComponent(id)}/delete`, {});
    return { url: result.ok ? '/admin/categories/trends?ok=deleted' : `/admin/categories/trends?error=delete_${result.status}` };
  }
}
