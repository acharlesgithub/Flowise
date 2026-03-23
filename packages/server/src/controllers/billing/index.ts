import { Request, Response } from 'express'
import Stripe from 'stripe'
import { getDataSource } from '../../DataSource'
import { UserSubscription } from '../../database/entities/UserSubscription'
import { StripeManager } from '../../StripeManager'
import { UserPlan } from '../../Interface'
import logger from '../../utils/logger'

/**
 * Map a Stripe product ID to a UserPlan enum value.
 */
function productIdToPlan(productId: string): string {
    if (productId === process.env.CLOUD_STARTER_ID) return UserPlan.STARTER
    if (productId === process.env.CLOUD_PRO_ID) return UserPlan.PRO
    if (productId === process.env.CLOUD_ENTERPRISE_ID) return UserPlan.ENTERPRISE
    return UserPlan.NONE
}

/**
 * POST /api/v1/billing/create-checkout-session
 * Creates a Stripe Checkout session for the authenticated user.
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const stripeManager = await StripeManager.getInstance()
        const stripe = stripeManager.getStripe()

        const clerkUserId = req.user?.id
        if (!clerkUserId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const { priceId, prodId } = req.body
        if (!priceId && !prodId) {
            return res.status(400).json({ error: 'priceId or prodId is required' })
        }

        // If prodId is given, look up the default price
        let resolvedPriceId = priceId
        if (!resolvedPriceId && prodId) {
            const product = await stripe.products.retrieve(prodId)
            resolvedPriceId = product.default_price as string
            if (!resolvedPriceId) {
                // Fall back to listing prices for this product
                const prices = await stripe.prices.list({ product: prodId, active: true, limit: 1 })
                if (prices.data.length > 0) {
                    resolvedPriceId = prices.data[0].id
                } else {
                    return res.status(400).json({ error: 'No price found for this product' })
                }
            }
        }

        // Look up or create Stripe customer
        const dataSource = getDataSource()
        const repo = dataSource.getRepository(UserSubscription)
        let userSub = await repo.findOneBy({ clerkUserId })

        let customerId: string | undefined
        if (userSub?.stripeCustomerId) {
            customerId = userSub.stripeCustomerId
        } else {
            // Create a new Stripe customer
            const customer = await stripe.customers.create({
                metadata: { clerkUserId }
            })
            customerId = customer.id

            // Upsert the user subscription record
            if (!userSub) {
                userSub = repo.create({
                    clerkUserId,
                    stripeCustomerId: customerId,
                    plan: UserPlan.NONE,
                    status: 'none'
                })
            } else {
                userSub.stripeCustomerId = customerId
            }
            await repo.save(userSub)
        }

        const appUrl = process.env.APP_URL || 'http://localhost:3000'

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: resolvedPriceId, quantity: 1 }],
            subscription_data: {
                trial_period_days: 14,
                metadata: { clerkUserId }
            },
            success_url: `${appUrl}/?checkout=success`,
            cancel_url: `${appUrl}/?checkout=cancel`,
            allow_promotion_codes: true
        })

        return res.json({ url: session.url })
    } catch (error: any) {
        logger.error(`[billing] Error creating checkout session: ${error.message}`)
        return res.status(500).json({ error: error.message })
    }
}

/**
 * POST /api/v1/billing/create-portal-session
 * Creates a Stripe Customer Portal session for subscription management.
 */
export const createPortalSession = async (req: Request, res: Response) => {
    try {
        const stripeManager = await StripeManager.getInstance()
        const result = await stripeManager.createStripeCustomerPortalSession(req)
        return res.json(result)
    } catch (error: any) {
        logger.error(`[billing] Error creating portal session: ${error.message}`)
        return res.status(500).json({ error: error.message })
    }
}

/**
 * GET /api/v1/billing/status
 * Returns the authenticated user's subscription status.
 */
export const getSubscriptionStatus = async (req: Request, res: Response) => {
    try {
        const clerkUserId = req.user?.id
        if (!clerkUserId) {
            return res.status(401).json({ error: 'Unauthorized' })
        }

        const dataSource = getDataSource()
        const repo = dataSource.getRepository(UserSubscription)
        const userSub = await repo.findOneBy({ clerkUserId })

        if (!userSub || userSub.plan === UserPlan.NONE) {
            return res.json({
                plan: UserPlan.FREE,
                status: 'active',
                trialEnd: null,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false
            })
        }

        return res.json({
            plan: userSub.plan,
            status: userSub.status,
            stripeSubscriptionId: userSub.stripeSubscriptionId,
            stripeCustomerId: userSub.stripeCustomerId,
            trialEnd: userSub.trialEnd,
            currentPeriodEnd: userSub.currentPeriodEnd,
            cancelAtPeriodEnd: userSub.cancelAtPeriodEnd
        })
    } catch (error: any) {
        logger.error(`[billing] Error getting subscription status: ${error.message}`)
        return res.status(500).json({ error: error.message })
    }
}

/**
 * POST /api/v1/billing/webhook
 * Handles Stripe webhook events. Must be called with raw body (not JSON parsed).
 */
export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const stripeManager = await StripeManager.getInstance()
        const stripe = stripeManager.getStripe()

        const sig = req.headers['stripe-signature'] as string
        if (!sig) {
            return res.status(400).json({ error: 'Missing stripe-signature header' })
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
        if (!webhookSecret) {
            logger.error('[billing] STRIPE_WEBHOOK_SECRET not configured')
            return res.status(500).json({ error: 'Webhook secret not configured' })
        }

        let event: Stripe.Event
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
        } catch (err: any) {
            logger.error(`[billing] Webhook signature verification failed: ${err.message}`)
            return res.status(400).json({ error: `Webhook signature verification failed` })
        }

        const dataSource = getDataSource()
        const repo = dataSource.getRepository(UserSubscription)

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                if (session.mode !== 'subscription' || !session.subscription) break

                const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
                const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || ''

                // Retrieve subscription to get product info
                const subscription = await stripe.subscriptions.retrieve(subscriptionId)
                const productId = subscription.items.data[0]?.price?.product as string | undefined
                if (!productId) {
                    logger.error(`[billing] No product found in subscription items: sub=${subscriptionId}`)
                    break
                }
                const plan = productIdToPlan(productId)

                // Get clerkUserId from subscription metadata or customer metadata
                let clerkUserId = subscription.metadata?.clerkUserId
                if (!clerkUserId) {
                    const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer
                    clerkUserId = customer.metadata?.clerkUserId
                }

                if (!clerkUserId) {
                    logger.error('[billing] No clerkUserId found in subscription or customer metadata')
                    break
                }

                // Upsert subscription record
                let userSub = await repo.findOneBy({ clerkUserId })
                if (!userSub) {
                    userSub = repo.create({ clerkUserId })
                }
                userSub.stripeCustomerId = customerId
                userSub.stripeSubscriptionId = subscriptionId
                userSub.stripeProductId = productId
                userSub.plan = plan
                userSub.status = subscription.status
                userSub.trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : (null as any)
                userSub.currentPeriodEnd = new Date(subscription.current_period_end * 1000)
                userSub.cancelAtPeriodEnd = subscription.cancel_at_period_end
                await repo.save(userSub)

                logger.info(`[billing] Checkout completed: user=${clerkUserId} plan=${plan} status=${subscription.status}`)
                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription
                const subscriptionId = subscription.id
                const productId = subscription.items.data[0]?.price?.product as string | undefined
                if (!productId) {
                    logger.error(`[billing] No product found in subscription update: sub=${subscriptionId}`)
                    break
                }
                const plan = productIdToPlan(productId)

                // Find by subscriptionId
                let userSub = await repo.findOneBy({ stripeSubscriptionId: subscriptionId })
                if (!userSub) {
                    // Try finding by metadata
                    const clerkUserId = subscription.metadata?.clerkUserId
                    if (clerkUserId) {
                        userSub = await repo.findOneBy({ clerkUserId })
                    }
                }

                if (!userSub) {
                    logger.warn(`[billing] Subscription update for unknown user: sub=${subscriptionId}`)
                    break
                }

                if (userSub) {
                    userSub.stripeProductId = productId
                    userSub.plan = plan
                    userSub.status = subscription.status
                    userSub.trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : (null as any)
                    userSub.currentPeriodEnd = new Date(subscription.current_period_end * 1000)
                    userSub.cancelAtPeriodEnd = subscription.cancel_at_period_end
                    await repo.save(userSub)
                    logger.info(`[billing] Subscription updated: sub=${subscriptionId} plan=${plan} status=${subscription.status}`)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription
                const subscriptionId = subscription.id

                let userSub = await repo.findOneBy({ stripeSubscriptionId: subscriptionId })
                if (userSub) {
                    userSub.plan = UserPlan.FREE
                    userSub.status = 'canceled'
                    userSub.stripeSubscriptionId = null as any
                    userSub.stripeProductId = null as any
                    await repo.save(userSub)
                    logger.info(`[billing] Subscription canceled, reverted to free: sub=${subscriptionId}`)
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice
                const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

                if (subscriptionId) {
                    const userSub = await repo.findOneBy({ stripeSubscriptionId: subscriptionId })
                    if (userSub) {
                        userSub.status = 'past_due'
                        await repo.save(userSub)
                        logger.warn(`[billing] Payment failed: sub=${subscriptionId}`)
                    }
                }
                break
            }
        }

        return res.json({ received: true })
    } catch (error: any) {
        logger.error(`[billing] Webhook error: ${error.message}`)
        return res.status(500).json({ error: error.message })
    }
}
