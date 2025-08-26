import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HILDemo } from '../HILDemo';

describe('HILDemo', () => {
  it('renders the demo page with all sections', () => {
    render(<HILDemo />);

    // Check main header
    expect(screen.getByText('Human-in-the-Loop Demo')).toBeInTheDocument();
    
    // Check feature cards
    expect(screen.getByText('Gap Analysis')).toBeInTheDocument();
    expect(screen.getByText('ATS Optimization')).toBeInTheDocument();
    expect(screen.getByText('PM Assessment')).toBeInTheDocument();
    
    // Check demo story
    expect(screen.getByText('Demo Story: Product Leadership Story')).toBeInTheDocument();
    expect(screen.getByText('3 Variations')).toBeInTheDocument();
    
    // Check CTA button
    expect(screen.getByText('Start HIL Workflow')).toBeInTheDocument();
    
    // Check features overview
    expect(screen.getByText('HIL Features Overview')).toBeInTheDocument();
    expect(screen.getByText('Content Analysis')).toBeInTheDocument();
    expect(screen.getByText('AI Collaboration')).toBeInTheDocument();
  });

  it('displays demo story content', () => {
    render(<HILDemo />);

    expect(screen.getByText('Led cross-functional product development team to deliver innovative solutions.')).toBeInTheDocument();
    expect(screen.getByText('Senior Product Manager')).toBeInTheDocument();
  });

  it('shows job keywords', () => {
    render(<HILDemo />);

    expect(screen.getByText('product management')).toBeInTheDocument();
    expect(screen.getByText('leadership')).toBeInTheDocument();
    expect(screen.getByText('cross-functional')).toBeInTheDocument();
  });
});
