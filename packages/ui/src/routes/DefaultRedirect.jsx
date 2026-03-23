import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useDispatch } from 'react-redux'
import billingApi from '@/api/billing'
import { loginSuccess } from '@/store/reducers/authSlice'
import Chatflows from '@/views/chatflows'

/**
 * DefaultRedirect - simplified for Clerk auth.
 * Always shows Chatflows as the default page.
 * Handles checkout success/cancel redirects from Stripe.
 */
export const DefaultRedirect = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const { enqueueSnackbar } = useSnackbar()
    const dispatch = useDispatch()

    useEffect(() => {
        const checkoutStatus = searchParams.get('checkout')
        if (checkoutStatus === 'success') {
            enqueueSnackbar('Subscription activated! Welcome to VoxScribe Pro.', { variant: 'success' })

            // Refresh subscription data in Redux store
            billingApi
                .getSubscriptionStatus()
                .then((res) => {
                    if (res.data) {
                        // Update the user object in localStorage and Redux with subscription info
                        const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
                        const updatedUser = {
                            ...storedUser,
                            activeOrganizationSubscriptionId: res.data.stripeSubscriptionId || '',
                            activeOrganizationCustomerId: res.data.stripeCustomerId || '',
                            activeOrganizationProductId: res.data.plan || ''
                        }
                        localStorage.setItem('user', JSON.stringify(updatedUser))
                        dispatch(
                            loginSuccess({
                                ...updatedUser,
                                token: null,
                                permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
                                features: JSON.parse(localStorage.getItem('features') || '{}')
                            })
                        )
                    }
                })
                .catch(() => {
                    // Non-fatal - subscription data will be correct on next page load
                })

            // Clean up URL
            searchParams.delete('checkout')
            setSearchParams(searchParams, { replace: true })
        } else if (checkoutStatus === 'cancel') {
            enqueueSnackbar('Checkout cancelled. You can upgrade anytime.', { variant: 'info' })
            searchParams.delete('checkout')
            setSearchParams(searchParams, { replace: true })
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return <Chatflows />
}
