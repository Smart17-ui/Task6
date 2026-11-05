// The student's home. Its main job is getting them back into their course, so that
// comes first and largest. Everything else supports it.
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import CourseThumbnail from '../components/CourseThumbnail';
import ProgressBar from '../components/ProgressBar';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/StatusViews';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { formatDate, groupByDay, pluralize, timeAgo } from '../utils/format';

// How many other courses to suggest at the bottom of the page.
const SUGGESTION_COUNT = 3;

// How many recent activity items to show, so the side column stays a sensible length.
const ACTIVITY_SHOWN = 5;

const lessonUrl = (courseId, lesson) => `/courses/${courseId}/lessons/${lesson._id}`;

// The most recently studied course, shown large with one clear action.
function ResumeCard({ enrollment }) {
  const { course, continueLesson, progressPercent, completedCount, totalLessons, lastAccessedAt } = enrollment;

  return (
    <section aria-labelledby="resume-heading" className="card overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <CourseThumbnail course={course} className="aspect-video h-full w-full md:aspect-auto" />
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 id="resume-heading" className="text-sm font-medium text-muted font-sans">
              Continue where you left off
            </h2>
            <Link to={`/courses/${course._id}`} className="mt-1 block font-display text-2xl font-semibold hover:underline">
              {course.title}
            </Link>
          </div>

          <ProgressBar percent={progressPercent} label={`${completedCount} of ${pluralize(totalLessons, 'lesson')} complete`} />

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              {continueLesson && <p className="font-medium">Next up: {continueLesson.title}</p>}
              <p className="text-muted">
                {lastAccessedAt ? `Last studied ${timeAgo(lastAccessedAt)}` : 'Not started yet'}
              </p>
            </div>
            <Link
              to={continueLesson ? lessonUrl(course._id, continueLesson) : `/courses/${course._id}`}
              className="btn-primary"
            >
              {lastAccessedAt ? 'Continue learning' : 'Start learning'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// A smaller row for any other course in progress.
function InProgressRow({ enrollment }) {
  const { course, continueLesson, progressPercent, lastAccessedAt } = enrollment;

  return (
    <li className="grid items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:gap-5">
      <div className="min-w-0">
        <Link to={`/courses/${course._id}`} className="font-medium hover:underline">
          {course.title}
        </Link>
        <p className="text-xs text-muted">
          {lastAccessedAt ? `Last studied ${timeAgo(lastAccessedAt)}` : 'Not started yet'}
        </p>
      </div>
      <ProgressBar compact percent={progressPercent} label={`Progress in ${course.title}`} />
      <Link
        to={continueLesson ? lessonUrl(course._id, continueLesson) : `/courses/${course._id}`}
        aria-label={`Open ${course.title}`}
        className="btn-secondary"
      >
        {lastAccessedAt ? 'Resume' : 'Start'}
      </Link>
    </li>
  );
}

function CompletedRow({ enrollment }) {
  const { course, completedAt } = enrollment;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <Link to={`/courses/${course._id}`} className="font-medium hover:underline">
          {course.title}
        </Link>
        <p className="text-xs text-muted">
          <span aria-hidden="true" className="text-success">✓ </span>
          Completed {formatDate(completedAt)}
        </p>
      </div>
      <Link to={`/courses/${course._id}`} aria-label={`Review ${course.title}`} className="btn-secondary">
        Review
      </Link>
    </li>
  );
}

// The three headline numbers, kept beside the activity feed rather than above the
// resume card, because they're useful context but not why the student came here.
function ProgressSummary({ enrollments }) {
  const completed = enrollments.filter((enrollment) => enrollment.completedAt).length;
  const lessonsDone = enrollments.reduce((sum, enrollment) => sum + enrollment.completedCount, 0);
  const lessonsTotal = enrollments.reduce((sum, enrollment) => sum + enrollment.totalLessons, 0);

  const rows = [
    ['Courses in progress', enrollments.length - completed],
    ['Courses completed', completed],
    ['Lessons finished', `${lessonsDone} of ${lessonsTotal}`],
  ];

  return (
    <section aria-labelledby="summary-heading" className="card p-5">
      <h2 id="summary-heading" className="text-lg font-semibold">
        Your progress
      </h2>
      <dl className="mt-3 divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Turn an activity entry into a sentence.
function describeActivity(item) {
  if (item.type === 'enrolled') return 'Enrolled';
  if (item.type === 'course_completed') return 'Completed the course';
  return `Finished "${item.lessonTitle}"`;
}

function RecentActivity() {
  const { data, loading, error } = useFetch('/progress/activity');

  return (
    <section aria-labelledby="activity-heading" className="card p-5">
      <h2 id="activity-heading" className="text-lg font-semibold">
        Recent activity
      </h2>

      {loading && (
        <SkeletonGroup label="Loading activity" className="mt-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </SkeletonGroup>
      )}
      {error && <p className="mt-3 text-sm text-muted">We couldn't load your recent activity.</p>}
      {data?.activity.length === 0 && <p className="mt-3 text-sm text-muted">Nothing here yet.</p>}

      {data && (
        <div className="mt-4 space-y-5">
          {groupByDay(data.activity.slice(0, ACTIVITY_SHOWN), (item) => item.at).map((group) => (
            <div key={group.label}>
              <h3 className="font-sans text-xs font-semibold text-muted">{group.label}</h3>
              <ul className="mt-2 space-y-3">
                {group.items.map((item, index) => (
                  <li key={index} className="text-sm">
                    <p>{describeActivity(item)}</p>
                    <Link to={`/courses/${item.course._id}`} className="text-xs text-muted hover:underline">
                      {item.course.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Courses the student hasn't joined. This is optional extra content, so if it fails
// to load the section simply doesn't appear.
function MoreCourses({ enrollments }) {
  const { data } = useFetch('/courses?limit=12');
  const enrolledIds = new Set(enrollments.map((enrollment) => enrollment.course._id));
  const suggestions = (data?.courses || [])
    .filter((course) => !enrolledIds.has(course._id))
    .slice(0, SUGGESTION_COUNT);

  if (suggestions.length === 0) return null;

  return (
    <section aria-labelledby="more-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id="more-heading" className="text-xl font-semibold">
          Explore more courses
        </h2>
        <Link to="/courses" className="text-sm font-medium underline underline-offset-4">
          View all courses
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((course) => (
          <CourseCard key={course._id} course={course} />
        ))}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Loading your dashboard" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
      </div>
    </SkeletonGroup>
  );
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/enrollments/me');

  const firstName = user.name.split(' ')[0];

  let content;
  if (loading) {
    content = <DashboardSkeleton />;
  } else if (error) {
    content = <ErrorState error={error} onRetry={reload} />;
  } else if (data.enrollments.length === 0) {
    content = (
      <div className="space-y-10">
        <EmptyState
          title="You haven't enrolled in any courses yet"
          message="Pick a course to get started. Your progress will appear here as soon as you begin."
          actionLabel="Browse courses"
          actionTo="/courses"
        />
        <MoreCourses enrollments={[]} />
      </div>
    );
  } else {
    // The server sends these most recently studied first.
    const inProgress = data.enrollments.filter((enrollment) => !enrollment.completedAt);
    const completed = data.enrollments.filter((enrollment) => enrollment.completedAt);
    const [current, ...otherInProgress] = inProgress;

    content = (
      <div className="space-y-10">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-8">
            {current ? (
              <ResumeCard enrollment={current} />
            ) : (
              <EmptyState
                title="You're all caught up"
                message="You've finished every course you started. Ready for something new?"
                actionLabel="Browse courses"
                actionTo="/courses"
              />
            )}

            {otherInProgress.length > 0 && (
              <section aria-labelledby="in-progress-heading">
                <h2 id="in-progress-heading" className="mb-3 text-xl font-semibold">
                  Also in progress
                </h2>
                <ul className="card divide-y divide-line">
                  {otherInProgress.map((enrollment) => (
                    <InProgressRow key={enrollment._id} enrollment={enrollment} />
                  ))}
                </ul>
              </section>
            )}

            {completed.length > 0 && (
              <section aria-labelledby="completed-heading">
                <h2 id="completed-heading" className="mb-3 text-xl font-semibold">
                  Completed courses
                </h2>
                <ul className="card divide-y divide-line">
                  {completed.map((enrollment) => (
                    <CompletedRow key={enrollment._id} enrollment={enrollment} />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="min-w-0 space-y-6">
            <ProgressSummary enrollments={data.enrollments} />
            <RecentActivity />
          </aside>
        </div>

        <MoreCourses enrollments={data.enrollments} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Welcome back, {firstName}</h1>
      {content}
    </div>
  );
}
