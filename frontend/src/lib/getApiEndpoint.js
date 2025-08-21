import urlJoin from './urlJoin';

const DJANGO_API_URL = process.env.DJANGO_API_URL;


export default function getApiEndpoint(path, urlSearchString) {
  const endpoint = urlJoin(DJANGO_API_URL, path);
  const url = new URL(endpoint);
  const searchString = urlSearchString ? `?${urlSearchString}` : '';
  return url.toString() + searchString;
}