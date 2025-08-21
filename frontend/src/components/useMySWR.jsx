import useSWR from 'swr'

import fetcher from "@/lib/fetcher";

export default function useMySWR(url) {
  return useSWR(url, fetcher);
}