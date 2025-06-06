
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
import { Loader2, UserPlus, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { clearLocalData } from '@/lib/localStore';

const MIN_PASSWORD_LENGTH = 8;

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string()
    .min(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` })
    .regex(/(?=.*[a-z])/, { message: 'Password must contain at least one lowercase letter.' })
    .regex(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/(?=.*\d)/, { message: 'Password must contain at least one number.' })
    .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/, { message: 'Password must contain at least one symbol.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const REDIRECT_DELAY = 7000; // 7 seconds

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirmationMessage) {
      timer = setTimeout(() => {
        router.push('/login');
      }, REDIRECT_DELAY);
    }
    return () => clearTimeout(timer);
  }, [showConfirmationMessage, router]);

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setShowConfirmationMessage(false); 
    setSubmittedEmail('');
    try {
      clearLocalData();
      toast({
        title: "Account Creation Initialized",
        description: "Attempting to create your cloud account. Any unsynced local guest data has been cleared.",
        duration: 3000,
      });

      const emailRedirectTo = `${window.location.origin}/`; // Redirects to home page after email link confirmed

      const { error, data: signUpData } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: emailRedirectTo,
        },
      });

      if (error) throw error;

      if (signUpData.user && !signUpData.session) { // User created, but no session means email confirmation needed
        setSubmittedEmail(data.email); // Store the email for display
        toast({
            title: 'Confirmation Email Sent!',
            description: `Please check your email at ${data.email} to confirm your account. You will be redirected to login shortly.`,
            duration: REDIRECT_DELAY, 
        });
        setShowConfirmationMessage(true);
        form.reset(); 
      } else if (signUpData.user && signUpData.session) { // User created and session present (e.g. auto-confirmed)
        toast({
            title: 'Registration Successful!',
            description: 'Your account has been created and you are now logged in. Redirecting...',
        });
        // The onAuthStateChange listener in login/page.tsx should handle redirecting to '/' 
        // for auto-confirmed users, as they are now SIGNED_IN.
      } else {
        // This case should ideally not be hit if sign-up didn't throw an error.
        // It implies an unexpected response structure from Supabase.
        console.error("Unexpected Supabase signUp response:", signUpData);
        toast({
          title: 'Registration Incomplete',
          description: 'Received an unexpected response from the server. Please try again.',
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {!showConfirmationMessage ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                <UserPlus className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
              <CardDescription>Join BudgetFlow to manage your finances effectively.</CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailCheck className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl font-headline">Check Your Email!</CardTitle>
              <CardDescription>
                We've sent a confirmation link to <span className="font-semibold text-primary">{submittedEmail}</span>.
                Please click the link in the email to activate your account.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!showConfirmationMessage ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem> <FormLabel>Email Address</FormLabel> <FormControl><Input type="email" placeholder="you@example.com" {...field} disabled={isLoading} /></FormControl> <FormMessage /> </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isLoading} /></FormControl> <FormMessage />
                      <ul className="mt-2 list-disc list-inside text-xs text-muted-foreground space-y-1">
                          <li>Minimum {MIN_PASSWORD_LENGTH} characters</li>
                          <li>At least one lowercase letter (a-z)</li>
                          <li>At least one uppercase letter (A-Z)</li>
                          <li>At least one number (0-9)</li>
                          <li>At least one symbol (e.g., !@#$%)</li>
                      </ul>
                    </FormItem>
                )} />
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Create Account
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                You will be automatically redirected to the login page in a few seconds.
              </p>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
          {!showConfirmationMessage && (
            <>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-accent hover:underline">Sign in here</Link>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Or{' '}
                <Link href="/" className="font-medium text-primary hover:underline">
                    Continue as Guest
                </Link>
              </p>
            </>
          )}
           {showConfirmationMessage && (
             <Button variant="outline" onClick={() => router.push('/login')}>
              Go to Login Now
            </Button>
           )}
        </CardFooter>
      </Card>
    </div>
  );
}
