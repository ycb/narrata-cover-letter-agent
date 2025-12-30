import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserDictionaryService, normalizeDictionaryWord } from "@/services/userDictionaryService";
import { useHarperDictionary } from "@/hooks/useHarperDictionary";

const normalizeWords = (words: string[]) =>
  Array.from(new Set(words.map((word) => word.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

const MyLibrary = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { replaceWords } = useHarperDictionary();
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    UserDictionaryService.fetchWords(user.id)
      .then((data) => setWords(normalizeWords(data)))
      .catch((error) => {
        toast({
          title: "Unable to load library",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [toast, user?.id]);

  const canAdd = useMemo(() => newWord.trim().length > 0, [newWord]);

  const handleAdd = async () => {
    if (!user?.id || !canAdd) return;
    const trimmed = normalizeDictionaryWord(newWord);
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await UserDictionaryService.addWord(user.id, trimmed);
      const nextWords = normalizeWords([...words, trimmed]);
      setWords(nextWords);
      await replaceWords(nextWords);
      setNewWord("");
    } catch (error) {
      toast({
        title: "Unable to add word",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (word: string) => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await UserDictionaryService.removeWord(user.id, word);
      const nextWords = normalizeWords(words.filter((item) => item !== word));
      setWords(nextWords);
      await replaceWords(nextWords);
    } catch (error) {
      toast({
        title: "Unable to remove word",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>My Library</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add names, brands, and domain terms so{" "}
            <a href="https://writewithharper.com" target="_blank" rel="noopener noreferrer">
              Harper
            </a>{" "}
            won&apos;t flag them.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Add a word or phrase"
              value={newWord}
              onChange={(event) => setNewWord(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              disabled={isSaving}
            />
            <Button onClick={handleAdd} disabled={!canAdd || isSaving}>
              Add to Library
            </Button>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : words.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No custom words yet. Add your first one above.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {words.map((word) => (
                <div
                  key={word}
                  className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleDelete(word)}
                    aria-label={`Remove ${word}`}
                    disabled={isSaving}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyLibrary;
