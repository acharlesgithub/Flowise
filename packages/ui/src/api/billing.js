import client from './client'

/**
 * Create a Stripe Checkout session and return the redirect URL.
 * @param {string} prodId - Stripe product ID for the selected plan
 */
const createCheckoutSession = (prodId) => client.post('/billing/create-checkout-session', { prodId })

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
const createPortalSession = () => client.post('/billing/create-portal-session')

/**
 * Get the current user's subscription status.
 */
const getSubscriptionStatus = () => client.get('/billing/status')

export default {
    createCheckoutSession,
    createPortalSession,
    getSubscriptionStatus
}
