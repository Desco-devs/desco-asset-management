'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Projects page error:', error)
  }, [error])

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <h2 className="text-xl font-semibold">Something went wrong!</h2>
          <p className="text-muted-foreground text-center">
            There was an error loading the projects page.
          </p>
          <Button onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}