import { z } from "zod";
import matter from "gray-matter";

const aipType = z.object({
  discussions: z.string(),
  title: z.string(),
  author: z.string(),
});

/**
 * Validates the aip header and returns the aip title
 * @param content
 * @returns string aip title
 */
export function validateAIPHeader(content: string) {
  const fm = matter(content);
  aipType.parse(fm.data);
  return fm.data.title;
}
