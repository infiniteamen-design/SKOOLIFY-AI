import React from 'react';

// Simple regex-based markdown parser for key elements since we can't easily rely on external deps setup in this prompt context
// Handles headers, bold, list items, and paragraphs.
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderLine = (line: string, index: number) => {
    // Headers
    if (line.startsWith('### ')) return <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-indigo-700">{parseInline(line.slice(4))}</h3>;
    if (line.startsWith('## ')) return <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-indigo-800 border-b pb-1 border-indigo-100">{parseInline(line.slice(3))}</h2>;
    if (line.startsWith('# ')) return <h1 key={index} className="text-2xl font-extrabold mt-6 mb-4 text-indigo-900">{parseInline(line.slice(2))}</h1>;
    
    // Lists
    if (line.trim().startsWith('- ')) return <li key={index} className="ml-4 list-disc mb-1">{parseInline(line.trim().slice(2))}</li>;
    if (/^\d+\.\s/.test(line.trim())) return <li key={index} className="ml-4 list-decimal mb-1">{parseInline(line.trim().replace(/^\d+\.\s/, ''))}</li>;

    // Paragraphs (empty lines are spacers)
    if (line.trim() === '') return <div key={index} className="h-4"></div>;
    
    return <p key={index} className="mb-2 leading-relaxed text-gray-700">{parseInline(line)}</p>;
  };

  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="markdown-body font-sans">
      {content.split('\n').map((line, idx) => renderLine(line, idx))}
    </div>
  );
};

export default MarkdownRenderer;