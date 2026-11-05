import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-content" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1 style={{ color: '#d4af37', marginBottom: '0.75rem' }}>404</h1>
      <p style={{ color: '#b8b8b8', marginBottom: '1.5rem' }}>
        Nothing interesting happens.
      </p>
      <Link to="/" style={{ color: '#d4af37', fontWeight: 600 }}>Back to the tools</Link>
    </div>
  );
}
