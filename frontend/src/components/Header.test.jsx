import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header.jsx';

function setup(studentId = '') {
  const onStudentIdChange = vi.fn();
  render(
    <Header
      section="classes"
      onNavigate={() => {}}
      studentId={studentId}
      onStudentIdChange={onStudentIdChange}
      inputRef={createRef()}
      idBar={null}
      setIdBar={() => {}}
    />,
  );
  return { onStudentIdChange, input: screen.getByLabelText("Student's birth registration number") };
}

describe('birth registration number box', () => {
  it('keeps only digits and uses the number once all 17 are typed', async () => {
    const { onStudentIdChange, input } = setup();

    await userEvent.type(input, '2015-2691 abc');
    expect(input).toHaveValue('20152691');
    expect(onStudentIdChange).not.toHaveBeenCalled();

    await userEvent.type(input, '234567890');
    expect(input).toHaveValue('20152691234567890');
    expect(onStudentIdChange).toHaveBeenCalledWith('20152691234567890');
  });

  it('stops at 17 digits', async () => {
    const { input } = setup();
    await userEvent.type(input, '2015269123456789012345');
    expect(input).toHaveValue('20152691234567890');
  });

  it('clears the number with the clear button', async () => {
    const { onStudentIdChange, input } = setup('20152691234567890');
    await userEvent.click(screen.getByRole('button', { name: 'Clear number' }));
    expect(input).toHaveValue('');
    expect(onStudentIdChange).toHaveBeenCalledWith('');
  });
});
