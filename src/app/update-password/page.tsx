
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Subscription } from '@supabase/supabase-js';

const MIN_PASSWORD_LENGTH = 8;

const updatePasswordSchema = z.object({
  password: z.string()
    .min(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` })
    .regex(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/(?=.*\d)/, { message: 'Password must contain at least one number.' })
    .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/, { message: 'Password must contain at least one symbol.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'], // path of error
});

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryModeActive, setIsRecoveryModeActive] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let authSubscription: Subscription | undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsRecoveryModeActive(true);
        setAuthError(null);
      } else if (event === 'SIGNED_IN' && !session?.user.user_metadata.is_password_recovery) {
        // If user is signed in but not through password recovery, redirect
        // This handles cases where the user might manually navigate here while logged in
        // router.push('/');
      }
    });
    authSubscription = subscription;

    // Check initial state, sometimes the event fires before the component mounts fully
    // or if the user lands directly with a hash
    const checkInitialSession = async () => {
      // The presence of a hash usually indicates a recovery link click
      if (window.location.hash.includes('access_token') && window.location.hash.includes('type=recovery')) {
         // Supabase JS client handles hash automatically and fires onAuthStateChange.
         // If it doesn't fire quickly enough, we set a small timeout to give it a chance.
         setTimeout(() => {
           if (!isRecoveryModeActive) {
            // If after a short delay, recovery mode is still not active,
            // it might be an old or invalid link.
            // Supabase handles actual token validation server-side when updateUser is called.
            // We assume the link *might* be valid if it has the hash, to show the form.
            setIsRecoveryModeActive(true); 
           }
         }, 500);
      } else if (!window.location.hash) {
        // No hash, likely direct navigation
        // We can check if there's already a PASSWORD_RECOVERY session, though onAuthStateChange should handle it.
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user.aud === 'authenticated' && session.user.user_metadata.is_password_recovery) {
             // This check might be redundant if onAuthStateChange is reliable
        } else if (!session) {
          // Only set error if no recovery mode is active after a bit, to avoid flashing error
          setTimeout(() => {
            if (!isRecoveryModeActive) {
                 setAuthError("No active password recovery session. This link may be invalid or expired.");
            }
          }, 1000);
        }
      }
    };
    checkInitialSession();


    return () => {
      authSubscription?.unsubscribe();
    };
  }, [isRecoveryModeActive, router]);


  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: UpdatePasswordFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }
      
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated. Please log in with your new password.',
      });
      await supabase.auth.signOut(); // Sign out of the recovery session
      router.push('/login');
    } catch (error: any) {
      setAuthError(error.message || 'Could not update password. Please try again or request a new reset link.');
      toast({
        title: 'Password Update Failed',
        description: error.message || 'Could not update password. Please try again or request a new reset link.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authError && !isRecoveryModeActive) { // Only show critical auth error if not in recovery UI
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-headline">Update Password Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-destructive">{authError}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              If you believe this is an error, please try requesting a new password reset link.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col items-center pt-6">
            <Link href="/forgot-password" passHref legacyBehavior>
                <Button variant="outline">Request New Reset Link</Button>
            </Link>
            <Link href="/login" passHref legacyBehavior>
              <Button variant="link" className="mt-2 text-primary">Back to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Show loader while checking auth state if no error and not yet in recovery mode
  if (!isRecoveryModeActive && !authError) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying link...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-headline">Set New Password</CardTitle>
          <CardDescription>Please enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
                <p>{authError}</p>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <ul className="mt-2 list-disc list-inside text-xs text-muted-foreground space-y-1">
                    <li>Minimum {MIN_PASSWORD_LENGTH} characters</li>
                    <li>At least one uppercase letter (A-Z)</li>
                    <li>At least one number (0-9)</li>
                    <li>At least one symbol (e.g., !@#$%)</li>
                </ul>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Update Password
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="flex flex-col items-center space-y-2 pt-6">
          <p className="text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
