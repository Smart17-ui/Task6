// The instructor's home: their courses, with enrollment counts and average progress.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ProgressBar from '../components/ProgressBar';
import StatTile from '../components/StatTile';
import { EmptyState, ErrorBanner, ErrorState, LoadingState } from '../components/StatusViews';
import { useFetch } from '../hooks/useFetch';
import { pluralize } from '../utils/format';

export function StatusBadge({ isPublished }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isPublished ? 'bg-success-soft text-success' : 'bg-track text-muted'
      }`}
    >
      {isPublished ? 'Published' : 'Draft'}
    </span>
  );
}

export default function InstructorDashboardPage() {
  const { data, loading, error, reload } = useFetch('/courses/managed');
  const [actionError, setActionError] = useState(null);

  if (loading) return <LoadingState label="Loading your courses..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { courses } = data;
  const totalStudents = courses.reduce((sum, course) => sum + course.enrollmentCount, 0);
  const publishedCount = courses.filter((course) => course.isPublished).length;

  // Weight by enrollment so a course with one student doesn't count as much as one with 100.
  const totalProgress = courses.reduce(
    (sum, course) => sum + course.averageProgress * course.enrollmentCount,
    0
  );
  const overallAverage = totalStudents ? Math.round(totalProgress / totalStudents) : 0;

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `Delete "${course.title}"? Its lessons and all student progress will be permanently removed.`
    );
    if (!confirmed) return;

    setActionError(null);
    try {
      await api.delete(`/courses/${course._id}`);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Instructor dashboard</h1>
        <Link to="/instructor/courses/new" className="btn-primary">
          New course
        </Link>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="You haven't created a course yet"
          message="Create your first course, add some lessons, and publish it when you're ready."
          actionLabel="Create a course"
          actionTo="/instructor/courses/new"
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatTile label="Courses" value={courses.length} />
            <StatTile label="Published" value={publishedCount} />
            <StatTile label="Enrolled students" value={totalStudents} />
            <StatTile label="Average progress" value={`${overallAverage}%`} />
          </div>

          <ErrorBanner message={actionError} />

          <ul className="space-y-4">
            {courses.map((course) => (
              <li key={course._id} className="card grid gap-4 p-4 md:grid-cols-[1fr_12rem_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/courses/${course._id}`} className="font-display text-lg font-semibold hover:underline">
                      {course.title}
                    </Link>
                    <StatusBadge isPublished={course.isPublished} />
                  </div>
                  <p className="text-sm text-muted">
                    {pluralize(course.lessonCount, 'lesson')} · {pluralize(course.enrollmentCount, 'student')}
                  </p>
                </div>

                {course.enrollmentCount > 0 ? (
                  <ProgressBar percent={course.averageProgress} label="Average progress" />
                ) : (
                  <p className="text-sm text-muted">No students yet</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link to={`/instructor/courses/${course._id}/edit`} className="btn-secondary">
                    Edit
                  </Link>
                  <Link to={`/instructor/courses/${course._id}/students`} className="btn-secondary">
                    Students
                  </Link>
                  <button type="button" onClick={() => handleDelete(course)} className="btn-danger">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
