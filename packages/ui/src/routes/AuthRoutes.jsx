import { lazy } from 'react'
import Loadable from '@/ui-component/loading/Loadable'
import AuthLayout from '@/layout/AuthLayout'

// Auth is handled by Clerk in App.jsx - these routes are kept for compatibility
const UnauthorizedPage = Loadable(lazy(() => import('@/views/auth/unauthorized')))
const RateLimitedPage = Loadable(lazy(() => import('@/views/auth/rateLimited')))

const AuthRoutes = {
    path: '/',
    element: <AuthLayout />,
    children: [
        {
            path: '/unauthorized',
            element: <UnauthorizedPage />
        },
        {
            path: '/rate-limited',
            element: <RateLimitedPage />
        }
    ]
}

export default AuthRoutes
