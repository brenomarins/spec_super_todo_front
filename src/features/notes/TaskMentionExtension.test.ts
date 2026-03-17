import { shouldOpenPicker } from './TaskMentionExtension'

test('returns true when @ follows whitespace', () => {
  expect(shouldOpenPicker('hello @', '@')).toBe(true)
})

test('returns true when @ is at start of line', () => {
  expect(shouldOpenPicker('@', '@')).toBe(true)
})

test('returns false when @ is mid-word (e.g. email@)', () => {
  expect(shouldOpenPicker('email@', '@')).toBe(false)
})

test('returns false when triggered character is not @', () => {
  expect(shouldOpenPicker('hello ', 'a')).toBe(false)
})
