// TODO: add settings

import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getSettings = async () => {
    try {
        const appServer = getRunningExpressApp()
        const platformType = appServer.identityManager.getPlatformType()
        const hasBilling = !!process.env.STRIPE_SECRET_KEY

        switch (platformType) {
            case Platform.ENTERPRISE: {
                if (!appServer.identityManager.isLicenseValid()) {
                    return { HAS_BILLING: hasBilling }
                } else {
                    return { PLATFORM_TYPE: Platform.ENTERPRISE, HAS_BILLING: hasBilling }
                }
            }
            case Platform.CLOUD: {
                return { PLATFORM_TYPE: Platform.CLOUD, HAS_BILLING: hasBilling }
            }
            default: {
                return { PLATFORM_TYPE: Platform.OPEN_SOURCE, HAS_BILLING: hasBilling }
            }
        }
    } catch (error) {
        return {}
    }
}

export default {
    getSettings
}
