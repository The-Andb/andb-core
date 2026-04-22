import { z } from 'zod';

export interface AIToolDefinition<T extends z.ZodTypeAny = any> {
  name: string;
  description: string;
  inputSchema: T;
  handler: (input: z.infer<T>, context?: any) => Promise<any>;
}
