import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | undefined | null
  className?: string
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  if (score === undefined || score === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500',
          className
        )}
      >
        N/A
      </span>
    )
  }

  const colorClass =
    score >= 70
      ? 'bg-green-100 text-green-700'
      : score >= 40
      ? 'bg-orange-100 text-orange-700'
      : 'bg-red-100 text-red-700'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
        colorClass,
        className
      )}
    >
      {score}
    </span>
  )
}
