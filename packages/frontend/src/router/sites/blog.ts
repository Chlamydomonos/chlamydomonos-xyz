import type { RouteRecordRaw } from 'vue-router';

export const blogRoute: RouteRecordRaw = {
    path: '/blog',
    children: [
        {
            name: 'blog',
            path: ':page(\\d+)?',
            component: () => import('@/views/blog/BlogView.vue'),
            props: (to) => {
                if (typeof to.params.page != 'string' || to.params.page == '') {
                    return { page: 1 };
                }
                return { page: parseInt(to.params.page) };
            },
        },
        {
            name: 'blog-about',
            path: 'about',
            component: () => import('@/views/blog/BlogAboutView.vue'),
        },
        {
            name: 'blog-archive',
            path: 'archive/:pathMatch(\\d{4}|\\d{4}/\\d{2}|\\d{4}/\\d{2}/\\d{2}|\\d{4}/\\d{2}/\\d{2}/\\d+)?',
            component: () => import('@/views/blog/BlogArchiveView.vue'),
            props: (to) => {
                if (typeof to.params.pathMatch != 'string' || to.params.pathMatch == '') {
                    return { date: {} };
                }

                const parts = to.params.pathMatch.split('/');
                const date: Record<string, string> = {};

                if (parts.length >= 1) {
                    date.year = parts[0];
                }
                if (parts.length >= 2) {
                    date.month = parts[1];
                }
                if (parts.length >= 3) {
                    date.day = parts[2];
                }

                return { date, page: parts.length >= 4 ? parseInt(parts[3]) : undefined };
            },
        },
        {
            name: 'blog-post',
            path: 'posts/:id(.+)',
            component: () => import('@/views/blog/BlogPostView.vue'),
            props: true,
        },
        {
            name: 'blog-category',
            path: 'categories/:path(.+)?',
            component: () => import('@/views/blog/BlogCategoryView.vue'),
            props: (to) => {
                const path = to.params.path;
                if (typeof path != 'string' || path == '') {
                    return { categories: [], page: 1 };
                }

                const items = path.split('/');
                const page = parseInt(items[items.length - 1]);

                if (!isNaN(page)) {
                    return { categories: items.slice(0, -1), page };
                }

                return { categories: items, page: 1 };
            },
        },
        {
            name: 'blog-tags',
            path: 'tags',
            component: () => import('@/views/blog/BlogTagsView.vue'),
        },
        {
            name: 'blog-tag',
            path: 'tag/:pathMatch(.+)',
            component: () => import('@/views/blog/BlogTagView.vue'),
            props: (to) => {
                if (typeof to.params.pathMatch != 'string') {
                    return {};
                }
                const match = /^(.+?)(?:\/(\d+))?$/.exec(to.params.pathMatch);
                if (!match) {
                    return {};
                }

                return { tag: match[1], page: match[2] ? parseInt(match[2]) : 1 };
            },
        },
    ],
};
