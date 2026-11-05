// A course's public page: its description, lesson outline, and enroll controls.
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import CourseThumbnail from '../components/CourseThumbnail';
import ProgressBar from '../components/ProgressBar';
import { EmptyState, ErrorBanner, ErrorState, LoadingState } from '../components/StatusViews';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { capitalize, pluralize } from '../utils/format';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data, loading, error, reload } = useFetch(`/courses/${courseId}`);
  const [actionError, setActionError] = useState(null);
  const [working, setWorking] = useState(false);

  if (loading) return <LoadingState label="Loading course..." />;
  if (error) {
    if (error.status === 404) {
      return (
        <EmptyState
          title="Course not found"
          message="This course doesn't exist or isn't available right now."
          actionLabel="Browse courses"
          actionTo="/courses"
        />
      );
    }
    return <ErrorState error={error} onRetry={reload} />;
  }

  const { course, canManage, enrollment } = data;
  const canOpenLessons = Boolean(enrollment) || canManage;
  const completed = new Set(enrollment?.completedLessons || []);

  // Run an enroll/unenroll request with shared loading and error handling.
  async function runAction(action) {
    setActionError(null);
    setWorking(true);
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setWorking(false);
    }
  }

  const enroll = () => runAction(() => api.post('/enrollments', { courseId }));

  const unenroll = () => {
    const confirmed = window.confirm(
      `Leave "${course.title}"? Your progress in this course will be deleted.`
    );
    if (confirmed) runAction(() => api.delete(`/enrollments/${courseId}`));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-muted">
            {course.category} · {capitalize(course.level)}
            {!course.isPublished && ' · Draft'}
          </p>
          <h1 className="page-title mt-1">{course.title}</h1>
          <p className="mt-1 text-sm text-muted">Taught by {course.instructor?.name}</p>
          <p className="mt-4 whitespace-pre-line">{course.description}</p>
        </div>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            Course outline <span className="font-sans text-sm font-normal text-muted">({pluralize(course.lessons.length, 'lesson')})</span>
          </h2>

          {course.lessons.length === 0 ? (
            <EmptyState title="No lessons yet" message="Lessons will appear here once they're added." />
          ) : (
            <ol className="card divide-y divide-line">
              {course.lessons.map((lesson) => {
                const isDone = completed.has(lesson._id);
                const row = (
                  <>
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        isDone ? 'bg-success-soft text-success' : 'bg-track text-muted'
                      }`}
                    >
                      {isDone ? '✓' : lesson.order}
                    </span>
                    <span className="flex-1">
                      {lesson.title}
                      {isDone && <span className="sr-only"> (completed)</span>}
                    </span>
                    {lesson.hasVideo && <span className="text-xs text-muted">Video</span>}
                    {!canOpenLessons && <span className="text-xs text-muted">Locked</span>}
                  </>
                );

                return (
                  <li key={lesson._id}>
                    {canOpenLessons ? (
                      <Link
                        to={`/courses/${courseId}/lessons/${lesson._id}`}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 text-sm">{row}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card overflow-hidden">
          <CourseThumbnail course={course} className="aspect-video w-full" />
          <div className="space-y-3 p-4">
            <ErrorBanner message={actionError} />

            {/* Visitors who aren't logged in */}
            {!user && (
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => navigate('/login', { state: { from: location.pathname } })}
              >
                Log in to enroll
              </button>
            )}

            {/* Students not yet enrolled */}
            {user?.role === 'student' && !enrollment && (
              <button type="button" disabled={working} onClick={enroll} className="btn-primary w-full">
                {working ? 'Enrolling...' : 'Enroll for free'}
              </button>
            )}

            {/* Enrolled students */}
            {enrollment && (
              <>
                <ProgressBar percent={enrollment.progressPercent} label="Your progress" />
                {enrollment.continueLesson && (
                  <Link
                    to={`/courses/${courseId}/lessons/${enrollment.continueLesson._id}`}
                    className="btn-primary w-full"
                  >
                    {enrollment.progressPercent === 100 ? 'Review course' : 'Continue learning'}
                  </Link>
                )}
                {enrollment.continueLesson && enrollment.progressPercent < 100 && (
                  <p className="text-xs text-muted">Next up: {enrollment.continueLesson.title}</p>
                )}
                <button type="button" disabled={working} onClick={unenroll} className="btn-secondary w-full">
                  Leave course
                </button>
              </>
            )}

            {/* The course's instructor, or an admin */}
            {canManage && (
              <>
                <Link to={`/instructor/courses/${courseId}/edit`} className="btn-primary w-full">
                  Edit course
                </Link>
                <Link to={`/instructor/courses/${courseId}/students`} className="btn-secondary w-full">
                  View students
                </Link>
              </>
            )}

            {/* Other instructors and admins can't enroll, so tell them why. */}
            {user && user.role !== 'student' && !canManage && (
              <p className="text-sm text-muted">Only student accounts can enroll in courses.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
