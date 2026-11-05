// Create or edit a course. Used by two routes: /instructor/courses/new (no id yet)
// and /instructor/courses/:courseId/edit, which also shows the lesson editor.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import FormField from '../components/FormField';
import LessonManager from '../components/LessonManager';
import { ErrorBanner, ErrorState, LoadingState } from '../components/StatusViews';
import { useFetch } from '../hooks/useFetch';

const EMPTY_COURSE = { title: '', description: '', category: '', level: 'beginner', thumbnailUrl: '' };

export default function CourseEditorPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isNew = !courseId;

  const { data, loading, error, reload } = useFetch(isNew ? null : `/courses/${courseId}`);

  const [form, setForm] = useState(EMPTY_COURSE);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fill in the form once when the course arrives. Refreshing the data later (for
  // example after adding a lesson) must not wipe out edits the user hasn't saved.
  const loadedId = data?.course?._id;
  useEffect(() => {
    if (!data) return;
    const { title, description, category, level, thumbnailUrl } = data.course;
    setForm({ title, description, category, level, thumbnailUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedId]);

  if (loading) return <LoadingState label="Loading course..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const course = data?.course;

  // The API hides other instructors' drafts, but published courses are public, so
  // check here too. The server would reject the save either way.
  if (data && !data.canManage) {
    return <ErrorState error={{ message: 'You can only edit your own courses.' }} />;
  }

  function handleChange(event) {
    setSaved(false);
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setSaved(false);
    setSaving(true);
    try {
      if (isNew) {
        const result = await api.post('/courses', form);
        // Go straight to the edit page so they can add lessons.
        navigate(`/instructor/courses/${result.course._id}/edit`, { replace: true });
        return;
      }
      await api.put(`/courses/${courseId}`, form);
      setSaved(true);
      reload();
    } catch (err) {
      setFormError(err);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    setFormError(null);
    try {
      await api.put(`/courses/${courseId}`, { isPublished: !course.isPublished });
      reload();
    } catch (err) {
      setFormError(err);
    }
  }

  const fieldErrors = formError?.fieldErrors || {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link to="/instructor" className="text-sm text-muted hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="page-title mt-1">{isNew ? 'New course' : 'Edit course'}</h1>
      </div>

      {course && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">
              {course.isPublished ? 'This course is published' : 'This course is a draft'}
            </p>
            <p className="text-sm text-muted">
              {course.isPublished
                ? 'It appears in the catalogue and students can enroll.'
                : 'Only you can see it. Publish it to list it in the catalogue.'}
            </p>
          </div>
          <button
            type="button"
            onClick={togglePublished}
            className={course.isPublished ? 'btn-secondary' : 'btn-primary'}
          >
            {course.isPublished ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="card space-y-4 p-6">
        <h2 className="text-xl font-semibold">Course details</h2>
        <ErrorBanner message={formError && !hasFieldErrors && formError.message} />

        <FormField
          label="Title"
          name="title"
          value={form.title}
          onChange={handleChange}
          error={fieldErrors.title}
        />
        <FormField
          as="textarea"
          rows={4}
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
          error={fieldErrors.description}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Category"
            name="category"
            placeholder="e.g. Web Development"
            value={form.category}
            onChange={handleChange}
            error={fieldErrors.category}
          />
          <FormField
            as="select"
            label="Level"
            name="level"
            value={form.level}
            onChange={handleChange}
            error={fieldErrors.level}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </FormField>
        </div>
        <FormField
          label="Thumbnail URL (optional)"
          name="thumbnailUrl"
          type="url"
          placeholder="https://..."
          value={form.thumbnailUrl}
          onChange={handleChange}
          error={fieldErrors.thumbnailUrl}
        />

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isNew ? 'Create course' : 'Save changes'}
          </button>
          {saved && <p role="status" className="text-sm text-success">Saved</p>}
        </div>
      </form>

      {isNew ? (
        <p className="text-sm text-muted">You can add lessons after creating the course.</p>
      ) : (
        <LessonManager courseId={courseId} onLessonsChanged={reload} />
      )}
    </div>
  );
}
