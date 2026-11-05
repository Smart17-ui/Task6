// Admin tools: manage all users and all courses.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { EmptyState, ErrorBanner, ErrorState, LoadingState } from '../components/StatusViews';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { formatDate, pluralize } from '../utils/format';
import { StatusBadge } from './InstructorDashboardPage';

function UsersPanel() {
  const { user: currentUser } = useAuth();
  const { data, loading, error, reload } = useFetch('/users');
  const [actionError, setActionError] = useState(null);

  if (loading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function run(action) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err.message);
    }
    // Reload even after a failure, so a dropdown snaps back to the saved value.
    reload();
  }

  function handleDelete(user) {
    const confirmed = window.confirm(
      `Delete ${user.name}? Their account, any courses they teach, and their progress will be permanently removed.`
    );
    if (confirmed) run(() => api.delete(`/users/${user._id}`));
  }

  return (
    <div className="space-y-3">
      <ErrorBanner message={actionError} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">User</th>
              <th scope="col" className="px-4 py-3 font-medium">Role</th>
              <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.users.map((user) => {
              const isSelf = user._id === currentUser._id;
              return (
                <tr key={user._id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.name}{isSelf && ' (you)'}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Role for ${user.name}`}
                      value={user.role}
                      disabled={isSelf}
                      onChange={(event) =>
                        run(() => api.put(`/users/${user._id}/role`, { role: event.target.value }))
                      }
                      className="input w-36 disabled:opacity-60"
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <button type="button" onClick={() => handleDelete(user)} className="btn-danger">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoursesPanel() {
  const { data, loading, error, reload } = useFetch('/courses/managed');
  const [actionError, setActionError] = useState(null);

  if (loading) return <LoadingState label="Loading courses..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  if (data.courses.length === 0) {
    return <EmptyState title="No courses yet" message="Courses created by instructors will appear here." />;
  }

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
    <div className="space-y-3">
      <ErrorBanner message={actionError} />
      <ul className="card divide-y divide-line">
        {data.courses.map((course) => (
          <li key={course._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/courses/${course._id}`} className="font-medium hover:underline">
                  {course.title}
                </Link>
                <StatusBadge isPublished={course.isPublished} />
              </div>
              <p className="text-xs text-muted">
                {course.instructor?.name} · {pluralize(course.lessonCount, 'lesson')} ·{' '}
                {pluralize(course.enrollmentCount, 'student')}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/instructor/courses/${course._id}/edit`} className="btn-secondary">
                Edit
              </Link>
              <button type="button" onClick={() => handleDelete(course)} className="btn-danger">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('users');

  const tabClass = (name) =>
    `cursor-pointer border-b-2 px-4 py-2 text-sm font-medium ${
      tab === name ? 'border-brand text-ink' : 'border-transparent text-muted hover:text-ink'
    }`;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Admin</h1>
      <div role="tablist" aria-label="Admin sections" className="flex gap-1 border-b border-line">
        <button type="button" role="tab" aria-selected={tab === 'users'} onClick={() => setTab('users')} className={tabClass('users')}>
          Users
        </button>
        <button type="button" role="tab" aria-selected={tab === 'courses'} onClick={() => setTab('courses')} className={tabClass('courses')}>
          Courses
        </button>
      </div>
      {tab === 'users' ? <UsersPanel /> : <CoursesPanel />}
    </div>
  );
}
