// The instructor's home: how their teaching is going, what needs doing next, and a
// searchable list of their courses.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import StatTile from '../components/StatTile';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, ErrorState } from '../components/StatusViews';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { pluralize, timeAgo } from '../utils/format';

// The same column layout is used by the header and every row, so they always line up.
const ROW_GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_6rem_7.5rem_10rem_10.5rem] md:items-center md:gap-4';

const SORT_OPTIONS = {
  updated: { label: 'Recently updated', compare: null }, // the server's order
  students: { label: 'Most students', compare: (a, b) => b.enrollmentCount - a.enrollmentCount },
  progress: { label: 'Highest progress', compare: (a, b) => b.averageProgress - a.averageProgress },
  title: { label: 'Title (A to Z)', compare: (a, b) => a.title.localeCompare(b.title) },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
];

function SummaryTiles({ courses, summary }) {
  const published = courses.filter((course) => course.isPublished).length;
  const drafts = courses.length - published;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatTile
        label="Students"
        value={summary.students}
        hint={`${pluralize(summary.enrollments, 'enrollment')} in total`}
      />
      <StatTile label="Average progress" value={`${summary.averageProgress}%`} hint="Across all enrollments" />
      <StatTile label="Completion rate" value={`${summary.completionRate}%`} hint="Enrollments finished" />
      <StatTile label="Courses" value={courses.length} hint={`${published} published, ${pluralize(drafts, 'draft')}`} />
    </div>
  );
}

// One course. On a phone each cell stacks with its own label; from "md" upwards the
// cells line up under the column headings and those labels are only for screen readers.
function CourseRow({ course }) {
  const hasStudents = course.enrollmentCount > 0;

  return (
    <li className={`space-y-3 p-4 md:space-y-0 ${ROW_GRID}`}>
      <div className="min-w-0">
        <Link to={`/courses/${course._id}`} className="font-medium hover:underline">
          {course.title}
        </Link>
        <p className="text-xs text-muted">
          {course.category} · {pluralize(course.lessonCount, 'lesson')}
        </p>
      </div>

      <div>
        <span className="sr-only">Status: </span>
        <StatusBadge isPublished={course.isPublished} />
      </div>

      <div className="text-sm">
        <span className="tabular-nums">{pluralize(course.enrollmentCount, 'student')}</span>
        {hasStudents && <p className="text-xs text-muted tabular-nums">{course.completedCount} finished</p>}
      </div>

      <div>
        {hasStudents ? (
          <ProgressBar compact percent={course.averageProgress} label={`Average progress in ${course.title}`} />
        ) : (
          <p className="text-sm text-muted">No progress yet</p>
        )}
      </div>

      <div className="flex gap-2 md:justify-end">
        <Link
          to={`/instructor/courses/${course._id}/edit`}
          aria-label={`Edit ${course.title}`}
          className="btn-secondary px-3"
        >
          Edit
        </Link>
        <Link
          to={`/instructor/courses/${course._id}/students`}
          aria-label={`Students in ${course.title}`}
          className="btn-secondary px-3"
        >
          Students
        </Link>
      </div>
    </li>
  );
}

function CourseList({ courses }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('updated');

  const query = search.trim().toLowerCase();
  const visible = courses
    .filter((course) => status === 'all' || (status === 'published') === course.isPublished)
    .filter((course) => !query || `${course.title} ${course.category}`.toLowerCase().includes(query));

  const { compare } = SORT_OPTIONS[sort];
  if (compare) visible.sort(compare);

  function clearFilters() {
    setSearch('');
    setStatus('all');
  }

  return (
    <section aria-labelledby="courses-heading">
      <h2 id="courses-heading" className="mb-3 text-xl font-semibold">
        Your courses
      </h2>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search your courses"
          placeholder="Search by title or category..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="input min-w-48 flex-1"
        />

        <div role="group" aria-label="Filter by status" className="flex rounded-lg border border-line bg-surface p-0.5">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === option.value ? 'bg-brand text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <select
          aria-label="Sort courses"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="input w-auto"
        >
          {Object.entries(SORT_OPTIONS).map(([value, option]) => (
            <option key={value} value={value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 border-dashed px-6 py-10 text-center">
          <p className="font-medium">No courses match your filters</p>
          <button type="button" onClick={clearFilters} className="btn-secondary">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="card">
          {/* Column headings for sighted users. Each row labels itself for screen readers. */}
          <div aria-hidden="true" className={`hidden border-b border-line px-4 py-2.5 text-xs font-medium text-muted ${ROW_GRID}`}>
            <span>Course</span>
            <span>Status</span>
            <span>Students</span>
            <span>Average progress</span>
            <span />
          </div>
          <ul aria-label="Your courses" className="divide-y divide-line">
            {visible.map((course) => (
              <CourseRow key={course._id} course={course} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// Unfinished work, worked out from the courses themselves.
function NextSteps({ courses }) {
  const drafts = courses.filter((course) => !course.isPublished);
  if (drafts.length === 0) return null;

  return (
    <section aria-labelledby="next-heading" className="card p-5">
      <h2 id="next-heading" className="text-lg font-semibold">
        Next steps
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {drafts.map((course) => (
          <li key={course._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{course.title}</p>
              <p className="text-xs text-muted">
                {course.lessonCount === 0 ? 'Add a lesson so you can publish it' : 'Draft, ready to publish'}
              </p>
            </div>
            <Link
              to={`/instructor/courses/${course._id}/edit`}
              aria-label={`Open ${course.title} in the editor`}
              className="text-sm font-medium underline underline-offset-4"
            >
              {course.lessonCount === 0 ? 'Add lessons' : 'Review'}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewStudents() {
  const { data, loading, error } = useFetch('/courses/managed/enrollments');

  return (
    <section aria-labelledby="new-students-heading" className="card p-5">
      <h2 id="new-students-heading" className="text-lg font-semibold">
        New students
      </h2>

      {loading && (
        <SkeletonGroup label="Loading new students" className="mt-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </SkeletonGroup>
      )}
      {error && <p className="mt-3 text-sm text-muted">We couldn't load your new students.</p>}
      {data?.enrollments.length === 0 && (
        <p className="mt-3 text-sm text-muted">Students will appear here when they enroll.</p>
      )}

      {data?.enrollments.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {data.enrollments.map((enrollment) => (
            <li key={enrollment._id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{enrollment.student.name}</p>
                <Link
                  to={`/instructor/courses/${enrollment.course._id}/students`}
                  className="text-xs text-muted hover:underline"
                >
                  {enrollment.course.title}
                </Link>
              </div>
              <p className="shrink-0 text-xs text-muted">{timeAgo(enrollment.enrolledAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <SkeletonGroup label="Loading your dashboard" className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </SkeletonGroup>
  );
}

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/courses/managed');

  let content;
  if (loading) {
    content = <DashboardSkeleton />;
  } else if (error) {
    content = <ErrorState error={error} onRetry={reload} />;
  } else if (data.courses.length === 0) {
    content = (
      <EmptyState
        title="You haven't created a course yet"
        message="Create your first course, add some lessons, and publish it when you're ready."
        actionLabel="Create a course"
        actionTo="/instructor/courses/new"
      />
    );
  } else {
    content = (
      <div className="space-y-8">
        <SummaryTiles courses={data.courses} summary={data.summary} />
        <CourseList courses={data.courses} />
        <div className="grid items-start gap-6 md:grid-cols-2">
          <NewStudents />
          <NextSteps courses={data.courses} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Instructor dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            {user.role === 'admin'
              ? 'Every course on the platform.'
              : 'See how your courses are doing and what to work on next.'}
          </p>
        </div>
        <Link to="/instructor/courses/new" className="btn-primary">
          New course
        </Link>
      </div>
      {content}
    </div>
  );
}
