import React from 'react'
import App from '@/App'
import { store } from '@/store'
import { createRoot } from 'react-dom/client'

// style + assets
import '@/assets/scss/style.scss'

// third party
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { SnackbarProvider } from 'notistack'
import { ClerkProvider } from '@clerk/clerk-react'
import ConfirmContextProvider from '@/store/context/ConfirmContextProvider'
import { ReactFlowContext } from '@/store/context/ReactFlowContext'
import { ConfigProvider } from '@/store/context/ConfigContext'
import { ErrorProvider } from '@/store/context/ErrorContext'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const container = document.getElementById('root')
const root = createRoot(container)

const AppWithAuth = () => {
    if (CLERK_PUBLISHABLE_KEY) {
        return (
            <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
                <App />
            </ClerkProvider>
        )
    }
    // No Clerk key - run without auth (development mode)
    return <App />
}

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <SnackbarProvider>
                    <ConfigProvider>
                        <ErrorProvider>
                            <ConfirmContextProvider>
                                <ReactFlowContext>
                                    <AppWithAuth />
                                </ReactFlowContext>
                            </ConfirmContextProvider>
                        </ErrorProvider>
                    </ConfigProvider>
                </SnackbarProvider>
            </BrowserRouter>
        </Provider>
    </React.StrictMode>
)
