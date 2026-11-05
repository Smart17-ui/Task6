// Shows an instructor who is enrolled in a course and how far along each student is.
import { Link, useParams } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import { useFetch } from '../hooks/useFetch';
import { formatDate } from '../utils/format';

export default function CourseStudentsPage() {
  const { courseId } = useParams();
  const { data, loading, error, reload } = useFetch(`/courses/${courseId}/students`);

  if (loading) return <LoadingState label="Loading students..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { course, students, totalLessons } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/instructor" className="text-sm text-muted hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="page-title mt-1">{course.title}: students</h1>
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="No students yet"
          message="Students will appear here as soon as they enroll in this course."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Student</th>
                <th scope="col" className="w-48 px-4 py-3 font-medium">Progress</th>
                <th scope="col" className="px-4 py-3 font-medium">Lessons</th>
                <th scope="col" className="px-4 py-3 font-medium">Last active</th>
                <th scope="col" className="px-4 py-3 font-medium">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((row) => (
                <tr key={row._id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.student.name}</p>
                    <p className="text-xs text-muted">{row.student.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar percent={row.progressPercent} label={`${row.student.name}'s progress`} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.completedCount} / {totalLessons}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(row.lastAccessedAt)}
                    {row.lastAccessedLesson && (
                      <p className="text-xs text-muted">{row.lastAccessedLesson.title}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(row.enrolledAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
