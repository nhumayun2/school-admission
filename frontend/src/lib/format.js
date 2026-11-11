export const isValidStudentId = (s) => /^\d{17}$/.test(s || '');

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
