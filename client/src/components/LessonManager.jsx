// The lesson editor: add, edit, reorder, and delete a course's lessons.
import { useState } from 'react';
import { api } from '../api/client';
import { useFetch } from '../hooks/useFetch';
import FormField from './FormField';
import Markdown from './Markdown';
import { ErrorBanner, ErrorState, LoadingState } from './StatusViews';

const EMPTY_LESSON = { title: '', content: '', videoUrl: '' };

// The form for adding or editing one lesson, with a markdown preview.
function LessonForm({ courseId, lessonId, initialValues, onDone, onCancel }) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (lessonId) await api.put(`/courses/${courseId}/lessons/${lessonId}`, form);
      else await api.post(`/courses/${courseId}/lessons`, form);
      onDone();
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  }

  const fieldErrors = error?.fieldErrors || {};

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-line bg-paper p-4">
      <ErrorBanner message={error && !Object.keys(fieldErrors).length && error.message} />
      <FormField label="Lesson title" name="title" value={form.title} onChange={handleChange} error={fieldErrors.title} />

      {showPreview ? (
        <div>
          <p className="mb-1 text-sm font-medium">Preview</p>
          <div className="min-h-40 rounded-lg border border-line bg-white p-4">
            {form.content.trim() ? (
              <Markdown>{form.content}</Markdown>
            ) : (
              <p className="text-sm text-muted">Nothing to preview yet.</p>
            )}
          </div>
        </div>
      ) : (
        <FormField
          as="textarea"
          rows={10}
          label="Content"
          name="content"
          value={form.content}
          onChange={handleChange}
          error={fieldErrors.content}
          hint="Supports markdown: # headings, **bold**, lists, and `code`."
          style={{ fontFamily: 'ui-monospace, monospace' }}
        />
      )}

      <FormField
        label="Video URL (optional)"
        name="videoUrl"
        type="url"
        placeholder="https://www.youtube.com/watch?v=..."
        value={form.videoUrl}
        onChange={handleChange}
        error={fieldErrors.videoUrl}
      />

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save lesson'}
        </button>
        <button type="button" onClick={() => setShowPreview((shown) => !shown)} className="btn-secondary">
          {showPreview ? 'Back to editing' : 'Preview'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function LessonManager({ courseId, onLessonsChanged }) {
  // The instructor's GET of a single lesson includes its content, but this list only
  // needs titles. Content is fetched when they click "Edit".
  const { data, loading, error, reload } = useFetch(`/courses/${courseId}/lessons`);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // { id, values } while editing a lesson
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingState label="Loading lessons..." />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { lessons } = data;

  // Run a change, then refresh this list and the page above it.
  async function run(action) {
    setActionError(null);
    setBusy(true);
    try {
      await action();
      reload();
      onLessonsChanged();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSaved() {
    setAdding(false);
    setEditing(null);
    reload();
    onLessonsChanged();
  }

  async function startEditing(lesson) {
    setActionError(null);
    setAdding(false);
    try {
      const result = await api.get(`/courses/${courseId}/lessons/${lesson._id}`);
      const { title, content, videoUrl } = result.lesson;
      setEditing({ id: lesson._id, values: { title, content, videoUrl } });
    } catch (err) {
      setActionError(err.message);
    }
  }

  // Swap a lesson with its neighbour, then send the whole new order to the server.
  function move(index, direction) {
    const ids = lessons.map((lesson) => lesson._id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => api.put(`/courses/${courseId}/lessons/reorder`, { lessonIds: ids }));
  }

  function handleDelete(lesson) {
    const confirmed = window.confirm(
      `Delete "${lesson.title}"? It will also be removed from students' progress.`
    );
    if (confirmed) run(() => api.delete(`/courses/${courseId}/lessons/${lesson._id}`));
  }

  return (
    <section className="card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Lessons</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setAdding(true);
            }}
            className="btn-primary"
          >
            Add lesson
          </button>
        )}
      </div>

      <ErrorBanner message={actionError} />

      {adding && (
        <LessonForm
          courseId={courseId}
          initialValues={EMPTY_LESSON}
          onDone={handleSaved}
          onCancel={() => setAdding(false)}
        />
      )}

      {lessons.length === 0 && !adding && (
        <p className="py-6 text-center text-sm text-muted">
          No lessons yet. Add your first lesson to be able to publish this course.
        </p>
      )}

      <ol className="space-y-2">
        {lessons.map((lesson, index) =>
          editing?.id === lesson._id ? (
            <li key={lesson._id}>
              <LessonForm
                courseId={courseId}
                lessonId={lesson._id}
                initialValues={editing.values}
                onDone={handleSaved}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={lesson._id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2"
            >
              <span className="w-6 text-center text-sm text-muted tabular-nums">{lesson.order}</span>
              <span className="min-w-0 flex-1 text-sm font-medium">{lesson.title}</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  aria-label={`Move "${lesson.title}" up`}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                  className="btn-secondary px-2.5"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move "${lesson.title}" down`}
                  disabled={busy || index === lessons.length - 1}
                  onClick={() => move(index, 1)}
                  className="btn-secondary px-2.5"
                >
                  ↓
                </button>
                <button type="button" onClick={() => startEditing(lesson)} className="btn-secondary">
                  Edit
                </button>
                <button type="button" disabled={busy} onClick={() => handleDelete(lesson)} className="btn-danger">
                  Delete
                </button>
              </div>
            </li>
          )
        )}
      </ol>
    </section>
  );
}
