
'use client';

import { useState } from 'react';
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
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { clearLocalData } from '@/lib/localStore';

const MIN_PASSWORD_LENGTH = 8;

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string()
    .min(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` })
    .regex(/(?=.*[A-Z])/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/(?=.*\d)/, { message: 'Password must contain at least one number.' })
    .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/, { message: 'Password must contain at least one symbol.' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      // Clear any local guest data upon registration attempt
      clearLocalData();
      toast({
        title: "Switched to Cloud Account",
        description: "You're creating a new cloud account. Any unsynced local guest data has been cleared.",
        duration: 5000,
      });

      const emailRedirectTo = `${window.location.origin}/`; // Redirect to dashboard after confirmation

      const { error, data: signUpData } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: emailRedirectTo,
        },
      });

      if (error) throw error;

      // Check if user needs confirmation
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        // This typically means email confirmation is required
         toast({
            title: 'Registration Sent!',
            description: 'Please check your email to confirm your account. You will be redirected to the app after confirmation.',
            duration: 5000,
        });
      } else {
        // If user is immediately created (e.g. auto-confirmation enabled in Supabase)
        toast({
            title: 'Registration Successful!',
            description: 'Your account has been created. Redirecting...',
        });
        // The onAuthStateChange listener in page.tsx should handle redirecting to '/'
        // but we can also push here as a fallback if needed, or if onAuthStateChange is slow.
        // router.push('/');
      }
      // Don't redirect from here if email confirmation is pending.
      // User will click link in email.
      // If auto-confirmed, onAuthStateChange in root page will handle the redirect.

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
           <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
            <UserPlus className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join BudgetFlow to manage your finances effectively.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem> <FormLabel>Email Address</FormLabel> <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl> <FormMessage /> </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage />
                     <ul className="mt-2 list-disc list-inside text-xs text-muted-foreground space-y-1">
                        <li>Minimum {MIN_PASSWORD_LENGTH} characters</li>
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
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
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
        </CardFooter>
      </Card>
    </div>
  );
}
