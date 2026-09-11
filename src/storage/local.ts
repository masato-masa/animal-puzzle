/**
 * localStorage の読み書き。プライベートブラウジングや容量超過では例外が飛ぶため、
 * 呼び出し側が毎回 try/catch を書かずに済むようここで吸収する。
 * 読めなかった場合は「保存されていない」と同じ扱いにする。
 */
export const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
};

/** 書けたら true。容量超過などで書けなくても例外は投げない。 */
export const writeJson = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const removeKey = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* 消せなくても続行する */
  }
};
