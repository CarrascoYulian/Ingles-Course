'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

import { useAdminRole, useIsSuperAdmin } from '@/components/admin/admin-shell';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ROLE_LABEL } from '@/lib/auth/rbac';
import { ROUTES } from '@/constants/routes';
import {
  useChangePassword,
  useInviteStaff,
  useRemoveStaff,
  useSetStaffActive,
  useStaffList,
  useUpdateProfile,
} from '../hooks/use-account';
import { changePasswordSchema, updateProfileSchema, type ChangePasswordValues, type UpdateProfileValues } from '../schemas';
import { InviteStaffDialog } from './invite-staff-dialog';

export interface AccountViewProps {
  fullName: string;
  role: 'admin' | 'instructor' | 'student';
}

export function AccountView({ fullName, role }: AccountViewProps) {
  const viewerRole = useAdminRole();
  const isAdmin = viewerRole === 'admin';

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5 px-5 py-6 lg:px-[30px] lg:py-8">
      <ProfileSection fullName={fullName} role={role} />
      <PasswordSection />
      {isAdmin && <TeamSection />}
    </div>
  );
}

function ProfileSection({ fullName, role }: AccountViewProps) {
  const updateProfile = useUpdateProfile();
  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName },
    mode: 'onSubmit',
  });

  const submit = form.handleSubmit((values) => updateProfile.mutate(values.fullName));

  return (
    <Card padding="lg">
      <CardHeader>
        <div>
          <CardTitle>Mi perfil</CardTitle>
          <CardDescription>Tu nombre visible en el panel.</CardDescription>
        </div>
        <Badge tone="brand">{ROLE_LABEL[role]}</Badge>
      </CardHeader>

      <form onSubmit={submit} noValidate className="mt-5">
        <Field label="Nombre completo" error={form.formState.errors.fullName?.message}>
          {(fieldProps) => (
            <Input {...fieldProps} {...form.register('fullName')} autoComplete="off" />
          )}
        </Field>

        <Button type="submit" size="md" className="mt-4 font-extrabold" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onSubmit',
  });

  const submit = form.handleSubmit(async (values) => {
    await changePassword.mutateAsync(values.password);
    form.reset({ password: '', confirmPassword: '' });
  });

  return (
    <Card padding="lg">
      <CardTitle>Contraseña</CardTitle>
      <CardDescription>Elegí una nueva contraseña para iniciar sesión.</CardDescription>

      <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
        <Field label="Nueva contraseña" error={form.formState.errors.password?.message}>
          {(fieldProps) => (
            <PasswordInput {...fieldProps} {...form.register('password')} autoComplete="new-password" />
          )}
        </Field>
        <Field label="Confirmar contraseña" error={form.formState.errors.confirmPassword?.message}>
          {(fieldProps) => (
            <PasswordInput
              {...fieldProps}
              {...form.register('confirmPassword')}
              autoComplete="new-password"
            />
          )}
        </Field>

        <Button type="submit" size="md" className="w-fit font-extrabold" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Card>
  );
}

function TeamSection() {
  const isSuperAdmin = useIsSuperAdmin();
  const { data: staff, isLoading } = useStaffList();
  const inviteStaff = useInviteStaff();
  const setStaffActive = useSetStaffActive();
  const removeStaff = useRemoveStaff();
  const [inviteOpen, setInviteOpen] = useState(false);
  const confirmDialog = useConfirmDialog();

  return (
    <Card padding="lg">
      <CardHeader>
        <div>
          <CardTitle>Equipo</CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? 'Administradores con acceso al panel.'
              : 'Administradores con acceso al panel. Sólo el dueño de la cuenta puede invitar, activar o eliminar.'}
          </CardDescription>
        </div>
        {isSuperAdmin && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Invitar admin
          </Button>
        )}
      </CardHeader>

      <div className="mt-5 flex flex-col gap-2.5">
        {isLoading && <p className="text-meta font-semibold text-fg-faint">Cargando…</p>}
        {staff?.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3"
          >
            <Avatar name={member.fullName} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-bold text-fg">{member.fullName}</p>
              <p className="truncate text-tiny font-medium text-fg-faint">{member.email}</p>
            </div>
            {member.isSuperAdmin && <Badge tone="brand">Dueño</Badge>}
            <Badge tone={member.isActive ? 'success' : 'neutral'}>
              {member.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
            {isSuperAdmin && !member.isSuperAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={setStaffActive.isPending}
                  onClick={() =>
                    setStaffActive.mutate({ id: member.id, name: member.fullName, active: !member.isActive })
                  }
                >
                  {member.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-strong hover:text-danger-strong"
                  disabled={removeStaff.isPending}
                  onClick={() =>
                    confirmDialog.confirm({
                      title: 'Eliminar administrador',
                      body: `Se borrará la cuenta de ${member.fullName} de forma permanente y quedará libre su correo para volver a invitarlo. Esta acción no se puede deshacer.`,
                      confirmLabel: 'Sí, eliminar',
                      onConfirm: () => removeStaff.mutateAsync({ id: member.id, name: member.fullName }),
                    })
                  }
                >
                  Eliminar
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <Link
        href={ROUTES.admin.actividad}
        className="mt-4 inline-block text-meta font-bold text-brand hover:underline"
      >
        Ver actividad →
      </Link>

      {isSuperAdmin && (
        <InviteStaffDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          pending={inviteStaff.isPending}
          onSubmit={(values) => inviteStaff.mutateAsync(values)}
        />
      )}

      <ConfirmDialog
        request={confirmDialog.request}
        open={confirmDialog.isOpen}
        pending={confirmDialog.pending}
        onCancel={confirmDialog.dismiss}
        onConfirm={confirmDialog.accept}
      />
    </Card>
  );
}
