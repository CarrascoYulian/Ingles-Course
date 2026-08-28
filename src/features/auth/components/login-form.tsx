'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { IS_DEMO_MODE } from '@/lib/env';
import { loginSchema, type LoginValues } from '../schemas';

interface DemoAccountOption {
  label: string;
  email: string;
  password: string;
}

/**
 * Antes las credenciales de las cuentas de prueba estaban escritas
 * directamente aquí — visibles para cualquiera con acceso al código fuente
 * (p. ej. en GitHub). Ahora sólo existen en `.env.local` (no versionado) y
 * se piden a `/api/demo-auth/accounts`, que las lee del entorno del
 * servidor.
 */
function useDemoAccounts() {
  return useQuery({
    queryKey: ['demo-accounts'],
    queryFn: async (): Promise<DemoAccountOption[]> => {
      const response = await fetch('/api/demo-auth/accounts');
      if (!response.ok) return [];
      const { accounts } = (await response.json()) as { accounts: DemoAccountOption[] };
      return accounts;
    },
    enabled: IS_DEMO_MODE,
    staleTime: Infinity,
  });
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const { data: demoAccounts } = useDemoAccounts();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const expired = searchParams.get('expired') === '1';

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

      {!formError && expired && (
        <p
          role="status"
          className="rounded-2xl border border-line-strong bg-surface-sunken px-3.5 py-3 text-body-sm font-bold text-fg-subtle"
        >
          Tu sesión expiró por inactividad. Entra de nuevo para continuar.
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

      <div>
        <Field label="Contraseña" error={form.formState.errors.password?.message}>
          {(fieldProps) => (
            <PasswordInput
              {...fieldProps}
              {...form.register('password')}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          )}
        </Field>
        <div className="mt-2 text-right">
          <a
            href="mailto:berthocommunity@gmail.com"
            className="text-meta font-bold text-brand underline"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </div>

      <Button type="submit" size="block" disabled={form.formState.isSubmitting} className="mt-1">
        {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>

      {IS_DEMO_MODE && demoAccounts && demoAccounts.length > 0 && (
        <div className="rounded-2xl bg-surface-sunken px-3.5 py-3 text-meta font-semibold leading-normal text-fg-soft">
          <p className="font-bold text-fg-subtle">
            Modo demo activo: no hay Supabase configurado. Usa una de estas cuentas de prueba.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {demoAccounts.map((account) => (
              <li key={account.email} className="flex items-center justify-between gap-2">
                <span>
                  <strong className="text-fg">{account.label}:</strong> {account.email} /{' '}
                  {account.password}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    form.setValue('identifier', account.email);
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
