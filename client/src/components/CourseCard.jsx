// A course summary shown in the catalogue grid.
import { Link } from 'react-router-dom';
import { capitalize, pluralize } from '../utils/format';
import CourseThumbnail from './CourseThumbnail';

export default function CourseCard({ course }) {
  return (
    <Link
      to={`/courses/${course._id}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <CourseThumbnail course={course} className="aspect-video w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium text-muted">
          {course.category} · {capitalize(course.level)}
        </p>
        <h3 className="text-lg leading-snug font-semibold group-hover:underline">{course.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted">{course.description}</p>
        <p className="pt-2 text-xs text-muted">
          {course.instructor?.name} · {pluralize(course.lessonCount, 'lesson')} ·{' '}
          {pluralize(course.enrollmentCount, 'student')}
        </p>
      </div>
    </Link>
  );
}
