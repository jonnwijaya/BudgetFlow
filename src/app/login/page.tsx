
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Subscription, Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { checkAndAwardLoginStreak } from '@/lib/achievementsHelper';
import { format } from 'date-fns';
import { clearLocalData } from '@/lib/localStore'; // Import clearLocalData

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Start true to check session
  const [showPassword, setShowPassword] = useState(false);

  const handleSuccessfulLogin = useCallback(async (sessionUser: User) => {
    try {
      // Clear any local guest data upon successful login
      clearLocalData();
      toast({
        title: "Local Data Cleared",
        description: "Switched to your cloud account. Any unsynced local data has been cleared.",
        duration: 4000,
      });

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, last_login_at, login_streak_days, is_deactivated, budget_threshold, selected_currency')
        .eq('id', sessionUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profile?.is_deactivated) {
        await supabase.auth.signOut();
        toast({
          title: 'Account Deactivated',
          description: 'This account has been deactivated.',
          variant: 'destructive',
        });
        return false;
      }

      let currentProfile = profile;
      if (!profile) {
         const { data: newProfileData, error: newProfileError } = await supabase
          .from('profiles')
          .insert({
            id: sessionUser.id,
            budget_threshold: null,
            selected_currency: 'USD',
            is_deactivated: false,
            last_login_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
            login_streak_days: 1
          })
          .select()
          .single();
        if (newProfileError) throw newProfileError;
        currentProfile = newProfileData as Profile;
      }

      if (currentProfile) {
        await checkAndAwardLoginStreak(sessionUser, currentProfile, toast);
      }
      return true;

    } catch (error: any) {
      console.error('Error during post-login processing:', error);
      toast({
        title: 'Login Error',
        description: error.message || 'Could not complete login process.',
        variant: 'destructive',
      });
      await supabase.auth.signOut();
      return false;
    }
  }, [toast]);


  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        // If already has session, treat as successful login path (checks deactivation, awards streak etc.)
        // and redirect if successful.
        const stillAuthenticated = await handleSuccessfulLogin(session.user);
        if (isMounted && stillAuthenticated) {
          router.replace('/'); // Redirect to dashboard if login is valid
        } else {
          setIsCheckingAuth(false); // Stay on login page if handleSuccessfulLogin failed
        }
      } else {
        setIsCheckingAuth(false); // No session, allow login form to show
      }
    }).catch(error => {
      console.error("Error getting initial session:", error);
       if (isMounted) setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session) {
        setIsLoading(true);
        const stillAuthenticated = await handleSuccessfulLogin(session.user);
        if (isMounted) {
          if (stillAuthenticated) {
            router.replace('/');
          } else {
            // If handleSuccessfulLogin decided this login isn't valid (e.g. deactivated)
            // ensure loading is false and checkingAuth is false so form can be shown
            setIsLoading(false);
            setIsCheckingAuth(false);
          }
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
         if (isMounted) {
          setIsCheckingAuth(false);
          setIsLoading(false);
         }
      } else if (event === 'INITIAL_SESSION' && !session) {
         // This case might be redundant if getSession above handles it, but good for safety
         if (isMounted) setIsCheckingAuth(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [handleSuccessfulLogin, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true, },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      // Success is handled by onAuthStateChange 'SIGNED_IN'
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or account issue.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) { // Show loader while session is being checked
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
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem> <FormLabel>Email Address</FormLabel> <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem> <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} className="pr-10"/></FormControl>
                    <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-primary" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                  </div> <FormMessage /> </FormItem>
              )} />
              <div className="flex items-center justify-between">
                <FormField control={form.control} name="rememberMe" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="rememberMe" /></FormControl>
                    <Label htmlFor="rememberMe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Remember me</Label>
                  </FormItem>
                )} />
                <Link href="/forgot-password" passHref legacyBehavior><a className="text-sm font-medium text-primary hover:underline">Forgot password?</a></Link>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />} Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">Register here</Link>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Or{' '}
            <Link href="/" className="font-medium text-accent hover:underline">
                Continue as Guest
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
