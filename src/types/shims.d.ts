// Temporary shims to quiet editor errors before `npm install`.
// These will be superseded by real @types packages after installing dependencies.

declare module 'zod';
declare module 'openai';
declare module 'openai/resources/chat/completions';
declare module 'uuid';
declare module 'cors';
declare module 'helmet';
declare module 'express-rate-limit';
declare module 'pino';
declare module 'dotenv/config';

declare const process: any;
