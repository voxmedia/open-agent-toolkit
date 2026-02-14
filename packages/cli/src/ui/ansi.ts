export function stripAnsi(value: string): string {
  let result = '';
  let index = 0;

  while (index < value.length) {
    if (value.charCodeAt(index) === 27 && value[index + 1] === '[') {
      index += 2;
      while (index < value.length && value[index] !== 'm') {
        index += 1;
      }
      if (index < value.length && value[index] === 'm') {
        index += 1;
      }
      continue;
    }

    result += value[index];
    index += 1;
  }

  return result;
}
