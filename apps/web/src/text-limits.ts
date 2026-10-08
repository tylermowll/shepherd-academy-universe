/** Match the backend's Unicode codepoint limits, including astral characters. */
export function characterCount(text: string) {
  return Array.from(text).length;
}
