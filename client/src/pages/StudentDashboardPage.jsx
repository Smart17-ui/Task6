// The student's home: courses in progress, completed courses, and recent activity.
import { Link } from 'react-router-dom';
import CourseThumbnail from '../components/CourseThumbnail';
import ProgressBar from '../components/ProgressBar';
import StatTile from '../components/StatTile';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import { useFetch } from '../hooks/useFetch';
import { formatDate, pluralize } from '../utils/format';

function EnrollmentCard({ enrollment }) {
  const { course, continueLesson, progressPercent, completedCount, totalLessons } = enrollment;

  return (
    <div className="card flex flex-col overflow-hidden sm:flex-row">
      <CourseThumbnail course={course} className="aspect-video w-full sm:aspect-auto sm:w-44 sm:shrink-0" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Link to={`/courses/${course._id}`} className="font-display text-lg font-semibold hover:underline">
            {course.title}
          </Link>
          <p className="text-xs text-muted">
            {completedCount} of {pluralize(totalLessons, 'lesson')} complete
          </p>
        </div>
        <ProgressBar percent={progressPercent} />
        {continueLesson && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-muted">Pick up at: {continueLesson.title}</p>
            <Link to={`/courses/${course._id}/lessons/${continueLesson._id}`} className="btn-primary">
              Continue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CompletedRow({ enrollment }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <Link to={`/courses/${enrollment.course._id}`} className="font-medium hover:underline">
        {enrollment.course.title}
      </Link>
      <span className="text-muted">
        <span className="text-success" aria-hidden="true">✓ </span>
        Completed {formatDate(enrollment.completedAt)}
      </span>
    </li>
  );
}

// Turn an activity entry into a sentence.
function describeActivity(item) {
  if (item.type === 'enrolled') return 'Enrolled in the course';
  if (item.type === 'course_completed') return 'Completed the course';
  return `Completed "${item.lessonTitle}"`;
}

export default function StudentDashboardPage() {
  const enrollmentsQuery = useFetch('/enrollments/me');
  const activityQuery = useFetch('/progress/activity');

  if (enrollmentsQuery.loading) return <LoadingState label="Loading your courses..." />;
  if (enrollmentsQuery.error) {
    return <ErrorState error={enrollmentsQuery.error} onRetry={enrollmentsQuery.reload} />;
  }

  const { enrollments } = enrollmentsQuery.data;
  const inProgress = enrollments.filter((enrollment) => !enrollment.completedAt);
  const completed = enrollments.filter((enrollment) => enrollment.completedAt);
  const lessonsDone = enrollments.reduce((sum, enrollment) => sum + enrollment.completedCount, 0);

  if (enrollments.length === 0) {
    return (
      <div>
        <h1 className="page-title mb-6">My learning</h1>
        <EmptyState
          title="You haven't enrolled in any courses yet"
          message="Find a course that interests you and start your first lesson today."
          actionLabel="Browse courses"
          actionTo="/courses"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="page-title">My learning</h1>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile label="In progress" value={inProgress.length} />
        <StatTile label="Completed" value={completed.length} />
        <StatTile label="Lessons finished" value={lessonsDone} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">Continue learning</h2>
            {inProgress.length === 0 ? (
              <EmptyState
                title="Nothing in progress"
                message="You've finished everything you started. Time for something new?"
                actionLabel="Browse courses"
                actionTo="/courses"
              />
            ) : (
              <div className="space-y-4">
                {inProgress.map((enrollment) => (
                  <EnrollmentCard key={enrollment._id} enrollment={enrollment} />
                ))}
              </div>
            )}
          </section>

          {completed.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Completed courses</h2>
              <ul className="card divide-y divide-line">
                {completed.map((enrollment) => (
                  <CompletedRow key={enrollment._id} enrollment={enrollment} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Recent activity</h2>
          <div className="card p-4">
            {activityQuery.loading && <p className="text-sm text-muted">Loading activity...</p>}
            {activityQuery.error && (
              <p className="text-sm text-danger">Couldn't load your recent activity.</p>
            )}
            {activityQuery.data?.activity.length === 0 && (
              <p className="text-sm text-muted">No activity yet.</p>
            )}
            {activityQuery.data && (
              <ul className="space-y-3">
                {activityQuery.data.activity.map((item, index) => (
                  <li key={`${item.at}-${index}`} className="text-sm">
                    <p>{describeActivity(item)}</p>
                    <p className="text-xs text-muted">
                      <Link to={`/courses/${item.course._id}`} className="hover:underline">
                        {item.course.title}
                      </Link>{' '}
                      · {formatDate(item.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
