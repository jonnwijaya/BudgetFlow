
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Subscription } from '@supabase/supabase-js';

const MIN_PASSWORD_LENGTH = 8;

const updatePasswordSchema = z.object({
  password: z.string()
    .min(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` })
    .regex(/(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter.' })
    .regex(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/(?=.*\d)/, { message: 'Password must contain at least one number.' })
    .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/, { message: 'Password must contain at least one symbol.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [isRecoveryModeActive, setIsRecoveryModeActive] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifyingLink, setVerifyingLink] = useState(true);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    let isMounted = true;
    let authSub: Subscription | undefined;
    let verificationTimeoutId: NodeJS.Timeout | undefined;

    setVerifyingLink(true);
    setIsRecoveryModeActive(false);
    setAuthError(null);
    setPasswordUpdateSuccess(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted || passwordUpdateSuccess) { // Ignore auth changes if update was successful
        authSub?.unsubscribe(); // Ensure we unsubscribe if already successful
        return;
      }
      authSub = subscription;

      if (event === 'PASSWORD_RECOVERY' && session) {
        if (verificationTimeoutId) clearTimeout(verificationTimeoutId);
        if (isMounted) {
          setVerifyingLink(false);
          setIsRecoveryModeActive(true);
          setAuthError(null);
        }
      } else if (verifyingLink && (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session))) {
        if (verificationTimeoutId) clearTimeout(verificationTimeoutId);
        if (isMounted) {
          setAuthError("Password recovery link may be invalid, expired, or already used. Please request a new one if this issue persists.");
          setVerifyingLink(false);
          setIsRecoveryModeActive(false);
        }
      }
    });
    authSub = subscription; // Keep a reference to unsubscribe

    verificationTimeoutId = setTimeout(() => {
      if (isMounted && verifyingLink && !isRecoveryModeActive && !passwordUpdateSuccess) {
        if (isMounted) {
          setAuthError("Password recovery verification timed out. The link may be invalid/expired or there could be a network issue. Please try again or request a new link.");
          setVerifyingLink(false);
          setIsRecoveryModeActive(false);
        }
      }
    }, 15000);

    return () => {
      isMounted = false;
      authSub?.unsubscribe();
      if (verificationTimeoutId) clearTimeout(verificationTimeoutId);
    };
  }, []); // passwordUpdateSuccess removed from deps intentionally for this effect

  useEffect(() => {
    // This effect handles redirection if link verification fails (and not due to successful update)
    if (!verifyingLink && !isRecoveryModeActive && authError && !passwordUpdateSuccess) {
      toast({
        title: 'Update Password Issue',
        description: authError,
        variant: 'destructive',
      });
      router.replace('/login');
    }
  }, [verifyingLink, isRecoveryModeActive, authError, passwordUpdateSuccess, router, toast]);


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
    setAuthError(null); // Clear previous errors before submission
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }
      
      setPasswordUpdateSuccess(true); // Signal successful update
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated. Please log in with your new password.',
      });
      
      // Intentionally sign out. The onAuthStateChange listener should now ignore further events.
      await supabase.auth.signOut(); 
      router.push('/login');

    } catch (error: any) {
      // Only set authError if the update itself failed, not if a later step (like signOut) failed
      setAuthError(error.message || 'Could not update password. Please try again.');
      toast({
        title: 'Password Update Failed',
        description: error.message || 'Could not update password. Please try again.',
        variant: 'destructive',
      });
      setPasswordUpdateSuccess(false); // Ensure success flag is false
    } finally {
      setIsLoading(false);
    }
  };
  
  if (verifyingLink && !passwordUpdateSuccess) {
    return (
     <div className="flex min-h-screen items-center justify-center bg-background">
       <Loader2 className="h-12 w-12 animate-spin text-primary" />
       <p className="ml-4 text-muted-foreground">Verifying password reset link...</p>
     </div>
   );
  }

  // If password update was successful, show a message while redirecting (router.push is async)
  if (passwordUpdateSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Password updated successfully! Redirecting to login...</p>
      </div>
    );
  }

  // If recovery mode is active, and verification is done, and no successful update yet
  if (isRecoveryModeActive) {
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
            {authError && !verifyingLink && !passwordUpdateSuccess && ( // Show submission errors here
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
                      <li>At least one lowercase letter (a-z)</li>
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

  // Fallback: If !verifyingLink AND !isRecoveryModeActive AND !passwordUpdateSuccess,
  // means verification failed. The redirect useEffect should handle navigation.
  // Show a generic message while redirecting.
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-destructive" />
      <p className="ml-4 text-muted-foreground">Processing... If you are not redirected shortly, the link may be invalid.</p>
    </div>
  );
}
