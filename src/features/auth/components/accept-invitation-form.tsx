'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { changePasswordSchema, type ChangePasswordValues } from '@/features/account/schemas';
import { LANDING_BY_ROLE } from '@/constants/routes';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Status = 'loading' | 'invalid' | 'ready' | 'saving' | 'done';

/**
 * El link del correo de invitación no apunta acá directo: apunta a
 * Supabase, que verifica el token de un solo uso y recién DESPUÉS
 * redirige acá con `#access_token=...` (sesión ya armada) o con
 * `#error=...` si el token ya venció o se usó (p. ej. un antivirus de
 * correo que sigue el link automáticamente antes de que la persona haga
 * clic — la causa más común de "enlace inválido o expirado" en el primer
 * intento). El cliente de Supabase (`detectSessionInUrl`, activado por
 * defecto) procesa ese fragmento solo con sólo instanciarse.
 */
export function AcceptInvitationForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onSubmit',
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus('invalid');
      return;
    }

    if (window.location.hash.includes('error=')) {
      setStatus('invalid');
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'ready' : 'invalid');
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ready');
    });

    return () => subscription.unsubscribe();
  }, []);

  const submit = form.handleSubmit(async (values) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setStatus('saving');
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      form.setError('password', { message: error.message });
      setStatus('ready');
      return;
    }

    setStatus('done');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = (user?.user_metadata?.role as keyof typeof LANDING_BY_ROLE | undefined) ?? 'admin';
    router.push(LANDING_BY_ROLE[role]);
    router.refresh();
  });

  if (status === 'loading') {
    return <p className="text-center text-body-sm font-medium text-fg-dim">Verificando invitación…</p>;
  }

  if (status === 'invalid') {
    return (
      <div className="text-center">
        <p className="text-body-sm font-semibold text-fg">
          El enlace no es válido o ya venció.
        </p>
        <p className="mt-1 text-meta font-medium text-fg-faint">
          Pedile a un administrador que te reenvíe la invitación desde Mi cuenta → Equipo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-center text-body-sm font-medium text-fg-dim">
        Elegí tu contraseña para activar la cuenta.
      </p>

      <Field label="Contraseña" error={form.formState.errors.password?.message}>
        {(fieldProps) => (
          <Input {...fieldProps} {...form.register('password')} type="password" autoComplete="new-password" autoFocus />
        )}
      </Field>
      <Field label="Confirmar contraseña" error={form.formState.errors.confirmPassword?.message}>
        {(fieldProps) => (
          <Input {...fieldProps} {...form.register('confirmPassword')} type="password" autoComplete="new-password" />
        )}
      </Field>

      <Button type="submit" size="md" className="font-extrabold" disabled={status === 'saving' || status === 'done'}>
        {status === 'saving' || status === 'done' ? 'Entrando…' : 'Activar cuenta'}
      </Button>
    </form>
  );
}
