import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { useLoginForm } from '../hooks/useLoginForm';

export function LoginForm() {
  const { register, errors, submit, isSubmitting, isSubmitSuccessful, submitError } = useLoginForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting}>
      <h1 className="text-[32px] font-bold tracking-tight text-arma-text">Bienvenido</h1>
      <p className="mt-2 text-base text-arma-muted">Inicia sesión para continuar</p>

      <div className="mt-8">
        <Input
          {...register('email')}
          label="Correo electrónico"
          leadingIcon={<Mail size={23} strokeWidth={1.8} />}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Correo electrónico"
          error={errors.email?.message}
          disabled={isSubmitting}
        />
      </div>
      <div className="mt-4">
        <Input
          {...register('password')}
          label="Contraseña"
          leadingIcon={<LockKeyhole size={23} strokeWidth={1.8} />}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Contraseña"
          error={errors.password?.message}
          disabled={isSubmitting}
          trailingAction={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
              className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-arma-icon outline-none hover:bg-arma-primary-soft focus-visible:ring-2 focus-visible:ring-arma-primary"
            >
              {showPassword ? <Eye size={23} strokeWidth={1.8} aria-hidden="true" /> : <EyeOff size={23} strokeWidth={1.8} aria-hidden="true" />}
            </button>
          }
        />
      </div>

      <div className="mt-4 text-right">
        <button type="button" disabled title="La recuperación de contraseña se implementará en la siguiente etapa" className="text-sm font-medium text-arma-primary">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button type="submit" disabled={isSubmitting} className="mt-7 flex min-h-[62px] w-full items-center gap-3 rounded-[18px] bg-arma-primary px-5 font-semibold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-arma-primary focus-visible:ring-offset-4 disabled:cursor-wait disabled:opacity-60">
        <span aria-hidden="true" className="w-7" />
        <span className="flex-1 text-center text-[17px]">{isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}</span>
        <ArrowRight size={27} strokeWidth={1.7} aria-hidden="true" />
      </button>

      {submitError ? <p role="alert" className="mt-4 text-sm text-arma-danger">{submitError}</p> : null}
      {isSubmitSuccessful ? <p role="status" className="mt-4 text-sm text-arma-muted">Inicio de sesión correcto.</p> : null}
    </form>
  );
}
