import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { getToken, removeToken } from './auth'

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export async function apiGet<T>(
  path: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.get<T>(path, config)
  return response.data
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.post<T>(path, body, config)
  return response.data
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.patch<T>(path, body, config)
  return response.data
}

export async function apiPut<T>(
  path: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.put<T>(path, body, config)
  return response.data
}

export async function apiDelete(
  path: string,
  config?: AxiosRequestConfig
): Promise<void> {
  await client.delete(path, config)
}

export default client
