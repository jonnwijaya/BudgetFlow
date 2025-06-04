
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
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Simple Google Logo SVG
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M17.64 9.20455C17.64 8.56636 17.5832 7.95273 17.4777 7.36364H9V10.845H13.8436C13.635 11.9705 13.0014 12.9232 12.045 13.5295V15.8195H14.9564C16.6582 14.2527 17.64 11.9468 17.64 9.20455Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.045 13.5295C11.2418 14.0377 10.2109 14.3459 9 14.3459C6.96182 14.3459 5.22091 12.9777 4.52182 11.0768H1.515V13.4382C3.00773 16.2295 5.79409 18 9 18Z" fill="#34A853"/>
    <path d="M4.52182 11.0768C4.32136 10.4786 4.20727 9.84455 4.20727 9.18136C4.20727 8.51818 4.32136 7.88409 4.52182 7.28591V4.92455H1.515C0.961364 6.04591 0.654545 7.33773 0.654545 8.72727V9.635C0.654545 11.0245 0.961364 12.3164 1.515 13.4377L4.52182 11.0768Z" fill="#FBBC05"/>
    <path d="M9 3.99909C10.3214 3.99909 11.5077 4.455 12.4782 5.38182L15.0218 2.85C13.4632 1.40955 11.4259 0.363636 9 0.363636C5.79409 0.363636 3.00773 2.13409 1.515 4.92455L4.52182 7.28591C5.22091 5.385 6.96182 3.99909 9 3.99909Z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session) {
          router.push('/');
        }
      } catch (e) {
        console.error("Error checking user session on login page:", e);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'Could not verify session. Please try logging in.',
            variant: 'destructive',
          });
        }
      }
    };
    checkUser();
    return () => {
      isMounted = false;
    };
  }, [router, toast]);

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
      
      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
      });
      router.push('/'); 
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Supabase redirects here after its own /auth/v1/callback
        },
      });
      if (error) {
        throw error;
      }
      // Supabase handles the redirection to Google.
      // The user will be redirected away, so setIsLoading(false) might not be hit here.
      // It will be reset if an error occurs or when the component re-mounts.
    } catch (error: any) {
      toast({
        title: 'Google Sign-In Failed',
        description: error.message || 'Could not sign in with Google. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false); // Ensure loading is false on error
    }
  };


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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            type="button" 
            className="w-full" 
            onClick={handleGoogleSignIn} 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Sign in with Google
          </Button>

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
