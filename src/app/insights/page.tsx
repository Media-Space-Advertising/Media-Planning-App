"use client";
import { useState } from 'react';
import InsightCard from '@/components/InsightCard';
import type { Insight } from '@/components/InsightCard';
import { Search, Star, Eye } from 'lucide-react';

const allInsights: Insight[] = [
  {
    id: '1',
    category: 'Strategy',
    title: 'Geographic Hotspot Identification',
    description: 'Identify the best geographic areas to target based on a client brief and audience.',
    author: 'Oli Hill',
    rating: 4.9,
    views: 120,
  },
  {
    id: '2',
    category: 'Strategy',
    title: 'Audience Persona Generation',
    description: 'Generate a detailed audience persona from a brief to improve planning.',
    author: 'Oli Hill',
    rating: 4.8,
    views: 250,
  },
  {
    id: '3',
    category: 'Site Selection',
    title: 'Automated Plan Rationale',
    description: 'Generate a client-ready summary explaining the strategic value of a site selection.',
    author: 'Oli Hill',
    rating: 5.0,
    views: 300,
  },
  {
    id: '4',
    category: 'Site Selection',
    title: 'Budget Re-allocation Suggestions',
    description: 'Get intelligent suggestions for how to adjust a plan if the client\'s budget changes.',
    author: 'Oli Hill',
    rating: 4.7,
    views: 180,
  },
  {
    id: '5',
    category: 'Creative',
    title: 'Ad Copy & Tagline Generation',
    description: 'Brainstorm effective, concise ad copy and taglines for OOH placements.',
    author: 'Oli Hill',
    rating: 4.9,
    views: 425,
  },
  {
    id: '6',
    category: 'Creative',
    title: 'Visual Concept Ideas',
    description: 'Spark creative direction with high-level visual concepts for a campaign.',
    author: 'Oli Hill',
    rating: 4.6,
    views: 310,
  },
];

const categories = ['All Prompts', 'Strategy', 'Site Selection', 'Creative'];

export default function InsightsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Prompts');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInsights = allInsights
    .filter(insight => selectedCategory === 'All Prompts' || insight.category === selectedCategory)
    .filter(insight =>
      insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const categoryButton = (category: string) => {
    const isSelected = selectedCategory === category;
    return (
      <button
        key={category}
        onClick={() => setSelectedCategory(category)}
        style={{
          padding: '8px 16px',
          borderRadius: '999px',
          border: '1px solid',
          borderColor: isSelected ? '#0070f3' : '#ddd',
          background: isSelected ? '#0070f3' : 'transparent',
          color: isSelected ? '#fff' : '#333',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {category}
      </button>
    );
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingTop: '8rem', paddingBottom: '4rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#333' }}>OOH AI Insights</h1>
          <p style={{ fontSize: '1.25rem', color: '#666', marginTop: '0.5rem' }}>Discover and share powerful prompts for OOH analysis and optimization.</p>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
            <Search style={{ position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)', color: '#999' }} size={20} />
            <input
              type="text"
              placeholder="Search by title, description, category, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '3rem' }}>
          {categories.map(category => categoryButton(category))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {filteredInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </div>
    </div>
  );
} 