'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

import { LogoMark } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_NAME } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { CourseRatingWidget } from './course-rating-widget';
import { useMyCourses } from '../hooks/use-learning';

export interface CertificateViewProps {
  courseId: string;
  studentName: string;
}

function formatIssueDate(): string {
  return new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Certificado como PDF vía impresión del navegador, no una librería nueva
 * de generación de PDF: no hay ningún caso en el proyecto que la necesite
 * todavía, y `window.print()` con CSS `print:` (layout.tsx del grupo
 * `(student)` oculta nav/tab-bar) alcanza para un documento de una sola
 * página. Si en el futuro hace falta firmarlo o versionarlo, ahí sí vale
 * la pena una librería real.
 *
 * No hay `completed_at` en `enrollments` (ver 0001_schema.sql) — la fecha
 * que se muestra es la de emisión del certificado (hoy), no la fecha real
 * en que se llegó al 100 %. Es una limitación conocida, no un bug: agregar
 * la fecha real de finalización es un cambio de esquema aparte.
 */
export function CertificateView({ courseId, studentName }: CertificateViewProps) {
  const { data: courses, isPending } = useMyCourses();
  const course = courses?.find((c) => c.id === courseId);

  if (isPending) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-8 lg:px-[30px] lg:py-12">
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="No encontramos ese curso"
          description="Puede que ya no estés matriculado, o el enlace esté mal escrito."
        />
      </div>
    );
  }

  if (course.progress < 100) {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-8 lg:px-[30px] lg:py-12">
        <EmptyState
          title="Todavía no completaste este curso"
          description={`Llevas ${Math.round(course.progress)} % de “${course.name}”. El certificado se habilita al llegar al 100 %.`}
        />
        <Link
          href={ROUTES.student.curso}
          className="mt-4 flex w-fit items-center gap-1.5 text-tiny font-bold text-fg-dim hover:text-fg"
        >
          <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
          Volver a mis cursos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-8 lg:px-[30px] lg:py-12 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={ROUTES.student.curso}
          className="flex items-center gap-1.5 text-tiny font-bold text-fg-dim hover:text-fg"
        >
          <ArrowLeft aria-hidden size={14} strokeWidth={2.4} />
          Volver a mis cursos
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer aria-hidden size={14} strokeWidth={2.4} />
          Descargar PDF
        </Button>
      </div>

      <div className="rounded-2xl border-[3px] border-double border-line-strong bg-surface p-8 shadow-card print:border-2 print:border-solid print:border-fg print:p-10 print:shadow-none sm:p-12">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={32} />
          <p className="mt-4 text-tiny font-bold uppercase tracking-eyebrow text-fg-faint">
            Certificado de finalización
          </p>

          <p className="mt-7 text-body-sm font-semibold text-fg-soft">Se certifica que</p>
          <h1 className="mt-2 text-display-sm font-extrabold tracking-display text-fg text-balance sm:text-display">
            {studentName || 'Estudiante'}
          </h1>
          <p className="mt-4 text-body-sm font-semibold text-fg-soft">completó satisfactoriamente el curso</p>
          <h2 className="mt-1.5 text-title-lg font-bold text-brand text-balance">{course.name}</h2>

          <p className="mt-5 text-tiny font-bold text-fg-ghost">Nivel {course.level}</p>

          <div className="mt-8 flex w-full items-center justify-between border-t border-line pt-5">
            <p className="text-tiny font-semibold text-fg-faint">Emitido el {formatIssueDate()}</p>
            <p className="text-tiny font-bold text-fg-dim">{APP_NAME}</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <CourseRatingWidget courseId={courseId} courseName={course.name} />
      </div>
    </div>
  );
}
