'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification link is invalid or has expired.',
    Default: 'An error occurred during authentication.',
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <>
      <CardDescription className="text-zinc-600">
        {errorMessage}
      </CardDescription>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-col gap-3">
          <Link href="/auth/signin">
            <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
              Try Again
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go Home
            </Button>
          </Link>
        </div>

        {error && (
          <p className="text-center text-xs text-zinc-500 mt-4">
            Error code: {error}
          </p>
        )}
      </CardContent>
    </>
  );
}

function ErrorFallback() {
  return (
    <>
      <CardDescription className="text-zinc-600">
        An error occurred during authentication.
      </CardDescription>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-col gap-3">
          <Link href="/auth/signin">
            <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white">
              Try Again
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go Home
            </Button>
          </Link>
        </div>
      </CardContent>
    </>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-zinc-200">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-900">
            Authentication Error
          </CardTitle>
        </CardHeader>
        <Suspense fallback={<ErrorFallback />}>
          <ErrorContent />
        </Suspense>
      </Card>
    </div>
  );
}
