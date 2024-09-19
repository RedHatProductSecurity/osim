import { setupServer } from 'msw/node';
declare const handlers: Array<Parameters<typeof setupServer>[0]>;