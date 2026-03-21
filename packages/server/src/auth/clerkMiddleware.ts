/**
 * VoxScribe Auth Middleware - powered by Clerk
 * Replaces enterprise Passport.js auth with Clerk JWT verification
 */
import { clerkMiddleware, getAuth } from '@clerk/express'
import express, { NextFunction, Request, Response } from 'express'
import { IdentityManager } from '../IdentityManager'
import logger from '../utils/logger'

/**
 * Initialize Clerk middleware on the Express app.
 * Replaces the old initializeJwtCookieMiddleware from enterprise/passport.
 */
export const initializeClerkMiddleware = async (app: express.Application, _identityManager: IdentityManager) => {
    if (!process.env.CLERK_SECRET_KEY) {
        logger.warn('⚠️ [auth]: CLERK_SECRET_KEY not set - auth disabled (development mode)')
        return
    }
    app.use(clerkMiddleware())
    logger.info('🔐 [auth]: Clerk middleware initialized')
}

/**
 * Verify that the request has a valid Clerk session.
 * Replaces the old verifyToken from enterprise/passport.
 * Called for internal API requests (x-request-from: internal).
 */
export const verifyClerkToken = (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.CLERK_SECRET_KEY) {
        // No Clerk configured - allow all requests (development mode)
        next()
        return
    }

    const auth = getAuth(req)
    if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'Unauthorized - please sign in' })
    }

    // Set req.user for downstream compatibility
    // @ts-ignore
    req.user = {
        id: auth.userId,
        email: '',
        name: '',
        roleId: 'owner',
        activeOrganizationId: auth.userId, // use userId as org for single-user MVP
        activeOrganizationSubscriptionId: '',
        activeOrganizationCustomerId: '',
        activeOrganizationProductId: '',
        isOrganizationAdmin: true,
        activeWorkspaceId: auth.userId, // use userId as workspace for single-user MVP
        activeWorkspace: 'default',
        assignedWorkspaces: [{ id: auth.userId, name: 'default', role: 'owner', organizationId: auth.userId }],
        permissions: [
            'chatflows:crud',
            'agentflows:crud',
            'assistants:crud',
            'credentials:crud',
            'variables:crud',
            'apikeys:crud',
            'tools:crud',
            'documentStores:crud'
        ],
        features: {}
    }
    next()
}

/**
 * Verify token for BullMQ Dashboard access.
 * Replaces the old verifyTokenForBullMQDashboard from enterprise/passport.
 */
export const verifyClerkTokenForBullMQDashboard = (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.CLERK_SECRET_KEY) {
        next()
        return
    }

    const auth = getAuth(req)
    if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    next()
}

/**
 * No-op replacement for initAuthSecrets.
 * Clerk handles its own secret management via CLERK_SECRET_KEY env var.
 */
export const initAuthSecrets = async (): Promise<void> => {
    if (process.env.CLERK_SECRET_KEY) {
        logger.info('🔑 [auth]: Clerk auth configured')
    } else {
        logger.warn('⚠️ [auth]: No CLERK_SECRET_KEY found - running without auth')
    }
}
