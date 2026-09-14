const STORAGE_KEY = "fediverse-atlas-favorites-v1";

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage full/unavailable — favorites just won't persist this session
  }
}

let favorites = read();
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(favorites);
}

export function getFavorites() {
  return favorites;
}

export function isFavorite(domain) {
  return favorites.some((f) => f.domain === domain);
}

export function toggleFavorite(instance) {
  if (isFavorite(instance.domain)) {
    favorites = favorites.filter((f) => f.domain !== instance.domain);
  } else {
    favorites = [
      ...favorites,
      {
        domain: instance.domain,
        software: instance.software,
        contentType: instance.contentType,
        users: instance.users,
        description: instance.description,
        url: instance.url,
      },
    ];
  }
  write(favorites);
  notify();
}

export function onFavoritesChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
