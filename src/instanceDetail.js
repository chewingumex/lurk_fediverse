const cache = new Map();

export function fetchInstanceDetail(domain, software) {
  const key = `${software}:${domain}`;
  if (cache.has(key)) return cache.get(key);

  const promise = fetch(`/api/instance-detail?${new URLSearchParams({ domain, software })}`)
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, promise);
  return promise;
}
