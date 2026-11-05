// Where students study: the lesson itself, the course outline, and progress controls.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import LessonVideo from '../components/LessonVideo';
import Markdown from '../components/Markdown';
import ProgressBar from '../components/ProgressBar';
import { EmptyState, ErrorBanner, ErrorState, LoadingState } from '../components/StatusViews';
import { useFetch } from '../hooks/useFetch';

export default function LessonPage() {
  const { courseId, lessonId } = useParams();

  const courseQuery = useFetch(`/courses/${courseId}`);
  const lessonQuery = useFetch(`/courses/${courseId}/lessons/${lessonId}`);

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Instructors previewing their own course have no enrollment, so nothing is recorded.
  const enrollment = courseQuery.data?.enrollment;
  const isEnrolled = Boolean(enrollment);

  // Remember this lesson for "continue where you left off". If this fails the student
  // can still study, so we don't interrupt them with an error.
  useEffect(() => {
    if (!isEnrolled) return;
    api.put(`/progress/${courseId}/lessons/${lessonId}/access`).catch(() => {});
  }, [courseId, lessonId, isEnrolled]);

  // Start each lesson with a clean slate.
  useEffect(() => {
    setActionError(null);
    window.scrollTo(0, 0);
  }, [lessonId]);

  if (courseQuery.loading || lessonQuery.loading) return <LoadingState label="Loading lesson..." />;

  // Not being enrolled is expected, so offer a way forward rather than just an error.
  if (lessonQuery.error?.status === 403) {
    return (
      <EmptyState
        title="Enroll to open this lesson"
        message={lessonQuery.error.message}
        actionLabel="View course"
        actionTo={`/courses/${courseId}`}
      />
    );
  }
  if (lessonQuery.error?.status === 404 || courseQuery.error?.status === 404) {
    return (
      <EmptyState
        title="Lesson not found"
        message="This lesson may have been removed by the instructor."
        actionLabel="Back to course"
        actionTo={`/courses/${courseId}`}
      />
    );
  }
  if (courseQuery.error) return <ErrorState error={courseQuery.error} onRetry={courseQuery.reload} />;
  if (lessonQuery.error) return <ErrorState error={lessonQuery.error} onRetry={lessonQuery.reload} />;

  const { course } = courseQuery.data;
  const { lesson } = lessonQuery.data;

  const completed = new Set(enrollment?.completedLessons || []);
  const isComplete = completed.has(lesson._id);

  const index = course.lessons.findIndex((item) => item._id === lesson._id);
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];

  async function toggleComplete() {
    setSaving(true);
    setActionError(null);
    const url = `/progress/${courseId}/lessons/${lessonId}/complete`;
    try {
      await (isComplete ? api.delete(url) : api.post(url));
      courseQuery.reload(); // refreshes the checkmarks and the progress bar
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside className="order-2 lg:order-1 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-4">
          <Link to={`/courses/${courseId}`} className="font-display font-semibold hover:underline">
            {course.title}
          </Link>
          {enrollment && (
            <div className="mt-3">
              <ProgressBar percent={enrollment.progressPercent} />
            </div>
          )}
          <nav aria-label="Lessons in this course">
            <ol className="mt-3 space-y-1">
              {course.lessons.map((item) => (
                <li key={item._id}>
                  <Link
                    to={`/courses/${courseId}/lessons/${item._id}`}
                    aria-current={item._id === lesson._id ? 'page' : undefined}
                    className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                      item._id === lesson._id ? 'bg-track font-medium' : 'hover:bg-paper'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-4 shrink-0 text-center ${completed.has(item._id) ? 'text-success' : 'text-muted'}`}
                    >
                      {completed.has(item._id) ? '✓' : item.order}
                    </span>
                    <span>
                      {item.title}
                      {completed.has(item._id) && <span className="sr-only"> (completed)</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </aside>

      <article className="order-1 min-w-0 space-y-6 lg:order-2">
        {!enrollment && (
          <p className="rounded-lg bg-track px-3 py-2 text-sm">
            You're previewing this lesson. Progress isn't recorded for instructors.
          </p>
        )}

        <div>
          <p className="text-sm text-muted">
            Lesson {lesson.order} of {course.lessons.length}
          </p>
          <h1 className="page-title mt-1">{lesson.title}</h1>
        </div>

        <LessonVideo url={lesson.videoUrl} title={lesson.title} />

        <div className="card p-6">
          <Markdown>{lesson.content}</Markdown>
        </div>

        {enrollment?.progressPercent === 100 && (
          <p className="rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success">
            Congratulations! You've completed this course.
          </p>
        )}

        <ErrorBanner message={actionError} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {previous ? (
            <Link to={`/courses/${courseId}/lessons/${previous._id}`} className="btn-secondary">
              ← Previous
            </Link>
          ) : (
            <span />
          )}

          <div className="flex flex-wrap gap-3">
            {enrollment && (
              <button
                type="button"
                disabled={saving}
                onClick={toggleComplete}
                className={isComplete ? 'btn-secondary' : 'btn-primary'}
              >
                {saving ? 'Saving...' : isComplete ? '✓ Completed (undo)' : 'Mark as complete'}
              </button>
            )}
            {next && (
              <Link to={`/courses/${courseId}/lessons/${next._id}`} className="btn-secondary">
                Next →
              </Link>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
