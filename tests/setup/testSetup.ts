import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock server para simular AWS LocalStack
export const mockServer = setupServer(
  // Mock SQS operations
  http.post('http://localhost:4566/*', async ({ request }) => {
    const url = new URL(request.url);
    const action = url.searchParams.get('Action');
    
    switch (action) {
      case 'CreateQueue':
        return HttpResponse.xml(`
          <?xml version="1.0"?>
          <CreateQueueResponse>
            <CreateQueueResult>
              <QueueUrl>http://localhost:4566/queue/test-queue</QueueUrl>
            </CreateQueueResult>
          </CreateQueueResponse>
        `);
        
      case 'ReceiveMessage':
        return HttpResponse.xml(`
          <?xml version="1.0"?>
          <ReceiveMessageResponse>
            <ReceiveMessageResult>
            </ReceiveMessageResult>
          </ReceiveMessageResponse>
        `);
        
      case 'DeleteMessage':
        return HttpResponse.xml(`
          <?xml version="1.0"?>
          <DeleteMessageResponse>
          </DeleteMessageResponse>
        `);
        
      default:
        return new HttpResponse(null, { status: 400 });
    }
  }),

  // Mock S3 operations
  http.get('http://localhost:4566/poc-bucket/*', () => {
    return HttpResponse.arrayBuffer(
      new ArrayBuffer(1024) // Mock video file content
    );
  }),

  http.put('http://localhost:4566/poc-bucket/*', () => {
    return new HttpResponse(null, { status: 200 });
  })
);

// Mock FFmpeg para testes
export const mockFFmpeg = () => {
  return {
    spawn: jest.fn().mockImplementation(() => ({
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Success exit code
        }
      })
    }))
  };
};

// Setup global para testes
beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());
