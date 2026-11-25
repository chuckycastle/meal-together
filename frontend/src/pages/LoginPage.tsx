/**
 * Login Page
 * User authentication form
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';
import { AuthFrame, PasswordField } from '../components/layout/AuthFrame';
import { Notice } from '../components/kit';

export const LoginPage = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    try {
      await login(data);
    } catch (err) {
      const message = (err as { error?: string })?.error;
      setError(message || 'That email and password did not match. Check both and try again.');
    }
  };

  return (
    <AuthFrame
      title="Sign in"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <Notice>{error}</Notice>}

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            className="field"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-hot" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          inputProps={register('password')}
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </AuthFrame>
  );
};

export default LoginPage;
