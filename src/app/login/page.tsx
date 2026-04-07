'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { z } from 'zod';
import { Loader2, LogIn, Sparkles, ShieldCheck } from 'lucide-react';

import { LOGIN } from '@/graphql/operations';
import { setAuthToken } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginResponse {
  login: {
    accessToken: string;
    tokenType: string;
    expiresIn: string;
  };
}

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const [login, { loading }] = useMutation<LoginResponse>(LOGIN);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await login({
        variables: {
          input: {
            email: data.email,
            password: data.password,
          },
        },
      });

      const token = response.data?.login?.accessToken;
      const expiresIn = response.data?.login?.expiresIn;
      if (!token) {
        setError('root', { message: 'Login failed: token not returned' });
        return;
      }

      setAuthToken(token, expiresIn);
      router.push('/admin');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid credentials';
      setError('root', { message });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-2">
        <div className="hidden border-r bg-linear-to-br from-primary/10 via-secondary/20 to-muted p-8 lg:block">
          <div className="flex h-full flex-col justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Ecommerce Admin
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">Manage products, inventory, and orders in one place.</h2>
              <p className="text-sm text-muted-foreground">
                Secure sign-in to your operational dashboard and merchandising tools.
              </p>
              <div className="inline-flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Token-based authenticated session
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <Card className="border-0 shadow-none">
            <CardHeader className="px-0">
              <CardTitle className="text-2xl">Admin Login</CardTitle>
              <CardDescription>Sign in to access the ecommerce admin dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="admin@example.com" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>

                {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Sign In
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Back to{' '}
                  <Link href="/" className="underline">
                    home
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
