export function apiPath(path: string) {
  return `/api/backend/${path.replace(/^\/+/, '')}`;
}
