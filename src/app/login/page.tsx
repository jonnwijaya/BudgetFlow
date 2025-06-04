
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
import { Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Subscription, Session } from '@supabase/supabase-js';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const checkSessionAndDeactivation = useCallback(async (currentSession: Session | null, showDeactivatedToast = true) => {
    if (currentSession) {
      setIsLoading(true); 
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_deactivated')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { 
          console.error('Error fetching profile for deactivation check:', profileError);
          await supabase.auth.signOut();
          if (showDeactivatedToast) { 
            toast({
              title: 'Error',
              description: 'Could not verify account status. Please try logging in again.',
              variant: 'destructive',
            });
          }
          return false; 
        }

        if (profile?.is_deactivated) {
          await supabase.auth.signOut();
          if (showDeactivatedToast) {
            toast({
              title: 'Account Deactivated',
              description: 'This account has been deactivated and cannot be accessed.',
              variant: 'destructive',
            });
          }
          return false; 
        }
        // If not deactivated and session is valid, let the main page redirect
        // router.replace('/'); 
        return true; 
      } catch (e: any) {
        console.error("Unexpected error checking deactivation status:", e);
        await supabase.auth.signOut(); 
        if (showDeactivatedToast) {
          toast({
            title: 'Login Error',
            description: 'An unexpected error occurred. Please try again.',
            variant: 'destructive',
          });
        }
        return false; 
      } finally {
        // setIsLoading(false); // This isLoading is for the login form submission, not initial check
      }
    }
    return true; // No session to check, or session check passed without deactivation
  }, [router, toast]);


  useEffect(() => {
    let isMounted = true;
    let authSubscription: Subscription | null = null;
    
    setIsCheckingAuth(true); // Start by assuming we are checking auth

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;

      if (initialSession) {
        // If a session exists, verify it (e.g., check deactivation status)
        const stillAuthenticated = await checkSessionAndDeactivation(initialSession, false);
        if (isMounted) {
          if (stillAuthenticated) {
            router.replace('/'); // User is authenticated and active, redirect to home
          } else {
            // User was signed out by checkSessionAndDeactivation or session was invalid.
            setIsCheckingAuth(false); // Stop checking, login form will show
          }
        }
      } else {
        // No initial session, so stop checking and show login form
        if (isMounted) setIsCheckingAuth(false);
      }
    }).catch(error => {
      // If getSession fails (e.g. network error, or auth error like invalid token)
      if (isMounted) {
        console.error("Error in initial getSession on LoginPage:", error);
        setIsCheckingAuth(false); // Stop checking, show login form
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      authSubscription = subscription;
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session) {
        setIsLoading(true); // Show loading indicator while checking deactivation
        const stillAuthenticated = await checkSessionAndDeactivation(session, true);
        if (isMounted) {
          if (stillAuthenticated) {
            router.replace('/');
          } else {
            setIsCheckingAuth(false); // Ensure form is shown if check leads to sign out
          }
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        if (isMounted) setIsCheckingAuth(false);
      } else if (event === 'INITIAL_SESSION') {
        // This event helps confirm the end of the auth check process.
        // The main logic is in getSession().then(), but this ensures setIsCheckingAuth(false)
        // if it hasn't been set yet (e.g., if getSession() was quick and initialSession was null).
        if (isMounted && isCheckingAuth) {
            if (session) {
                const stillAuthenticated = await checkSessionAndDeactivation(session, false);
                if (isMounted) {
                    if (stillAuthenticated) router.replace('/');
                    else setIsCheckingAuth(false);
                }
            } else {
                if (isMounted) setIsCheckingAuth(false);
            }
        }
      }
    });

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, [checkSessionAndDeactivation, router, isCheckingAuth]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }
      // Don't toast "Login Attempted" here. Let onAuthStateChange handle 'SIGNED_IN'
      // which will then call checkSessionAndDeactivation and provide more specific feedback.
      // If successful, onAuthStateChange will trigger redirection via checkSessionAndDeactivation.
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or account issue. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false); // Only set isLoading false on error here
    }
    // Do not set setIsLoading(false) here on success; let onAuthStateChange SIGNED_IN handler do it
    // after its checks.
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome Back!</CardTitle>
          <CardDescription>Sign in to continue to BudgetFlow.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="/forgot-password" passHref legacyBehavior>
                        <a className="text-sm font-medium text-primary hover:underline">
                          Forgot password?
                        </a>
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Register here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

