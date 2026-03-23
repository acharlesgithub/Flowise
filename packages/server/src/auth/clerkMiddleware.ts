/**
 * VoxScribe Auth Middleware - powered by Clerk
 * Replaces enterprise Passport.js auth with Clerk JWT verification
 */
import { clerkMiddleware, getAuth } from '@clerk/express'
import express, { NextFunction, Request, Response } from 'express'
import { IdentityManager } from '../IdentityManager'
import { getDataSource } from '../DataSource'
import { UserSubscription } from '../database/entities/UserSubscription'
import { StripeManager } from '../StripeManager'
import logger from '../utils/logger'

/**
 * Initialize Clerk middleware on the Express app.
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
 * Queries UserSubscription table to populate real Stripe subscription data.
 */
export const verifyClerkToken = async (req: Request, res: Response, next: NextFunction) => {
    if (!process.env.CLERK_SECRET_KEY) {
        next()
        return
    }

    const auth = getAuth(req)
    if (!auth || !auth.userId) {
        return res.status(401).json({ error: 'Unauthorized - please sign in' })
    }

    // Look up subscription data from database
    let subscriptionId = ''
    let customerId = ''
    let productId = ''
    let features: Record<string, string> = {}

    try {
        const dataSource = getDataSource()
        const repo = dataSource.getRepository(UserSubscription)
        const userSub = await repo.findOneBy({ clerkUserId: auth.userId })

        if (userSub && userSub.stripeSubscriptionId && (userSub.status === 'active' || userSub.status === 'trialing')) {
            subscriptionId = userSub.stripeSubscriptionId
            customerId = userSub.stripeCustomerId || ''
            productId = userSub.stripeProductId || ''

            // Load features from Stripe product metadata
            if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
                try {
                    const stripeManager = await StripeManager.getInstance()
                    features = await stripeManager.getFeaturesByPlan(subscriptionId)
                } catch {
                    // Non-fatal - continue without features
                }
            }
        }
    } catch {
        // Non-fatal - continue with empty subscription data
    }

    // @ts-ignore
    req.user = {
        id: auth.userId,
        email: '',
        name: '',
        roleId: 'owner',
        activeOrganizationId: auth.userId,
        activeOrganizationSubscriptionId: subscriptionId,
        activeOrganizationCustomerId: customerId,
        activeOrganizationProductId: productId,
        isOrganizationAdmin: true,
        activeWorkspaceId: auth.userId,
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
        features
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
