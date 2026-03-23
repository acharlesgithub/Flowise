import { Request, Response, NextFunction } from 'express'

const getPricing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const PRODUCT_IDS = {
            STARTER: process.env.CLOUD_STARTER_ID,
            PRO: process.env.CLOUD_PRO_ID,
            ENTERPRISE: process.env.CLOUD_ENTERPRISE_ID
        }
        const pricingPlans = [
            {
                prodId: null, // Free tier - no Stripe product
                title: 'Free',
                subtitle: 'For trying out the platform',
                price: '$0',
                annualPrice: null,
                period: '/month',
                annualPeriod: null,
                isFree: true,
                features: [
                    { text: '1 Chatflow' },
                    { text: '100 Predictions / month' },
                    { text: '50MB Storage' },
                    { text: '2 Document Stores' },
                    { text: '"Powered by VoxScribe" branding' },
                    { text: 'Community Support' }
                ]
            },
            {
                prodId: PRODUCT_IDS.STARTER,
                title: 'Starter',
                subtitle: 'For individuals & small teams',
                price: '$99',
                annualPrice: '$990',
                period: '/month',
                annualPeriod: '/year',
                features: [
                    { text: '5 Chatflows' },
                    { text: '5,000 Predictions / month' },
                    { text: '500MB Storage' },
                    { text: '2 Document Stores' },
                    { text: '"Powered by VoxScribe" branding' },
                    { text: 'Email Support (48hr)' }
                ]
            },
            {
                prodId: PRODUCT_IDS.PRO,
                title: 'Pro',
                subtitle: 'For growing businesses',
                mostPopular: true,
                price: '$199',
                annualPrice: '$1,990',
                period: '/month',
                annualPeriod: '/year',
                features: [
                    { text: '25 Chatflows' },
                    { text: '25,000 Predictions / month' },
                    { text: '5GB Storage' },
                    { text: '10 Document Stores' },
                    { text: '3 Team Members' },
                    { text: '3 Workspaces' },
                    { text: 'Remove "Powered by" branding' },
                    { text: 'Roles & Permissions' },
                    { text: 'Email Support (24hr)' }
                ]
            },
            {
                prodId: PRODUCT_IDS.ENTERPRISE,
                title: 'Enterprise',
                subtitle: 'For large organizations',
                price: '$449',
                annualPrice: '$4,490',
                period: '/month',
                annualPeriod: '/year',
                features: [
                    { text: '100 Chatflows' },
                    { text: '50,000 Predictions / month' },
                    { text: '20GB Storage' },
                    { text: '50 Document Stores' },
                    { text: '10 Team Members' },
                    { text: '10 Workspaces' },
                    { text: 'Remove "Powered by" branding' },
                    { text: 'SSO / SAML' },
                    { text: 'Audit Logs' },
                    { text: 'Priority Support (4hr)' }
                ]
            }
        ]
        return res.status(200).json(pricingPlans)
    } catch (error) {
        next(error)
    }
}

export default {
    getPricing
}
