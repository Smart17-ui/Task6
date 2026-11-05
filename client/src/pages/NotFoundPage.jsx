import { EmptyState } from '../components/StatusViews';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      message="The page you're looking for doesn't exist or has moved."
      actionLabel="Browse courses"
      actionTo="/courses"
    />
  );
}
