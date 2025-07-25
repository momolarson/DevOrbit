// Basic smoke test to verify Jest setup
test('Jest is working correctly', () => {
  expect(1 + 1).toBe(2);
});

// Simple utility function test
test('array operations work', () => {
  const arr = [1, 2, 3];
  expect(arr.length).toBe(3);
  expect(arr[0]).toBe(1);
});