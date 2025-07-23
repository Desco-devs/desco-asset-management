'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-screen py-6 px-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Dashboard Error</h1>
          <p className="text-muted-foreground">
            Something went wrong while loading the dashboard
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error Details:</strong>
            <br />
            {error.message || 'An unexpected error occurred'}
            {error.digest && (
              <>
                <br />
                <span className="text-xs">Error ID: {error.digest}</span>
              </>
            )}
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-3">
          <Button onClick={reset} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
        </div>
        
        <div className="text-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/')}
            className="text-muted-foreground"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  )
}