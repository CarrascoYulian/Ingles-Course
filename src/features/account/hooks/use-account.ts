'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { backend } from '@/services';
import type { InviteStaffInput } from '@/services';

export function useUpdateProfile() {
  const router = useRouter();

  return useMutation({
    mutationFn: (fullName: string) => backend.account.updateProfile(fullName),
    onSuccess: () => {
      toast.success('Perfil actualizado');
      // No hay query de "mi perfil" — el nombre lo lee el server layout
      // (`getCurrentProfile()`), así que `router.refresh()` es lo que lo
      // trae de vuelta actualizado a la barra lateral y la cabecera.
      router.refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el perfil.'),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => backend.account.changePassword(newPassword),
    onSuccess: () => toast.success('Contraseña actualizada'),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.'),
  });
}

export function useStaffList() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => backend.staff.list(),
  });
}

export function useInviteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteStaffInput) => backend.staff.invite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo invitar al administrador.'),
  });
}

export function useSetStaffActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; name: string; active: boolean }) =>
      backend.staff.setActive(id, active),
    onSuccess: (_data, { name, active }) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast(active ? `${name} activado` : `${name} desactivado`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado.'),
  });
}
