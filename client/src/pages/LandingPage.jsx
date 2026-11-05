// The public home page. It explains the product and shows real courses from the API.
// Every claim here describes a feature the app actually has, so please keep it that
// way: add testimonials or student numbers only once you have real ones.
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { EmptyState, ErrorState } from '../components/StatusViews';
import { homePathFor, useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';

const STEPS = [
  {
    title: 'Choose a course',
    text: 'Search the catalogue or filter by topic and level. Every course page shows the full lesson outline, so you know what you are signing up for.',
  },
  {
    title: 'Study at your pace',
    text: 'Read lessons and watch videos in order, with no schedule to keep up with. Enrolling takes one click.',
  },
  {
    title: 'Pick up where you left off',
    text: 'Mark lessons complete and watch your progress grow. When you come back, your next lesson is one click away.',
  },
];

const STUDENT_FEATURES = [
  'Text and video lessons in a clear order',
  'A progress bar for every course',
  'A dashboard of current and completed courses',
  'A history of your recent activity',
];

const INSTRUCTOR_FEATURES = [
  'A lesson editor with markdown preview',
  'Simple controls for reordering lessons',
  'Draft courses until you choose to publish',
  'Enrollment counts and each student’s progress',
];

// A small illustration of the lesson progress view. It is decorative, so it's hidden
// from screen readers, and it's built with HTML so it stays sharp and loads instantly.
function ProductPreview() {
  const lessons = [
    { title: 'How the web works', done: true },
    { title: 'Your first HTML page', done: true },
    { title: 'Styling with CSS', current: true },
    { title: 'Page layout with flexbox' },
  ];

  return (
    <div aria-hidden="true" className="rounded-2xl bg-surface p-5 text-ink shadow-2xl sm:p-6">
      <p className="text-xs font-medium text-muted">Web Development · Beginner</p>
      <p className="mt-1 font-display text-xl font-semibold">Web Development Basics</p>

      <div className="mt-4 flex justify-between text-xs text-muted">
        <span>Your progress</span>
        <span className="font-medium text-ink">50%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-track">
        <div className="h-full w-1/2 rounded-full bg-progress" />
      </div>

      <ol className="mt-5 space-y-1">
        {lessons.map((lesson, index) => (
          <li
            key={lesson.title}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              lesson.current ? 'bg-track font-medium' : ''
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                lesson.done ? 'bg-success-soft text-success' : 'bg-paper text-muted'
              }`}
            >
              {lesson.done ? '✓' : index + 1}
            </span>
            {lesson.title}
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-medium text-white">
        Continue learning
      </div>
    </div>
  );
}

function Hero() {
  const { user } = useAuth();

  return (
    <section className="bg-brand text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24">
        <div>
          <h1 className="text-4xl leading-[1.1] font-semibold sm:text-5xl lg:text-6xl">
            Courses that pick up right where you left off
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/80">
            Work through structured lessons, track your progress in every course, and always know
            what comes next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link to={homePathFor(user)} className="btn bg-accent px-6 py-3 text-base text-ink hover:bg-accent/90">
                {user.role === 'student' ? 'Continue learning' : 'Go to your dashboard'}
              </Link>
            ) : (
              <Link to="/register" className="btn bg-accent px-6 py-3 text-base text-ink hover:bg-accent/90">
                Get started for free
              </Link>
            )}
            <Link to="/courses" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">
              Browse courses
            </Link>
          </div>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}

// Placeholder cards keep the page from jumping around while courses load.
function CourseSkeletons() {
  return (
    <div role="status" aria-label="Loading courses" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((key) => (
        <div key={key} className="card overflow-hidden motion-safe:animate-pulse">
          <div className="aspect-video bg-track" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-1/3 rounded bg-track" />
            <div className="h-5 w-3/4 rounded bg-track" />
            <div className="h-3 w-full rounded bg-track" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturedCourses() {
  const { data, loading, error, reload } = useFetch('/courses?limit=3');
  const { data: categoryData } = useFetch('/courses/categories');

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-3xl font-semibold">Start with a new course</h2>
        <Link to="/courses" className="text-sm font-medium underline underline-offset-4">
          View all courses
        </Link>
      </div>

      {categoryData?.categories.length > 0 && (
        <ul aria-label="Browse by topic" className="mb-8 flex flex-wrap gap-2">
          {categoryData.categories.map((category) => (
            <li key={category}>
              <Link
                to={`/courses?category=${encodeURIComponent(category)}`}
                className="inline-block rounded-full border border-line bg-surface px-4 py-1.5 text-sm hover:bg-track"
              >
                {category}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {loading && <CourseSkeletons />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.courses.length === 0 && (
        <EmptyState title="New courses are on the way" message="Check back soon, or sign up to teach the first one." />
      )}
      {data?.courses.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((course) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="text-3xl font-semibold">How it works</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t-2 border-brand pt-5">
              <p className="text-sm font-semibold text-muted">Step {index + 1}</p>
              <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeatureList({ items, light }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden="true" className={light ? 'text-accent' : 'text-success'}>✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Audiences() {
  const { user } = useAuth();

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-20">
      <div className="card flex flex-col p-8">
        <h2 className="text-2xl font-semibold">For students</h2>
        <p className="mt-2 text-muted">Everything you need to finish what you start.</p>
        <FeatureList items={STUDENT_FEATURES} />
        <div className="mt-8 flex-1 content-end">
          <Link to="/courses" className="btn-secondary">
            Find a course
          </Link>
        </div>
      </div>

      <div className="flex flex-col rounded-xl bg-brand p-8 text-white">
        <h2 className="text-2xl font-semibold">For instructors</h2>
        <p className="mt-2 text-white/80">Publish what you know and see how your students are doing.</p>
        <FeatureList items={INSTRUCTOR_FEATURES} light />
        <div className="mt-8 flex-1 content-end">
          <Link
            to={user ? homePathFor(user) : '/register?role=instructor'}
            className="btn bg-accent text-ink hover:bg-accent/90"
          >
            {user ? 'Go to your dashboard' : 'Start teaching'}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeaturedCourses />
      <HowItWorks />
      <Audiences />
    </>
  );
}
