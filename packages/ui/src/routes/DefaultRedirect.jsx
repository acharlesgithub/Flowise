import Chatflows from '@/views/chatflows'

/**
 * DefaultRedirect - simplified for Clerk auth.
 * Always shows Chatflows as the default page.
 * Auth is handled by Clerk's AuthGate in App.jsx.
 */
export const DefaultRedirect = () => {
    return <Chatflows />
}
