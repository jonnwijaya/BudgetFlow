
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
import type { Subscription, Session } from '@supabase/supabase-js';

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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

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
        // setIsLoading(false); // This isLoading is for the login form submission
      }
    }
    return true; 
  }, [router, toast]);


  useEffect(() => {
    let isMounted = true;
    setIsCheckingAuth(true);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session) {
        const stillAuthenticated = await checkSessionAndDeactivation(session, false);
        if (isMounted) {
          if (stillAuthenticated) {
            router.replace('/');
          } else {
            setIsCheckingAuth(false);
          }
        }
      } else {
        if (isMounted) setIsCheckingAuth(false);
      }
    }).catch(error => {
      console.error("Error getting initial session:", error);
       if (isMounted) {
        setIsCheckingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session) {
        setIsLoading(true); 
        const stillAuthenticated = await checkSessionAndDeactivation(session, true);
        if (isMounted) {
          if (stillAuthenticated) {
            router.replace('/');
          } else {
            setIsCheckingAuth(false); 
          }
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        if (isMounted) setIsCheckingAuth(false);
      } else if (event === 'INITIAL_SESSION' && !session) {
         if (isMounted) setIsCheckingAuth(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [checkSessionAndDeactivation, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true, 
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
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or account issue. Please try again.',
        variant: 'destructive',
      });
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
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••" 
                          {...field} 
                          className="pr-10"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-primary"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="rememberMe"
                        />
                      </FormControl>
                      <Label htmlFor="rememberMe" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Remember me
                      </Label>
                    </FormItem>
                  )}
                />
                <Link href="/forgot-password" passHref legacyBehavior>
                  <a className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </a>
                </Link>
              </div>
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
