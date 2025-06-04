
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // New state for initial auth check

  const checkSessionAndDeactivation = useCallback(async (currentSession: Session | null, showDeactivatedToast = true) => {
    if (currentSession) {
      setIsLoading(true); // Use main isLoading for this check as well
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_deactivated')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116: 0 rows, treat as not deactivated
          console.error('Error fetching profile for deactivation check:', profileError);
          // If profile fetch fails, err on side of caution and sign out
          await supabase.auth.signOut();
          if (showDeactivatedToast) { // Avoid double toast if called from onSubmit
            toast({
              title: 'Error',
              description: 'Could not verify account status. Please try logging in again.',
              variant: 'destructive',
            });
          }
          return false; // Indicate login should not proceed
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
          return false; // Indicate login should not proceed
        }
        // Profile exists and is not deactivated
        router.replace('/'); 
        return true; // Indicate login can proceed (though already redirected)
      } catch (e: any) {
        console.error("Unexpected error checking deactivation status:", e);
        await supabase.auth.signOut(); // Sign out on unexpected error
        if (showDeactivatedToast) {
          toast({
            title: 'Login Error',
            description: 'An unexpected error occurred. Please try again.',
            variant: 'destructive',
          });
        }
        return false; // Indicate login should not proceed
      } finally {
        setIsLoading(false);
      }
    }
    setIsCheckingAuth(false); // No session, finish initial auth check
    return true; // No session, so login can proceed if user attempts
  }, [router, toast]);


  useEffect(() => {
    let isMounted = true;
    let authSubscription: Subscription | null = null;
    
    setIsCheckingAuth(true);
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      await checkSessionAndDeactivation(initialSession, false); // Check initial session, suppress toast if already logged in & fine
      if (isMounted) setIsCheckingAuth(false);
    }).catch(e => {
      if (isMounted) {
        console.error("Error in initial getSession:", e);
        setIsCheckingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      authSubscription = subscription;
      
      if (event === 'SIGNED_IN' && session) {
        // This will be triggered after successful supabase.auth.signInWithPassword
        // The checkSessionAndDeactivation will handle redirect or sign out
        await checkSessionAndDeactivation(session);
      }
      // If SIGNED_OUT, user should remain on login page (or be redirected here by page.tsx if they were elsewhere)
    });

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, [checkSessionAndDeactivation]);

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
      const { error, data: signInData } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }
      
      // If signInWithPassword is successful, onAuthStateChange SIGNED_IN event will fire.
      // The checkSessionAndDeactivation function will then determine if the user is deactivated.
      // We don't need to call it explicitly here again.
      toast({
        title: 'Login Attempted',
        description: 'Verifying account status...', // This toast might be quickly replaced by deactivation toast or success
      });
      // No explicit router.push/replace here, onAuthStateChange listener handles it after deactivation check
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or account issue. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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
