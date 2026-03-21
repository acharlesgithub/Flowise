import axios from 'axios'
import { baseURL } from '@/store/constant'

const apiClient = axios.create({
    baseURL: `${baseURL}/api/v1`,
    headers: {
        'Content-type': 'application/json',
        'x-request-from': 'internal'
    },
    withCredentials: true
})

apiClient.interceptors.response.use(
    function (response) {
        return response
    },
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Clerk handles session refresh automatically
            // If we still get 401, redirect to login
            window.location.href = '/'
        }
        return Promise.reject(error)
    }
)

export default apiClient
