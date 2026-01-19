import { createRouter, createWebHistory } from 'vue-router';
import { tavernCardsRoute } from './sites/tavern-cards';
import { hashLangRoute } from './sites/hash-lang';
import { blogRoute } from './sites/blog';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/HomeView.vue'),
        },
        tavernCardsRoute,
        hashLangRoute,
        blogRoute,
        {
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            component: () => import('@/views/NotFoundView.vue'),
        },
    ],
});

export default router;
