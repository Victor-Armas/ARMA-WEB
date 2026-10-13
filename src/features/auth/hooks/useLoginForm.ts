import { zodResolver } from '@hookform/resolvers/zod';
import { isAuthError } from '@supabase/supabase-js';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginFormData, type LoginFormInput } from '../schemas/login.schema';
import { signInWithPassword } from '../services/auth.service';

export function useLoginForm() {
  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginFormInput, undefined, LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  async function onSubmit(values: LoginFormData) {
    try {
      await signInWithPassword(values);
    } catch (error: unknown) {
      let message = 'No se pudo iniciar sesión. Inténtalo nuevamente.';
      if (isAuthError(error)) {
        if (error.code === 'invalid_credentials') {
          message = 'Correo o contraseña incorrectos.';
        } else if (error.code === 'email_not_confirmed') {
          message = 'Confirma tu correo antes de iniciar sesión.';
        } else if (error.code === 'over_request_rate_limit') {
          message = 'Demasiados intentos. Espera un momento antes de volver a intentar.';
        }
      }
      setError('root.server', { type: 'server', message });
    }
  }

  return {
    register, errors, submit: handleSubmit(onSubmit),
    isSubmitting, isSubmitSuccessful,
    submitError: errors.root?.server?.message,
  };
}
