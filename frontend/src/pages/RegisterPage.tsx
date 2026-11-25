/**
 * Register Page
 * User account creation form
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schema';
import { AuthFrame, PasswordField } from '../components/layout/AuthFrame';
import { Notice } from '../components/kit';

export const RegisterPage = () => {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    try {
      await registerUser(data);
    } catch (err) {
      const message = (err as { error?: string; message?: string })?.error;
      setError(message || 'The account was not created. Check your connection and try again.');
    }
  };

  const textField = (
    name: 'email' | 'first_name' | 'last_name',
    label: string,
    type: string,
    autoComplete: string
  ) => (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        {...register(name)}
        id={name}
        type={type}
        autoComplete={autoComplete}
        className="field"
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="mt-1 text-sm text-hot" role="alert">
          {errors[name]?.message}
        </p>
      )}
    </div>
  );

  return (
    <AuthFrame
      title="Create an account"
      footer={
        <>
          Already cooking with us?{' '}
          <Link to="/login" className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <Notice>{error}</Notice>}

        <div className="grid grid-cols-2 gap-3">
          {textField('first_name', 'First name', 'text', 'given-name')}
          {textField('last_name', 'Last name', 'text', 'family-name')}
        </div>
        {textField('email', 'Email', 'email', 'email')}

        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          inputProps={register('password')}
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
        <PasswordField
          id="confirm_password"
          label="Password again"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          inputProps={register('confirm_password')}
          visible={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />

        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account' : 'Create account'}
        </button>
      </form>
    </AuthFrame>
  );
};

export default RegisterPage;
