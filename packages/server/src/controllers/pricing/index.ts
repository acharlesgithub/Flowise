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
                prodId: PRODUCT_IDS.STARTER,
                title: 'Starter',
                subtitle: 'For individuals & small teams',
                price: '$99',
                annualPrice: '$990',
                period: '/month',
                annualPeriod: '/year',
                features: [
                    { text: 'Unlimited Flows & Assistants' },
                    { text: '10,000 Predictions / month' },
                    { text: '1GB Storage' },
                    { text: 'Evaluations & Metrics' },
                    { text: 'Custom Embedded Chatbot Branding' },
                    { text: 'Email Support' }
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
                    { text: 'Everything in Starter, plus' },
                    { text: '50,000 Predictions / month' },
                    { text: '10GB Storage' },
                    { text: 'Unlimited Workspaces' },
                    { text: '5 team members' },
                    { text: 'Admin Roles & Permissions' },
                    { text: 'Priority Support' }
                ]
            },
            {
                prodId: PRODUCT_IDS.ENTERPRISE,
                title: 'Enterprise',
                subtitle: 'For large organizations',
                price: '$299',
                annualPrice: '$2,990',
                period: '/month',
                annualPeriod: '/year',
                features: [
                    { text: 'Everything in Pro, plus' },
                    { text: 'Unlimited Predictions' },
                    { text: 'Unlimited Storage' },
                    { text: '20 team members' },
                    { text: 'SSO / SAML' },
                    { text: 'Audit Logs' },
                    { text: '99.9% Uptime SLA' },
                    { text: 'Dedicated Support' }
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
