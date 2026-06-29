import { expect, test, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '../app/api/feedback/route';
import * as store from '../lib/store';

// Mock the store so we don't write to the actual file system during tests
vi.mock('../lib/store', () => ({
  readAll: vi.fn(),
  writeAll: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  process.env.ADMIN_KEY = 'test-secret-key';
  store.readAll.mockReturnValue([]);
});

test('GET returns all feedback items', async () => {
  store.readAll.mockReturnValue([{ id: '1', name: 'Test', text: 'Hello', createdAt: '2023-01-01' }]);
  
  const response = await GET();
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data).toHaveLength(1);
  expect(data[0].name).toBe('Test');
});

test('POST with invalid input returns 400', async () => {
  const request = {
    json: async () => ({ name: '', text: 'This should fail because name is empty' })
  };

  const response = await POST(request);
  expect(response.status).toBe(400);
  
  const data = await response.json();
  expect(data.error).toBe('Invalid input');
  expect(store.writeAll).not.toHaveBeenCalled();
});

test('POST with valid input returns 201', async () => {
  const request = {
    json: async () => ({ name: 'Valid User', text: 'Valid feedback text' })
  };

  const response = await POST(request);
  expect(response.status).toBe(201);
  
  const data = await response.json();
  expect(data.name).toBe('Valid User');
  expect(data.text).toBe('Valid feedback text');
  expect(data.id).toBeDefined();
  expect(store.writeAll).toHaveBeenCalledTimes(1);
});

test('DELETE without valid auth header returns 403', async () => {
  const request = {
    json: async () => ({ id: '1' }),
    headers: new Headers({
      'Authorization': 'wrong-key'
    })
  };

  const response = await DELETE(request);
  expect(response.status).toBe(403);
  
  const data = await response.json();
  expect(data.error).toBe('Forbidden');
  expect(store.writeAll).not.toHaveBeenCalled();
});

test('DELETE with valid auth header returns 200', async () => {
  store.readAll.mockReturnValue([{ id: '1', name: 'Test', text: 'Hello' }]);
  
  const request = {
    json: async () => ({ id: '1' }),
    headers: new Headers({
      'Authorization': 'test-secret-key'
    })
  };

  const response = await DELETE(request);
  expect(response.status).toBe(200);
  
  const data = await response.json();
  expect(data.success).toBe(true);
  
  // writeAll should be called with an empty array since the item was deleted
  expect(store.writeAll).toHaveBeenCalledWith([]);
});
