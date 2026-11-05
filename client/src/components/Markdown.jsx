// Displays markdown as formatted text. react-markdown ignores raw HTML and removes
// unsafe links, so lesson content can't run scripts in a student's browser.
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ children }) {
  return (
    <div className="prose max-w-none prose-headings:font-display prose-pre:bg-brand prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
