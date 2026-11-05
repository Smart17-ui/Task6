// The public course catalogue, with search, filters, and pagination.
// The filters live in the URL, so a filtered view can be bookmarked or shared and
// the Back button works as expected.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusViews';
import { useFetch } from '../hooks/useFetch';

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const level = params.get('level') || '';
  const page = Number(params.get('page')) || 1;

  // Change one filter in the URL. Any filter change returns to the first page.
  function updateParam(name, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        if (name !== 'page') next.delete('page');
        return next;
      },
      { replace: name === 'search' }
    );
  }

  // Wait until the user pauses typing before searching, rather than on every key.
  const [searchText, setSearchText] = useState(search);
  useEffect(() => {
    if (searchText === search) return undefined;
    const timer = setTimeout(() => updateParam('search', searchText.trim()), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const apiParams = new URLSearchParams();
  if (search) apiParams.set('search', search);
  if (category) apiParams.set('category', category);
  if (level) apiParams.set('level', level);
  if (page > 1) apiParams.set('page', page);

  const { data, loading, error, reload } = useFetch(`/courses?${apiParams}`);
  const { data: categoryData } = useFetch('/courses/categories');

  const hasFilters = Boolean(search || category || level);

  function clearFilters() {
    setSearchText('');
    setParams({});
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Find your next course</h1>
        <p className="mt-1 text-muted">Practical lessons you can work through at your own pace.</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          aria-label="Search courses"
          placeholder="Search courses..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="input"
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => updateParam('category', event.target.value)}
          className="input sm:w-48"
        >
          <option value="">All categories</option>
          {categoryData?.categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by level"
          value={level}
          onChange={(event) => updateParam('level', event.target.value)}
          className="input sm:w-40"
        >
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading courses..." />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && data.courses.length === 0 && (
        hasFilters ? (
          <div className="card flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center">
            <h3 className="text-lg font-semibold">No courses match your search</h3>
            <button type="button" onClick={clearFilters} className="btn-secondary">
              Clear filters
            </button>
          </div>
        ) : (
          <EmptyState title="No courses yet" message="New courses will appear here once they're published." />
        )
      )}

      {data && data.courses.length > 0 && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>

          {data.pagination.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParam('page', page - 1)}
                className="btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.pagination.totalPages}
                onClick={() => updateParam('page', page + 1)}
                className="btn-secondary"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
