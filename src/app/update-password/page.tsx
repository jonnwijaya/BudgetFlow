
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
  const [verifyingLink, setVerifyingLink] = useState(true); // New state

  useEffect(() => {
    let authSubscription: Subscription | undefined;
    let recoveryLinkProcessed = false;

    // Initial check: If there's no hash for recovery, the link is likely invalid for this page.
    if (!window.location.hash.includes('type=recovery') && !window.location.hash.includes('access_token')) {
        setAuthError("Invalid or expired password reset link. Please request a new one.");
        setVerifyingLink(false);
        setIsRecoveryModeActive(false); // Ensure not in recovery mode
    } else {
        // Hash is present, proceed with auth state change listener
        setVerifyingLink(true); // We are expecting onAuthStateChange
    }


    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authSubscription = subscription;
      recoveryLinkProcessed = true; // Mark that onAuthStateChange has fired
      setVerifyingLink(false); // No longer verifying once an event comes through

      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsRecoveryModeActive(true);
        setAuthError(null);
      } else if (event === 'SIGNED_IN' && session && !session.user.user_metadata.is_password_recovery) {
        // User is signed in, but not via password recovery. Redirect them.
        // router.push('/'); // Or show a message that this page is for recovery only
      } else if (event !== 'PASSWORD_RECOVERY') {
        // If it's not a PASSWORD_RECOVERY event (e.g. SIGNED_OUT or initial state without session)
        // and we were not already set to recovery mode by the event itself.
        if (!isRecoveryModeActive) { // Check if we are ALREADY in recovery mode
            setAuthError("No active password recovery session. This link may be invalid, expired, or already used.");
            setIsRecoveryModeActive(false);
        }
      }
    });
    
    // Fallback if onAuthStateChange doesn't fire quickly or at all with a recovery hash
    // This might happen in rare cases or if the token in the hash is already invalid.
    const timeoutId = setTimeout(() => {
        if (window.location.hash.includes('type=recovery') && !recoveryLinkProcessed && !isRecoveryModeActive) {
            // If hash is present, but onAuthStateChange didn't set recovery mode
            setVerifyingLink(false);
            setAuthError("Failed to verify password reset link. It might be invalid or expired.");
            setIsRecoveryModeActive(false);
        } else if (!window.location.hash.includes('type=recovery') && !recoveryLinkProcessed && !isRecoveryModeActive) {
            // No hash and no event from onAuthStateChange
            setVerifyingLink(false);
            // Error already set by initial check, or will be by onAuthStateChange
        }
    }, 2500); // Wait for 2.5 seconds

    return () => {
      authSubscription?.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [router]); // Removed isRecoveryModeActive from dependencies


  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: UpdatePasswordFormValues) => {
    if (!isRecoveryModeActive) {
      setAuthError("Cannot update password. No active recovery session. Please use a valid reset link.");
      toast({
        title: 'Update Failed',
        description: "No active recovery session.",
        variant: 'destructive',
      });
      return;
    }
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

  if (verifyingLink) {
    return (
     <div className="flex min-h-screen items-center justify-center bg-background">
       <Loader2 className="h-12 w-12 animate-spin text-primary" />
       <p className="ml-4 text-muted-foreground">Verifying link...</p>
     </div>
   );
  }

  if (authError && !isRecoveryModeActive) {
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
              Please try requesting a new password reset link from the login page.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col items-center pt-6">
            <Link href="/login" passHref legacyBehavior>
              <Button variant="outline">Back to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!isRecoveryModeActive) {
     // This case should ideally be covered by the authError block above after verifyingLink is false.
     // If somehow reached, it implies an invalid state.
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-headline">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">This page is for password recovery only. Please use a valid link from your email.</p>
          </CardContent>
          <CardFooter className="flex flex-col items-center pt-6">
            <Link href="/login" passHref legacyBehavior>
              <Button variant="outline">Back to Login</Button>
            </Link>
          </CardFooter>
        </Card>
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
          {authError && ( // Show non-critical auth errors here if recovery mode IS active
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

    