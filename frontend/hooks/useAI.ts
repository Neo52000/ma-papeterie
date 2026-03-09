import { useMutation } from '@tanstack/react-query'
import { apiPost } from '@/lib/api'

interface ScoreResult {
  score: number
  temperature: 'cold' | 'warm' | 'hot'
  rationale: string
}

interface EmailResult {
  subject: string
  body: string
}

interface CallScriptResult {
  script: string
  key_points: string[]
}

export function useScoreProspect() {
  return useMutation({
    mutationFn: (prospectId: string) =>
      apiPost<ScoreResult>(`/api/ai/score/${prospectId}`),
  })
}

export function useGenerateEmail() {
  return useMutation({
    mutationFn: ({
      prospectId,
      context,
    }: {
      prospectId: string
      context?: string
    }) => apiPost<EmailResult>(`/api/ai/email/${prospectId}`, { context }),
  })
}

export function useCallScript() {
  return useMutation({
    mutationFn: ({
      prospectId,
      context,
    }: {
      prospectId: string
      context?: string
    }) =>
      apiPost<CallScriptResult>(`/api/ai/call-script/${prospectId}`, {
        context,
      }),
  })
}
