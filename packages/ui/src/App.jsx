import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, StyledEngineProvider, Box, Typography } from '@mui/material'

// routing
import Routes from '@/routes'

// defaultTheme
import themes from '@/themes'

// project imports
import NavigationScroll from '@/layout/NavigationScroll'

// Clerk auth
import { SignIn, useAuth } from '@clerk/clerk-react'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// ==============================|| AUTH GATE ||============================== //

const AuthGate = ({ children }) => {
    const { isLoaded, isSignedIn } = useAuth()

    // If no Clerk key configured, skip auth (dev mode) - useAuth returns defaults
    if (!CLERK_KEY) return children

    if (!isLoaded) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography variant='h6' color='text.secondary'>
                    Loading...
                </Typography>
            </Box>
        )
    }

    if (!isSignedIn) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
            >
                <Typography variant='h3' sx={{ color: '#fff', mb: 4, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                    VoxScribe
                </Typography>
                <SignIn
                    routing='hash'
                    appearance={{
                        elements: {
                            rootBox: { width: '100%', maxWidth: 440 },
                            card: { borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }
                        }
                    }}
                />
            </Box>
        )
    }

    return children
}

AuthGate.propTypes = {
    children: PropTypes.node
}

// ==============================|| APP ||============================== //

const App = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={themes(customization)}>
                <CssBaseline />
                <AuthGate>
                    <NavigationScroll>
                        <Routes />
                    </NavigationScroll>
                </AuthGate>
            </ThemeProvider>
        </StyledEngineProvider>
    )
}

export default App
