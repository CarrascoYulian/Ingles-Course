'use client';

import { Dancing_Script } from 'next/font/google';
import { ArrowLeft, ArrowRight, Lock, Printer, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';
import { CourseRatingWidget } from './course-rating-widget';
import { useMyCourses, useMyProgress } from '../hooks/use-learning';

export interface CertificateViewProps {
  courseId: string;
  studentName: string;
}

/**
 * Fuente cursiva sólo para el nombre del alumno en el certificado — el resto
 * de la plataforma se queda en Plus Jakarta Sans (ver layout.tsx). Autoalojada
 * por next/font igual que la fuente principal: sin petición a Google en runtime.
 */
const dancingScript = Dancing_Script({
  subsets: ['latin', 'latin-ext'],
  weight: ['700'],
  display: 'swap',
});

/**
 * El certificado no tiene hoy un campo de "profesor del curso" en el modelo
 * de datos — es una decisión de producto pendiente (ver conversación de
 * diseño), no un bug. Mientras no exista ese campo, el nombre queda fijo.
 */
const CERTIFICATE_SIGNATORY = { name: 'Robertho Lajoe', role: 'Profesor' };

function formatIssueDate(): string {
  return new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function CertificateFlagBadge({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 76" className={className}>
      <rect width="120" height="76" fill="#b22234" />
      <g fill="#fff">
        <rect y="5.8" width="120" height="5.8" />
        <rect y="17.5" width="120" height="5.8" />
        <rect y="29.2" width="120" height="5.8" />
        <rect y="40.8" width="120" height="5.8" />
        <rect y="52.5" width="120" height="5.8" />
        <rect y="64.2" width="120" height="5.8" />
      </g>
      <rect width="52" height="41" fill="#16204a" />
      <g fill="#fff">
        {[7, 14, 21, 28, 35].map((cy, row) =>
          (row % 2 === 0 ? [8, 19, 30, 41] : [13, 24, 35, 46]).map((cx) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" />
          )),
        )}
      </g>
    </svg>
  );
}

function CertificateMedal({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 130 190" className={className}>
      <defs>
        <radialGradient id="certificateMedalGold" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fbe089" />
          <stop offset="55%" stopColor="#e8b23d" />
          <stop offset="100%" stopColor="#a9700f" />
        </radialGradient>
      </defs>
      <path d="M40 70 L18 178 L65 148 L112 178 L90 70 Z" fill="#b22234" />
      <path d="M48 74 L30 168 L65 146 Z" fill="#8f1a29" />
      <path d="M82 74 L100 168 L65 146 Z" fill="#8f1a29" />
      <circle cx="65" cy="60" r="58" fill="#b22234" />
      <circle cx="65" cy="60" r="58" fill="none" stroke="#8f1a29" strokeWidth="2" />
      <circle cx="65" cy="60" r="46" fill="url(#certificateMedalGold)" stroke="#fff" strokeWidth="3" />
      <g stroke="#a9700f" strokeWidth="1" opacity="0.55">
        <line x1="65" y1="14" x2="65" y2="106" />
        <line x1="19" y1="60" x2="111" y2="60" />
        <line x1="33" y1="28" x2="97" y2="92" />
        <line x1="97" y1="28" x2="33" y2="92" />
      </g>
      <circle cx="65" cy="60" r="34" fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="2.4 4" opacity="0.85" />
      <path
        d="M65 38 L71 54 L88 56 L75 67 L79 84 L65 75 L51 84 L55 67 L42 56 L59 54 Z"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * Certificado como PDF vía impresión del navegador.
 * Sólo se habilita cuando el alumno ha completado el 100 % del curso
 * y aprobado todas sus evaluaciones.
 */
export function CertificateView({ courseId, studentName }: CertificateViewProps) {
  const { data: courses, isPending: isCoursesPending } = useMyCourses();
  const { data: progress, isPending: isProgressPending } = useMyProgress(courseId);

  const course = courses?.find((c) => c.id === courseId);
  const isPending = isCoursesPending || isProgressPending;

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
          action={
            <Button asChild size="md" className="font-extrabold">
              <Link href={ROUTES.student.curso}>Volver a mis cursos</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const effectiveProgress = progress ? progress.percent : Math.round(course.progress);
  const isCompleted = effectiveProgress >= 100;

  if (!isCompleted) {
    return (
      <div className="mx-auto max-w-[760px] px-5 py-10 lg:px-[30px] lg:py-16">
        <Card
          radius="2xl"
          padding="none"
          className="relative overflow-hidden border border-amber-200/90 dark:border-amber-700/60 bg-white dark:bg-slate-900 p-6 shadow-xl sm:p-10"
        >
          {/* Fondo sutil decorativo */}
          <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-amber-100/50 dark:bg-amber-950/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-blue-100/50 dark:bg-blue-950/30 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="grid size-18 place-items-center rounded-3xl bg-amber-100/80 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 shadow-inner">
              <Lock aria-hidden className="size-9" />
            </div>

            <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-700/60 px-3 py-1 text-micro font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-200">
              <ShieldAlert aria-hidden className="size-3.5" />
              Certificado Oficial Protegido
            </span>

            <h1 className="mt-3 text-heading font-black tracking-tight text-slate-900 dark:text-white sm:text-heading-lg">
              Aún no has completado este curso
            </h1>

            <p className="mt-2.5 max-w-lg text-body-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:text-body">
              Para obtener y descargar tu certificado oficial de{' '}
              <strong className="font-extrabold text-slate-900 dark:text-white">“{course.name}”</strong>, debes completar el 100% de
              todos los módulos, lecciones y evaluaciones correspondientes.
            </p>

            <div className="mt-7 w-full max-w-md rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-caption font-extrabold text-slate-700 dark:text-slate-200">Tu progreso actual</span>
                <span className="text-caption font-black text-brand dark:text-blue-400 tabular-nums">{effectiveProgress}%</span>
              </div>

              <Progress
                value={effectiveProgress}
                height={8}
                tone="accent"
                className="mt-2.5"
                label="Progreso hacia el certificado"
              />

              <p className="mt-3 text-micro font-bold text-slate-500 dark:text-slate-400">
                Te falta un {Math.max(0, 100 - effectiveProgress)}% para desbloquear la descarga e impresión en PDF.
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button asChild size="lg" variant="glow" className="w-full sm:w-auto font-black gap-2 shadow-glow">
                <Link href={ROUTES.student.curso}>
                  <span>Continuar aprendiendo</span>
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto font-extrabold">
                <Link href={ROUTES.student.curso}>
                  <ArrowLeft aria-hidden className="size-4" />
                  <span>Volver al panel</span>
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[980px] px-5 py-8 lg:px-[30px] lg:py-12 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={ROUTES.student.curso}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-caption font-extrabold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:border-brand/40 hover:text-brand"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Volver a mis cursos
        </Link>
        <div className="flex items-center gap-2.5">
          <Button
            size="md"
            variant="glass"
            onClick={() => {
              const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
              window.open(shareUrl, '_blank');
            }}
            className="font-extrabold gap-2 text-blue-700 border-blue-200"
          >
            Compartir en LinkedIn
          </Button>
          <Button size="md" variant="glow" onClick={() => window.print()} className="font-extrabold gap-2">
            <Printer aria-hidden className="size-4" />
            Descargar / Imprimir PDF
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-[18px] bg-[#16204a] p-4 shadow-[0_30px_70px_rgb(10_15_30_/_0.35),0_2px_6px_rgb(10_15_30_/_0.15)] sm:p-[34px]',
          'print:h-[100vh] print:w-full print:rounded-none print:shadow-none',
        )}
      >
        <Image
          src="/branding/certificate-books-icon.png"
          alt=""
          aria-hidden
          width={300}
          height={247}
          className="pointer-events-none absolute left-1 top-1 z-[3] h-[84px] w-[102px] object-contain drop-shadow-[0_4px_8px_rgba(10,15,30,0.3)] sm:left-2 sm:top-2 sm:h-[148px] sm:w-[180px]"
        />
        <Image
          src="/branding/certificate-globe-icon.png"
          alt=""
          aria-hidden
          width={300}
          height={300}
          className="pointer-events-none absolute bottom-1 right-1 z-[3] size-[84px] object-contain drop-shadow-[0_4px_8px_rgba(10,15,30,0.3)] sm:bottom-2 sm:right-2 sm:size-[148px]"
        />

        <div className="relative rounded-[4px] border-2 border-[#b22234] bg-white px-5 py-12 text-center sm:px-[60px] sm:py-14">
          <CertificateFlagBadge className="absolute -top-3.5 left-1/2 z-[4] h-[46px] w-[72px] -translate-x-1/2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)] sm:-top-[18px] sm:h-[58px] sm:w-[92px]" />
          <CertificateMedal className="absolute -top-3 right-3 z-[4] w-[84px] drop-shadow-[0_8px_14px_rgba(0,0,0,0.3)] sm:-top-4 sm:right-7 sm:w-[130px]" />

          <div className="relative z-[2]">
            <span className="inline-block text-[11.5px] font-extrabold uppercase tracking-badge text-[#16204a] opacity-75">
              Bertho Community English
            </span>

            <h1 className="mt-4 text-[clamp(34px,7vw,70px)] font-extrabold tracking-tight text-[#16204a]">
              CERTIFICADO
            </h1>

            <p className="mx-auto mt-1.5 max-w-[620px] text-body-sm font-semibold leading-normal text-fg-body sm:text-title-xs">
              Completó satisfactoriamente el curso{' '}
              <strong className="font-extrabold">{course.name}</strong>
            </p>

            <h2
              className={cn(
                dancingScript.className,
                'mt-2 text-[clamp(36px,7vw,68px)] font-bold leading-none text-[#16204a]',
              )}
            >
              {studentName || 'Estudiante'}
            </h2>

            <div className="mt-6 inline-block">
              <div className="text-title-xs font-extrabold text-fg">{CERTIFICATE_SIGNATORY.name}</div>
              <div className="mt-1.5 h-[1.5px] bg-[#16204a] opacity-55" />
              <div className="mt-1.5 text-body-sm font-semibold text-fg-faint">{CERTIFICATE_SIGNATORY.role}</div>
            </div>

            <p className="mt-4 text-body-sm font-bold text-fg-body">Emitido el {formatIssueDate()}</p>

            <Image
              src="/branding/bertho-community-logo.png"
              alt="Bertho Community English"
              width={300}
              height={300}
              className="mx-auto mt-3.5 h-[84px] w-auto"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 print:hidden">
        <CourseRatingWidget courseId={courseId} courseName={course.name} />
      </div>
    </div>
  );
}
