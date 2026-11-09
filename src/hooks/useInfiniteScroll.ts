import { useEffect, useRef, useState } from 'react';

export function useInfiniteScroll<T>(items: T[], pageSize: number) {
  const [visible, setVisible] = useState<T[]>(items.slice(0, pageSize));
  const [hasMore, setHasMore] = useState(items.length > pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisible(items.slice(0, pageSize));
    setHasMore(items.length > pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => {
            const nextLen = v.length + pageSize;
            const next = items.slice(0, nextLen);
            setHasMore(items.length > nextLen);
            return next;
          });
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, items, pageSize]);

  return { visible, sentinelRef, hasMore };
}
