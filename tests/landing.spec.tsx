import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

function H1() { 
  return (<h1>Your MLS & CRM, <br /> one chat away.</h1>); 
}

describe('Landing headline', () => {
  it('renders without JSX errors', () => {
    render(<H1 />);
    expect(screen.getByText(/Your MLS/i)).toBeInTheDocument();
  });
});