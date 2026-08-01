'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { IS_DEMO_MODE } from '@/lib/env';
import { loginSchema, type LoginValues } from '../schemas';

/**
 * Cuentas de prueba del modo demo. Sólo se muestran cuando no hay Supabase
 * configurado — con Supabase real, esta pantalla pide credenciales reales
 * y estas cuentas dejan de existir en la interfaz.
 */
const DEMO_DEMO_ACCOUNTS = [
  { label: 'Administrador', identifier: 'admin@inglesconmetodo.demo', password: 'Admin#2026' },
  { label: 'Estudiante', identifier: 'estudiante@inglesconmetodo.demo', password: 'Estudiante#2026' },
] as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const submit = form.handleSubmit(async ({ identifier, password }) => {
    setFormError(null);

    const endpoint = IS_DEMO_MODE ? '/api/demo-auth/login' : '/api/auth/login';
    const body = IS_DEMO_MODE
      ? { email: identifier, password }
      : { identifier, password };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseBody = (await response.json().catch(() => null)) as { error?: string } | null;
      setFormError(responseBody?.error ?? 'No se pudo iniciar sesión.');
      return;
    }

    const { next } = (await response.json()) as { next: string };
    router.push(searchParams.get('next') ?? next);
    router.refresh();
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {formError && (
        <p
          role="alert"
          className="rounded-2xl border border-danger-line bg-danger-soft px-3.5 py-3 text-body-sm font-bold text-danger-strong"
        >
          {formError}
        </p>
      )}

      <Field label="Usuario" error={form.formState.errors.identifier?.message}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...form.register('identifier')}
            type="text"
            autoComplete="username"
            placeholder="Matrícula (alumno) o correo (personal)"
          />
        )}
      </Field>

      <Field label="Contraseña" error={form.formState.errors.password?.message}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...form.register('password')}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        )}
      </Field>

      <Button type="submit" size="block" disabled={form.formState.isSubmitting} className="mt-1">
        {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>

      {IS_DEMO_MODE && (
        <div className="rounded-2xl bg-surface-sunken px-3.5 py-3 text-meta font-semibold leading-normal text-fg-soft">
          <p className="font-bold text-fg-subtle">
            Modo demo activo: no hay Supabase configurado. Usa una de estas cuentas de prueba.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {DEMO_DEMO_ACCOUNTS.map((account) => (
              <li key={account.identifier} className="flex items-center justify-between gap-2">
                <span>
                  <strong className="text-fg">{account.label}:</strong> {account.identifier} /{' '}
                  {account.password}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    form.setValue('identifier', account.identifier);
                    form.setValue('password', account.password);
                  }}
                >
                  Usar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
