import type { Metadata } from 'next';

import { CertificateView } from '@/features/learning/components/certificate-view';
import { getCurrentProfile } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Certificado',
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const profile = await getCurrentProfile();
  return <CertificateView courseId={courseId} studentName={profile?.fullName ?? ''} />;
}
