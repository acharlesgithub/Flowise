/**
 * VoxScribe Auth Middleware - powered by Clerk
 * Replaces enterprise Passport.js auth with Clerk JWT verification
 */
import crypto from 'crypto'
import { clerkMiddleware, getAuth } from '@clerk/express'
import express, { NextFunction, Request, Response } from 'express'
import { IdentityManager } from '../IdentityManager'
import { getDataSource } from '../DataSource'
import { UserSubscription } from '../database/entities/UserSubscription'
import { Credential } from '../database/entities/Credential'
import { StripeManager } from '../StripeManager'
import { encryptCredentialData } from '../utils'
import logger from '../utils/logger'

// Track users who have already been provisioned to avoid repeated DB checks
const provisionedUsers = new Set<string>()

/**
 * Convert a Clerk userId (e.g. "user_3BLj...") to a deterministic UUID v5.
 * The database expects UUID format for workspaceId, organizationId, etc.
 */
function clerkUserIdToUuid(clerkUserId: string): string {
    // Use a fixed namespace UUID for VoxScribe
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8' // DNS namespace UUID
    const hash = crypto
        .createHash('sha1')
        .update(namespace + clerkUserId)
        .digest('hex')
    // Format as UUID v5
    return [
        hash.substring(0, 8),
        hash.substring(8, 12),
        '5' + hash.substring(13, 16), // version 5
        ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20),
        hash.substring(20, 32)
    ].join('-')
}

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

    // Convert Clerk userId to UUID for database compatibility
    const userUuid = clerkUserIdToUuid(auth.userId)

    // @ts-ignore
    req.user = {
        id: auth.userId,
        email: '',
        name: '',
        roleId: 'owner',
        activeOrganizationId: userUuid,
        activeOrganizationSubscriptionId: subscriptionId,
        activeOrganizationCustomerId: customerId,
        activeOrganizationProductId: productId,
        isOrganizationAdmin: true,
        activeWorkspaceId: userUuid,
        activeWorkspace: 'default',
        assignedWorkspaces: [{ id: userUuid, name: 'default', role: 'owner', organizationId: userUuid }],
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

    // Auto-provision default OpenAI credential for new users (non-blocking)
    if (!provisionedUsers.has(auth.userId) && process.env.DEFAULT_OPENAI_API_KEY) {
        provisionDefaultCredentials(auth.userId, userUuid).catch(() => {})
    }

    next()
}

/**
 * Auto-provision a default OpenAI API credential for new users.
 * Runs once per user (tracked in-memory). Non-blocking.
 */
async function provisionDefaultCredentials(clerkUserId: string, workspaceId: string): Promise<void> {
    try {
        const dataSource = getDataSource()
        const credRepo = dataSource.getRepository(Credential)

        // Check if user already has an OpenAI credential
        const existing = await credRepo.findOneBy({
            workspaceId,
            credentialName: 'openAIApi'
        })

        if (!existing) {
            const encryptedData = await encryptCredentialData({
                openAIApiKey: process.env.DEFAULT_OPENAI_API_KEY!
            })

            const credential = credRepo.create({
                name: 'VoxScribe OpenAI (Default)',
                credentialName: 'openAIApi',
                encryptedData,
                workspaceId
            })
            await credRepo.save(credential)
            logger.info(`[auth] Auto-provisioned OpenAI credential for user ${clerkUserId}`)
        }

        provisionedUsers.add(clerkUserId)
    } catch (error: any) {
        logger.error(`[auth] Failed to provision credentials: ${error.message}`)
    }
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
