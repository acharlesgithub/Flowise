import express from 'express'
import { createCheckoutSession, createPortalSession, getSubscriptionStatus, getCurrentUsage } from '../../controllers/billing'

const router = express.Router()

// POST /api/v1/billing/create-checkout-session
router.post('/create-checkout-session', createCheckoutSession)

// POST /api/v1/billing/create-portal-session
router.post('/create-portal-session', createPortalSession)

// GET /api/v1/billing/status
router.get('/status', getSubscriptionStatus)

// GET /api/v1/billing/usage
router.get('/usage', getCurrentUsage)

// Note: webhook route is registered separately in index.ts with raw body parser

export default router
