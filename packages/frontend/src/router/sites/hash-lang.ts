import type { RouteRecordRaw } from 'vue-router';

export const hashLangRoute: RouteRecordRaw = {
    path: '/hash-lang',
    children: [
        {
            name: 'hash-lang',
            path: '',
            component: () => import('@/views/hash-lang/HashLangHomeView.vue'),
        },
        {
            name: 'hash-lang-doc',
            path: 'doc/:path*',
            component: () => import('@/views/hash-lang/HashLangDocView.vue'),
            props: (route) => {
                if (route.params.path == '') {
                    return { path: [] };
                }
                return route.params;
            },
        },
    ],
};
