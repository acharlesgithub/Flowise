import PropTypes from 'prop-types'

/**
 * RequireAuth - simplified for Clerk authentication.
 * The main auth gate is in App.jsx (AuthGate component).
 * This wrapper now just renders children directly since
 * Clerk handles authentication at the app level.
 */
export const RequireAuth = ({ children }) => {
    // Auth is handled by Clerk's AuthGate in App.jsx
    // All routes behind MainLayout are already protected
    return children
}

RequireAuth.propTypes = {
    permission: PropTypes.string,
    display: PropTypes.string,
    children: PropTypes.element
}
