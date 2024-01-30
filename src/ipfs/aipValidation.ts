import { ZodError, z } from 'zod';
import matter from 'gray-matter';
import { logError } from '../utils/logger';

const aipType = z.object({
  discussions: z.string(),
  title: z.string(),
  author: z.string(),
  snapshot: z.string().optional(),
});

/**
 * Validates the aip header and returns the aip title
 * @param content
 * @returns string aip title
 */
export function validateAIPHeader(content: string) {
  const fm = matter(content);
  try {
    aipType.parse(fm.data);
  } catch (e) {
    logError('AIP', 'AIP validation failed');
    (e as ZodError).issues.map((issue) =>
      logError(
        `AIP`,
        `On field ${issue.path[0]} received ${(issue as any).received} but expected ${(issue as any).expected}`
      )
    );
    throw e;
  }
  return fm.data.title;
}
