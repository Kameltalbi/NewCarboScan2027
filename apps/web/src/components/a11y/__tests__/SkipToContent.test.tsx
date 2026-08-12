import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { SkipToContent } from '../SkipToContent';

describe('SkipToContent', () => {
  it('renders a link targeting #main-content', () => {
    render(<SkipToContent />);
    const link = screen.getByText('Aller au contenu principal');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('has sr-only class for visual hiding', () => {
    render(<SkipToContent />);
    const link = screen.getByText('Aller au contenu principal');
    expect(link.className).toContain('sr-only');
  });
});
