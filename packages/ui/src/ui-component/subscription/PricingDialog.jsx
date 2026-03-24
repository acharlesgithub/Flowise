import billingApi from '@/api/billing'
import pricingApi from '@/api/pricing'
import useApi from '@/hooks/useApi'
import { Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, Grid, IconButton, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useSnackbar } from 'notistack'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

const PricingDialog = ({ open, onClose }) => {
    const customization = useSelector((state) => state.customization)
    const currentUser = useSelector((state) => state.auth.user)
    const theme = useTheme()
    const { enqueueSnackbar } = useSnackbar()
    const [loadingPlan, setLoadingPlan] = useState(null)
    const [subscriptionStatus, setSubscriptionStatus] = useState(null)

    const getPricingPlansApi = useApi(pricingApi.getPricingPlans)

    useEffect(() => {
        if (open) {
            getPricingPlansApi.request()
            // Always fetch fresh subscription status when dialog opens
            billingApi
                .getSubscriptionStatus()
                .then((res) => {
                    if (res.data) {
                        setSubscriptionStatus(res.data)
                    }
                })
                .catch(() => {
                    // Non-fatal
                })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handlePlanClick = async (plan) => {
        // Free tier - no action needed, user is already on it by default
        if (plan.isFree) {
            onClose()
            return
        }

        if (!plan.prodId) return

        setLoadingPlan(plan.title)

        try {
            // If user already has a subscription, open the customer portal for upgrades
            if (currentUser?.activeOrganizationSubscriptionId) {
                const response = await billingApi.createPortalSession()
                if (response.data?.url) {
                    window.open(response.data.url, '_blank')
                }
            } else {
                // New user - create a Stripe Checkout session
                const response = await billingApi.createCheckoutSession(plan.prodId)
                if (response.data?.url) {
                    window.location.href = response.data.url
                }
            }
        } catch (error) {
            console.error('Error handling plan click:', error)
            enqueueSnackbar(error.response?.data?.error || 'Failed to process request', { variant: 'error' })
        } finally {
            setLoadingPlan(null)
        }
    }

    const handleManageBilling = async () => {
        setLoadingPlan('manage')
        try {
            const response = await billingApi.createPortalSession()
            if (response.data?.url) {
                window.open(response.data.url, '_blank')
            }
        } catch (error) {
            enqueueSnackbar('Failed to open billing portal', { variant: 'error' })
        } finally {
            setLoadingPlan(null)
        }
    }

    const pricingPlans = useMemo(() => {
        if (!getPricingPlansApi.data) return []

        // Use fresh subscription status if available, fall back to Redux store
        const activeProductId = subscriptionStatus?.stripeProductId || currentUser?.activeOrganizationProductId
        const hasSubscription = !!(subscriptionStatus?.stripeSubscriptionId || currentUser?.activeOrganizationSubscriptionId)
        const subStatus = subscriptionStatus?.status || ''
        const isActiveSubscription = hasSubscription && (subStatus === 'active' || subStatus === 'trialing' || !subStatus)

        return getPricingPlansApi.data.map((plan) => {
            const isFreeTier = plan.isFree
            const isCurrentPlan = isFreeTier ? !isActiveSubscription : activeProductId === plan.prodId

            let buttonText = 'Start 14-Day Free Trial'
            if (isCurrentPlan) {
                buttonText = 'Current Plan'
            } else if (isFreeTier) {
                buttonText = 'Free Forever'
            } else if (isActiveSubscription) {
                buttonText = 'Change Plan'
            }

            return {
                ...plan,
                currentPlan: isCurrentPlan,
                buttonText,
                buttonVariant: plan.mostPopular ? 'contained' : 'outlined',
                disabled: isCurrentPlan
            }
        })
    }, [getPricingPlansApi.data, currentUser, subscriptionStatus])

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth='lg'
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    backgroundColor: (theme) => theme.palette.background.default,
                    boxShadow: customization.isDarkMode ? '0 0 50px 0 rgba(255, 255, 255, 0.5)' : '0 0 10px 0 rgba(0, 0, 0, 0.1)'
                }
            }}
        >
            <DialogTitle
                sx={{
                    mt: 2,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                }}
            >
                <Typography variant='h3'>Choose Your Plan</Typography>
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)'
                    }}
                >
                    <IconX />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', mb: 3 }}>
                    All plans include a 14-day free trial. No credit card required to start.
                </Typography>
                <Grid container spacing={3} sx={{ p: 2 }}>
                    {pricingPlans.map((plan) => (
                        <Grid item xs={12} sm={6} md={3} key={plan.title}>
                            <Box
                                sx={{
                                    p: 3,
                                    height: '100%',
                                    border: '2px solid',
                                    borderColor: (theme) =>
                                        plan.mostPopular
                                            ? theme.palette.primary.main
                                            : plan.currentPlan
                                            ? theme.palette.success.main
                                            : theme.palette.background.paper,
                                    borderRadius: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: '400px',
                                    position: 'relative',
                                    boxShadow: customization.isDarkMode
                                        ? '0 0 10px 0 rgba(255, 255, 255, 0.5)'
                                        : '0 0 10px 0 rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {plan.currentPlan && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            backgroundColor: 'success.dark',
                                            borderRadius: 1,
                                            px: 1,
                                            py: 0.5
                                        }}
                                    >
                                        <Typography sx={{ color: 'white' }} variant='caption' fontWeight='bold'>
                                            Current Plan
                                        </Typography>
                                    </Box>
                                )}
                                {plan.mostPopular && !plan.currentPlan && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            backgroundColor: 'primary.main',
                                            borderRadius: 1,
                                            px: 1,
                                            py: 0.5
                                        }}
                                    >
                                        <Typography sx={{ color: 'white' }} variant='caption' fontWeight='bold'>
                                            Most Popular
                                        </Typography>
                                    </Box>
                                )}
                                <Typography variant='h4' gutterBottom>
                                    {plan.title}
                                </Typography>
                                <Typography variant='body2' color='text.secondary' gutterBottom>
                                    {plan.subtitle}
                                </Typography>
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant='h3' component='span'>
                                        {plan.price}
                                    </Typography>
                                    <Typography variant='body1' component='span' color='text.secondary'>
                                        {plan.period}
                                    </Typography>
                                    {plan.annualPrice && (
                                        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                                            or {plan.annualPrice}
                                            {plan.annualPeriod} (save ~17%)
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ flexGrow: 1 }}>
                                    {plan.features.map((feature, index) => (
                                        <Box key={index} sx={{ display: 'flex', alignItems: 'start', mb: 1 }}>
                                            <IconCheck
                                                color={theme.palette.success.dark}
                                                size={15}
                                                style={{ marginRight: 8, marginTop: 3 }}
                                            />
                                            <Typography variant='body1'>{feature.text}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                                <Button
                                    fullWidth
                                    variant={plan.buttonVariant}
                                    sx={{ mt: 3 }}
                                    onClick={() => handlePlanClick(plan)}
                                    disabled={plan.disabled || loadingPlan === plan.title}
                                >
                                    {loadingPlan === plan.title ? <CircularProgress size={20} color='inherit' /> : plan.buttonText}
                                </Button>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
                {(subscriptionStatus?.stripeSubscriptionId || currentUser?.activeOrganizationSubscriptionId) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                        <Button variant='text' onClick={handleManageBilling} disabled={loadingPlan === 'manage'}>
                            {loadingPlan === 'manage' ? <CircularProgress size={16} color='inherit' sx={{ mr: 1 }} /> : null}
                            Manage Billing & Invoices
                        </Button>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    )
}

PricingDialog.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func
}

export default PricingDialog
