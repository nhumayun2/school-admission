import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api.js';
import { CreateClassView } from './CreateClassView.jsx';

function setup(onCreate = vi.fn().mockResolvedValue()) {
  render(<CreateClassView classes={[]} msg={null} onCreate={onCreate} onNavigate={() => {}} />);
  return {
    onCreate,
    name: screen.getByPlaceholderText('Class 6 - Morning Shift'),
    seats: screen.getByPlaceholderText('120'),
    submit: () => userEvent.click(screen.getByRole('button', { name: 'Create class' })),
  };
}

describe('create class form', () => {
  it('does not send an empty form', async () => {
    const { onCreate, submit } = setup();
    await submit();
    expect(screen.getByText(/Enter a class name/)).toBeInTheDocument();
    expect(screen.getByText('Enter the number of seats.')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['0', /between 1 and 10,000/],
    ['12.5', /whole number/],
    ['abc', /whole number/],
  ])('rejects %s seats', async (value, message) => {
    const { onCreate, name, seats, submit } = setup();
    await userEvent.type(name, 'Class 6 - Morning Shift');
    await userEvent.type(seats, value);
    await submit();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('sends a trimmed name and a number of seats', async () => {
    const { onCreate, name, seats, submit } = setup();
    await userEvent.type(name, '  Class 6 - Day Shift  ');
    await userEvent.type(seats, '120');
    await submit();
    expect(onCreate).toHaveBeenCalledWith('Class 6 - Day Shift', 120);
  });

  it('shows a server validation error next to the field', async () => {
    const onCreate = vi.fn().mockRejectedValue(new ApiError(400, 'INVALID_TOTAL_SEATS', 'Total seats must be at least 1.'));
    const { name, seats, submit } = setup(onCreate);
    await userEvent.type(name, 'Class 6 - Day Shift');
    await userEvent.type(seats, '120');
    await submit();
    expect(await screen.findByText('Total seats must be at least 1.')).toBeInTheDocument();
  });
});
