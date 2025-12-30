import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { UserDictionaryService, normalizeDictionaryWord } from "@/services/userDictionaryService";
import { importUserDictionaryWord, replaceUserDictionary, syncUserDictionary } from "@/lib/harper/harperClient";

let cachedUserId: string | null = null;
let cachedWords: string[] = [];
let loadPromise: Promise<string[]> | null = null;
let dictionaryVersion = 0;
const listeners = new Set<(version: number) => void>();

const bumpVersion = () => {
  dictionaryVersion += 1;
  listeners.forEach((listener) => listener(dictionaryVersion));
};

export const useHarperDictionary = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isReady, setIsReady] = useState(false);
  const [version, setVersion] = useState(dictionaryVersion);
  const [words, setWords] = useState<string[]>(cachedWords);

  useEffect(() => {
    const handleUpdate = (nextVersion: number) => {
      setVersion(nextVersion);
      setWords(cachedWords);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsReady(false);
      setWords([]);
      return;
    }

    if (cachedUserId === userId && cachedWords.length > 0) {
      setWords(cachedWords);
      syncUserDictionary(userId, cachedWords).then(bumpVersion);
      setIsReady(true);
      return;
    }

    if (!loadPromise || cachedUserId !== userId) {
      cachedUserId = userId;
      loadPromise = UserDictionaryService.fetchWords(userId).then((words) => {
        cachedWords = words;
        return words;
      });
    }

    loadPromise
      .then((words) => syncUserDictionary(userId, words))
      .then(bumpVersion)
      .then(() => setIsReady(true))
      .catch(() => setIsReady(false));
  }, [userId]);

  const addWord = async (word: string) => {
    if (!userId) return;
    const trimmed = normalizeDictionaryWord(word);
    if (!trimmed) return;

    await UserDictionaryService.addWord(userId, trimmed);
    if (!cachedWords.includes(trimmed)) {
      cachedWords = [...cachedWords, trimmed];
    }
    setWords(cachedWords);
    await importUserDictionaryWord(userId, trimmed);
    bumpVersion();
  };

  const replaceWords = async (words: string[]) => {
    if (!userId) return;
    cachedWords = words;
    setWords(words);
    await replaceUserDictionary(userId, words);
    bumpVersion();
  };

  return {
    addWord,
    replaceWords,
    canAdd: Boolean(userId),
    isReady,
    version,
    words,
  };
};
