import { Star, Eye, Play } from 'lucide-react';

export interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  author?: string;
  views?: number;
  rating?: number;
}

interface InsightCardProps {
  insight: Insight;
}

const categoryColors: { [key: string]: { bg: string, text: string } } = {
  'Strategy': { bg: '#e6f4ff', text: '#0070f3' },
  'Site Selection': { bg: '#fffbe6', text: '#f5a623' },
  'Creative': { bg: '#e9f7ef', text: '#28a745' },
};

export default function InsightCard({ insight }: InsightCardProps) {
  const { category, title, description, author, rating, views } = insight;
  const colors = categoryColors[category] || { bg: '#f2f2f2', text: '#666' };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e5e5',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.04)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{
            background: colors.bg,
            color: colors.text,
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
          }}>{category}</span>
          {rating && (
            <div style={{ display: 'flex', alignItems: 'center', color: '#f5a623' }}>
              <Star size={16} fill="currentColor" />
              <span style={{ marginLeft: '4px', fontWeight: 600, fontSize: '14px' }}>{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0' }}>{title}</h3>
        <p style={{ color: '#666', fontSize: '1rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>{description}</p>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#999', fontSize: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Eye size={16} />
            <span style={{ marginLeft: '6px' }}>{views}</span>
          </div>
          <span>{author}</span>
        </div>
        <button style={{
          width: '100%',
          padding: '12px',
          background: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'background 0.2s',
        }}>
          <Play size={18} />
          Use Prompt
        </button>
      </div>
    </div>
  );
} 