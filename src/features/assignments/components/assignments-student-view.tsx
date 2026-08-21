'use client';

import { useEffect, useRef, useState } from 'react';

import { AssignmentDetailDialog } from '@/components/student/assignment-detail-dialog';
import { AssignmentList } from '@/components/student/assignment-list';
import { CoursePickerCard } from '@/components/student/course-picker-card';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { useModules } from '@/features/content/hooks/use-content-blocks';
import { useMyCourses } from '@/features/learning/hooks/use-learning';
import { backend } from '@/services';
import { useMutation } from '@tanstack/react-query';
import type { Assignment, AssignmentSubmission } from '@/types';
import {
  useDeleteMySubmission,
  useMyAssignments,
  useMySubmission,
  useSubmitAssignment,
} from '../hooks/use-assignments';

export function AssignmentsStudentView() {
  const { data: courses, isPending: isCoursesPending } = useMyCourses();
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const syncedCourses = useRef(false);
  useEffect(() => {
    if (!courses || syncedCourses.current) return;
    syncedCourses.current = true;
    if (courses.length === 1) setSelectedCourseId(courses[0]!.id);
  }, [courses]);

  const course = courses?.find((c) => c.id === selectedCourseId);
  const { data: modules } = useModules(selectedCourseId);
  const { data: assignments, isPending: isAssignmentsPending } = useMyAssignments(selectedCourseId);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const { data: submission } = useMySubmission(selectedAssignment?.id ?? '');
  const submitAssignment = useSubmitAssignment(selectedAssignment?.id ?? '');
  const deleteSubmission = useDeleteMySubmission(selectedAssignment?.id ?? '');

  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);
  const fileUrlMutation = useMutation({
    mutationFn: (mediaKey: string) => backend.content.getFileUrl(mediaKey),
  });
  // `fileUrlMutation` es una sola instancia compartida entre el adjunto del
  // docente y la propia entrega: sin este ref, abrir la tarea A (lenta) y
  // luego la B antes de que A resuelva podía pisar la URL de B con la de A.
  const attachmentRequestRef = useRef<string | null>(null);
  const submissionRequestRef = useRef<string | null>(null);

  const openAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setAttachmentUrl(null);
    setSubmissionUrl(null);
    attachmentRequestRef.current = assignment.id;
    if (assignment.mediaKey) {
      fileUrlMutation.mutate(assignment.mediaKey, {
        onSuccess: (url) => {
          if (attachmentRequestRef.current === assignment.id) setAttachmentUrl(url);
        },
      });
    }
  };

  useEffect(() => {
    if (submission) {
      submissionRequestRef.current = submission.id;
      fileUrlMutation.mutate(submission.mediaKey, {
        onSuccess: (url) => {
          if (submissionRequestRef.current === submission.id) setSubmissionUrl(url);
        },
      });
    } else {
      submissionRequestRef.current = null;
      setSubmissionUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id]);

  if (isCoursesPending) {
    return (
      <div className="flex flex-col gap-2.5 px-5 py-6 lg:px-[30px]">
        <Skeleton className="h-16 rounded-3xl" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="px-5 py-10 lg:px-[30px]">
        <EmptyState title="Todavía no estás matriculado en ningún curso" description="" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-[30px]">
        <h1 className="text-title-lg font-extrabold text-fg">Elegí un curso</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CoursePickerCard key={c.id} course={c} onSelect={() => setSelectedCourseId(c.id)} />
          ))}
        </div>
      </div>
    );
  }

  const submissionMap = new Map<string, AssignmentSubmission>();
  if (selectedAssignment && submission) submissionMap.set(selectedAssignment.id, submission);

  const assignmentsByModule = new Map<string, Assignment[]>();
  for (const assignment of assignments ?? []) {
    const list = assignmentsByModule.get(assignment.moduleId) ?? [];
    list.push(assignment);
    assignmentsByModule.set(assignment.moduleId, list);
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-6 lg:px-[30px]">
      <div>
        <h1 className="text-title-lg font-extrabold text-fg">Tareas</h1>
        <p className="mt-0.5 text-body-sm font-semibold text-fg-ghost">{course.name}</p>
      </div>

      {isAssignmentsPending && <LoadingRegion label="Cargando tareas" />}

      {!isAssignmentsPending && (!assignments || assignments.length === 0) && (
        <EmptyState title="Sin tareas todavía" description="Tu docente todavía no asignó ninguna tarea en este curso." />
      )}

      {!isAssignmentsPending &&
        modules?.map((module) => {
          const moduleAssignments = assignmentsByModule.get(module.id);
          if (!moduleAssignments || moduleAssignments.length === 0) return null;
          return (
            <Card key={module.id} padding="sm" radius="xl">
              <p className="px-2 pb-1 pt-1 text-tiny font-extrabold tracking-eyebrow text-fg-ghost">
                {module.title.toUpperCase()}
              </p>
              <AssignmentList
                assignments={moduleAssignments}
                submissionByAssignmentId={submissionMap}
                onSelect={openAssignment}
              />
            </Card>
          );
        })}

      <AssignmentDetailDialog
        open={selectedAssignment !== null}
        onOpenChange={(open) => !open && setSelectedAssignment(null)}
        assignment={selectedAssignment}
        courseId={selectedCourseId}
        submission={submission}
        attachmentUrl={attachmentUrl}
        submissionUrl={submissionUrl}
        submitPending={submitAssignment.isPending}
        deletePending={deleteSubmission.isPending}
        onSubmit={(input) => submitAssignment.mutate(input)}
        onDelete={(submissionId) => deleteSubmission.mutate(submissionId)}
      />
    </div>
  );
}
