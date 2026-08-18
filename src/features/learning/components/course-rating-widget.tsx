'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useMyCourseRating, useSubmitCourseRating } from '../hooks/use-learning';

export interface CourseRatingWidgetProps {
  courseId: string;
  courseName: string;
}

/**
 * Sólo el docente ve el promedio/reseñas (decisión del cliente, 16 ago
 * 2026) — este widget es puramente "mandar mi calificación", nunca muestra
 * la de otros alumnos. Se ofrece en el certificado porque es el momento
 * natural en que el alumno ya terminó el curso de verdad.
 */
export function CourseRatingWidget({ courseId, courseName }: CourseRatingWidgetProps) {
  const { data: existing, isPending } = useMyCourseRating(courseId);
  const submit = useSubmitCourseRating(courseId);
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [review, setReview] = useState('');

  useEffect(() => {
    if (existing) {
      setStars(existing.stars);
      setReview(existing.review ?? '');
    }
  }, [existing]);

  if (isPending) return null;

  return (
    <Card padding="lg" radius="xl" className="print:hidden">
      <h2 className="text-body-lg font-bold text-fg">
        {existing ? 'Tu calificación' : `Calificá “${courseName}”`}
      </h2>
      <p className="mt-1 text-tiny font-semibold text-fg-ghost">
        Sólo tu docente ve esto — no se muestra a otros estudiantes.
      </p>

      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} estrella${value > 1 ? 's' : ''}`}
            onClick={() => setStars(value)}
            onMouseEnter={() => setHoverStars(value)}
            onMouseLeave={() => setHoverStars(0)}
            className="cursor-pointer text-warning"
          >
            <Star
              aria-hidden
              size={26}
              strokeWidth={1.8}
              fill={(hoverStars || stars) >= value ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={review}
        onChange={(event) => setReview(event.target.value)}
        placeholder="¿Algo que quieras contarle a tu docente sobre el curso? (opcional)"
        className={cn('mt-3')}
      />

      <Button
        size="md"
        className="mt-3 font-extrabold"
        disabled={stars === 0 || submit.isPending}
        onClick={() => submit.mutate({ stars, review })}
      >
        {submit.isPending ? 'Enviando…' : existing ? 'Actualizar calificación' : 'Enviar calificación'}
      </Button>
    </Card>
  );
}
