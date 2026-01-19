import type { RouteRecordRaw } from 'vue-router';

export const tavernCardsRoute: RouteRecordRaw = {
    path: '/tavern-cards',
    component: () => import('@/views/tavern-cards/TavernCardsBaseView.vue'),
    children: [
        {
            name: 'tavern-cards',
            path: '',
            component: () => import('@/views/tavern-cards/TavernCardsView.vue'),
        },
        {
            name: 'tavern-card',
            path: ':name',
            component: () => import('@/views/tavern-cards/TavernCardView.vue'),
            props: true,
        },
    ],
};
