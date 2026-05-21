import { Body, Controller, Get, Param, Post, Redirect, Render, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { fetchApiJson, patchApiJson, postApiJson } from '../lib/api-client';
import { AuthUser, PageContext, WebRole } from '../security/auth.types';
import { WebAuthGuard } from '../security/web-auth.guard';

type RequestWithAuth = Request & { authUser?: AuthUser };

type AdminRouteConfig = {
  label: string;
  activeNav: string;
  roles: WebRole[];
  comingSoon?: boolean;
  apiEndpoint?: string;
  tableColumns?: string[];
};

const ADMIN_ROUTE_CONFIG: Record<string, AdminRouteConfig> = {
  'marketing': { label: 'Marketing Dashboard', activeNav: 'dashboard', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'bundles': { label: 'Course Bundles', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'upcoming_courses': { label: 'Upcoming Courses', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'DIRECTION'], comingSoon: true },
  'events': { label: 'Events', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'assignments': { label: 'Assignments', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AGENT'], comingSoon: true },
  'course-noticeboards': { label: 'Course Notices', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'enrollments/history': { label: 'Enrollment', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AUDITEUR'], comingSoon: true },
  'waitlists': { label: 'Waitlists', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AUDITEUR'], comingSoon: true },
  'categories': {
    label: 'Categories',
    activeNav: 'courses',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'],
    apiEndpoint: '/api/admin/content/categories',
    tableColumns: ['id', 'name', 'status', 'createdAt']
  },
  'filters': { label: 'Filters', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'reviews': {
    label: 'Reviews',
    activeNav: 'courses',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AUDITEUR'],
    apiEndpoint: '/api/admin/education/course-reviews',
    tableColumns: ['id', 'courseTitle', 'authorName', 'rating', 'comment', 'status', 'createdAt']
  },
  'attendances': { label: 'Attendance', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AUDITEUR'], comingSoon: true },
  'consultants': { label: 'Consultants', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'appointments': { label: 'Meetings', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'meeting-packages': { label: 'Meeting Packages', activeNav: 'courses', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'all-users': {
    label: 'Users',
    activeNav: 'users',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    apiEndpoint: '/api/admin/users/list',
    tableColumns: ['keycloakUserId', 'fullName', 'email', 'department', 'status']
  },
  'users/not-access-to-content': { label: 'Access Restricted', activeNav: 'users', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'roles': { label: 'User Roles', activeNav: 'users', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'users/groups': { label: 'Groups', activeNav: 'users', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'users/badges': { label: 'Badges', activeNav: 'users', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'users/become-instructors/instructors': {
    label: 'Instructor Requests',
    activeNav: 'users',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    apiEndpoint: '/api/admin/users/become-instructors/instructors',
    tableColumns: ['id', 'fullName', 'email', 'jobTitle', 'status', 'createdAt']
  },
  'users/delete-account-requests': { label: 'Account Deletion Requests', activeNav: 'users', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'users/login-history': {
    label: 'IP Management',
    activeNav: 'users',
    roles: ['SUPER_ADMIN', 'ADMIN', 'AUDITEUR'],
    apiEndpoint: '/api/admin/users/login-history',
    tableColumns: ['actorUserId', 'action', 'ipAddress', 'createdAt']
  },
  'forums': {
    label: 'Forums',
    activeNav: 'forum',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'],
    apiEndpoint: '/api/admin/forum/topics',
    tableColumns: ['title', 'status', 'createdById', 'createdAt']
  },
  'featured-topics': { label: 'Featured Topics', activeNav: 'forum', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'recommended-topics': { label: 'Recommended Topics', activeNav: 'forum', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'supports': {
    label: 'Support Tickets',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AGENT', 'DIRECTION', 'AUDITEUR'],
    apiEndpoint: '/api/admin/crm/supports',
    tableColumns: ['subject', 'status', 'priority', 'openedById', 'createdAt']
  },
  'supports?type=course_conversations': { label: 'Courses Support', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'comments/webinars': {
    label: 'Comments',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'AUDITEUR'],
    apiEndpoint: '/api/admin/education/course-comments',
    tableColumns: ['id', 'courseTitle', 'authorName', 'message', 'status', 'createdAt']
  },
  'reports/webinars': { label: 'Reports', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN', 'DIRECTION', 'AUDITEUR'], comingSoon: true },
  'contacts': { label: 'Contact Messages', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'noticeboards': {
    label: 'Noticeboard',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'],
    apiEndpoint: '/api/admin/crm/noticeboards',
    tableColumns: ['title', 'status', 'createdById', 'createdAt']
  },
  'notifications': {
    label: 'Notifications',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR', 'DIRECTION'],
    apiEndpoint: '/api/admin/crm/notifications',
    tableColumns: ['title', 'audience', 'status', 'createdAt']
  },
  'blog': {
    label: 'Blog',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'],
    apiEndpoint: '/api/admin/content/blog',
    tableColumns: ['title', 'status', 'createdById', 'createdAt']
  },
  'pages': {
    label: 'Pages',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    apiEndpoint: '/api/admin/content/pages',
    tableColumns: ['title', 'status', 'createdById', 'createdAt']
  },
  'additional_page/contact_us': { label: 'Additional Pages', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'testimonials': { label: 'Testimonials', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'tags': {
    label: 'Tags',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'],
    apiEndpoint: '/api/admin/content/tags',
    tableColumns: ['name', 'createdAt']
  },
  'regions/countries': { label: 'Localization', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'forms': { label: 'Form Builder', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'ai-contents/lists': { label: 'AI Content', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN', 'FORMATEUR'], comingSoon: true },
  'content-delete-requests': { label: 'Content Deletion Requests', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN', 'AUDITEUR'], comingSoon: true },
  'instructor-finder/settings': { label: 'Tutor Finder', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'advertising/banners': { label: 'Ad Banners', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'newsletters': {
    label: 'Email Newsletters',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    apiEndpoint: '/api/admin/crm/newsletters',
    tableColumns: ['subject', 'status', 'createdById', 'createdAt']
  },
  'product-badges': { label: 'Custom Badges', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'themes': { label: 'Themes', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'landing-builder/all-pages': { label: 'Landing Builder', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'imports': { label: 'Bulk Import', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'translator': { label: 'Translator', activeNav: 'support', roles: ['SUPER_ADMIN', 'ADMIN'], comingSoon: true },
  'settings': {
    label: 'Settings',
    activeNav: 'support',
    roles: ['SUPER_ADMIN', 'ADMIN'],
    apiEndpoint: '/api/admin/settings/app',
    tableColumns: ['key', 'value', 'createdAt']
  }
};

@Controller('/admin')
@UseGuards(WebAuthGuard)
export class AdminPanelController {
  @Get(':path(*)')
  @Render('pages/panel/admin-list')
  async renderAdminPage(@Req() req: RequestWithAuth, @Param('path') path: string) {
    const userRoles = req.authUser?.roles ?? [];
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
    const config = ADMIN_ROUTE_CONFIG[path];
    if (!config) {
      const page: PageContext = {
        title: 'Page non implémentée - Wikigouv',
        activeNav: 'dashboard',
        currentPath: req.path,
        user: req.authUser ?? null
      };
      return { page, featureTitle: path, allowed: isSuperAdmin, comingSoon: true, items: [], tableColumns: [], listStatus: 404 };
    }

    const allowed = isSuperAdmin || config.roles.some((role) => userRoles.includes(role));

    const page: PageContext = {
      title: `${config.label} - Wikigouv`,
      activeNav: config.activeNav,
      currentPath: req.path,
      user: req.authUser ?? null,
      breadcrumbs: [{ label: 'Tableau de bord', href: '/dashboard' }, { label: config.label }]
    };
    const ok = req.query.ok as string | undefined;
    const error = req.query.error as string | undefined;
    if (ok) page.alert = { type: 'success', message: `Succès: ${ok}` };
    if (error) page.alert = { type: 'danger', message: `Erreur: ${error}` };

    let listStatus = 200;
    let items: Array<Record<string, unknown>> = [];
    let total = 0;
    let totalPages = 1;
    let pageNumber = Math.max(1, Number((req.query.page as string | undefined) ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, Number((req.query.pageSize as string | undefined) ?? '10') || 10));
    const q = String((req.query.q as string | undefined) ?? '');
    const status = String((req.query.status as string | undefined) ?? '');

    if (allowed && config.apiEndpoint) {
      const queryParts = [
        `page=${pageNumber}`,
        `pageSize=${pageSize}`,
        q ? `q=${encodeURIComponent(q)}` : '',
        status ? `status=${encodeURIComponent(status)}` : ''
      ].filter(Boolean);
      const listRes = await fetchApiJson<{
        items?: Array<Record<string, unknown>>;
        page?: number;
        pageSize?: number;
        total?: number;
        totalPages?: number;
      }>(req, `${config.apiEndpoint}?${queryParts.join('&')}`);
      listStatus = listRes.status;
      items = listRes.data?.items ?? [];
      total = listRes.data?.total ?? 0;
      totalPages = listRes.data?.totalPages ?? 1;
      pageNumber = listRes.data?.page ?? pageNumber;
    }

    return {
      page,
      featureTitle: config.label,
      allowed,
      comingSoon: config.comingSoon ?? !config.apiEndpoint,
      items,
      total,
      totalPages,
      pageNumber,
      pageSize,
      listStatus,
      query: { q, status },
      tableColumns: config.tableColumns ?? []
    };
  }

  @Post('action/create')
  @Redirect('/dashboard')
  async createItem(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      path?: string;
      title?: string;
      message?: string;
      subject?: string;
      content?: string;
      courseId?: string;
      authorName?: string;
      authorEmail?: string;
      rating?: string;
    }
  ) {
    const path = String(body.path ?? '');
    const config = ADMIN_ROUTE_CONFIG[path];
    if (!config || !config.apiEndpoint) return { url: '/not-implemented?error=missing_route' };

    const payloadByPath: Record<string, Record<string, unknown>> = {
      supports: {
        subject: String(body.subject ?? body.title ?? 'Nouveau ticket'),
        message: String(body.message ?? body.content ?? 'Message support'),
        priority: 'MEDIUM'
      },
      notifications: {
        title: String(body.title ?? 'Nouvelle notification'),
        message: String(body.message ?? body.content ?? 'Contenu notification'),
        audience: 'ALL'
      },
      blog: {
        title: String(body.title ?? 'Nouveau billet'),
        content: String(body.content ?? body.message ?? ''),
        status: 'DRAFT'
      },
      categories: {
        name: String(body.title ?? 'Nouvelle categorie'),
        status: String(body.subject ?? 'ACTIVE').toUpperCase()
      },
      'comments/webinars': {
        courseId: String(body.courseId ?? body.subject ?? ''),
        authorName: String(body.authorName ?? body.title ?? 'Admin'),
        authorEmail: String(body.authorEmail ?? ''),
        message: String(body.message ?? body.content ?? ''),
        status: 'PUBLISHED'
      },
      reviews: {
        courseId: String(body.courseId ?? body.subject ?? ''),
        authorName: String(body.authorName ?? body.title ?? 'Admin'),
        authorEmail: String(body.authorEmail ?? ''),
        rating: Math.max(1, Math.min(5, Number(body.rating ?? '5') || 5)),
        comment: String(body.message ?? body.content ?? ''),
        status: 'PUBLISHED'
      }
    };
    const payload = payloadByPath[path] ?? { title: String(body.title ?? 'Nouveau contenu') };
    const result = await postApiJson(req, config.apiEndpoint, payload);
    return { url: `/admin/${path}${result.ok ? '?ok=created' : `?error=create_${result.status}`}` };
  }

  @Post('action/status')
  @Redirect('/dashboard')
  async updateStatus(
    @Req() req: RequestWithAuth,
    @Body()
    body: {
      path?: string;
      id?: string;
      status?: string;
    }
  ) {
    const path = String(body.path ?? '');
    const id = String(body.id ?? '');
    const status = String(body.status ?? '');
    if (!path || !id || !status) return { url: '/not-implemented?error=missing_params' };

    const patchRouteByPath: Record<string, string> = {
      supports: `/api/admin/crm/supports/${id}`,
      notifications: `/api/admin/crm/notifications/${id}`,
      blog: `/api/admin/content/blog/${id}`,
      categories: `/api/admin/content/categories/${id}`,
      'users/become-instructors/instructors': `/api/admin/users/become-instructors/instructors/${id}`,
      'comments/webinars': `/api/admin/education/course-comments/${id}`,
      reviews: `/api/admin/education/course-reviews/${id}`
    };
    const route = patchRouteByPath[path];
    if (!route) return { url: `/admin/${path}?error=unsupported_status_update` };

    const payload =
      path === 'users/become-instructors/instructors'
        ? { decision: status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : undefined, status }
        : { status };
    const result = await patchApiJson(req, route, payload);
    return { url: `/admin/${path}${result.ok ? '?ok=status_updated' : `?error=update_${result.status}`}` };
  }

  @Post('action/delete')
  @Redirect('/dashboard')
  async deleteItem(@Req() req: RequestWithAuth, @Body() body: { path?: string; id?: string }) {
    const path = String(body.path ?? '');
    const id = String(body.id ?? '');
    if (!path || !id) return { url: '/not-implemented?error=missing_params' };
    const deleteRouteByPath: Record<string, string> = {
      'comments/webinars': `/api/admin/education/course-comments/${id}/delete`,
      reviews: `/api/admin/education/course-reviews/${id}/delete`
    };
    const route = deleteRouteByPath[path];
    if (!route) return { url: `/admin/${path}?error=unsupported_delete` };
    const result = await postApiJson(req, route, {});
    return { url: `/admin/${path}${result.ok ? '?ok=deleted' : `?error=delete_${result.status}`}` };
  }
}
