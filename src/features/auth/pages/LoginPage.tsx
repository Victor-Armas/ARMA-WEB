import logo from '@/assets/arma-logo.webp';
import background from '@/assets/login-background.png';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  return (
    <main className="login-page relative isolate flex min-h-dvh flex-col items-center overflow-x-hidden bg-arma-background px-5" style={{ backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-arma-background/15" />
      <header className="mt-3 flex flex-col items-center sm:mt-8">
        <img src={logo} alt="ARMA" width={280} height={90} className="h-[90px] w-[280px] object-contain" />
        <p className="mt-1 text-center text-xs leading-6 tracking-[4px] text-arma-text">
          CONTROL DE INVENTARIO<br />DE PLAYERAS
        </p>
      </header>
      <section aria-label="Acceso del personal" className="my-10 w-full max-w-[440px] rounded-[30px] bg-white/95 px-6 pb-8 pt-7 shadow-[0_12px_40px_rgba(0,0,0,0.10)] sm:my-12 sm:px-8">
        <LoginForm />
      </section>
      <footer className="mt-auto flex w-full max-w-[440px] items-center gap-4 pb-3 pt-3">
        <span aria-hidden="true" className="h-px flex-1 bg-[#BDB1A3]" />
        <p className="text-center text-[9px] tracking-[2px] text-arma-muted">ORGANIZA · CONTROLA · HAZ CRECER</p>
        <span aria-hidden="true" className="h-px flex-1 bg-[#BDB1A3]" />
      </footer>
    </main>
  );
}
