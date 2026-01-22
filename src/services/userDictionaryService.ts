import { supabase } from "@/lib/supabase";
import { SoftDeleteService } from "@/services/softDeleteService";

export const normalizeDictionaryWord = (word: string) =>
  word.trim().replace(/^[^A-Za-z0-9'-]+|[^A-Za-z0-9'-]+$/g, "");

export const UserDictionaryService = {
  async fetchWords(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("user_dictionary_words")
      .select("word")
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => row.word).filter(Boolean);
  },

  async addWord(userId: string, word: string): Promise<void> {
    const trimmed = normalizeDictionaryWord(word);
    if (!trimmed) return;

    const { error } = await supabase
      .from("user_dictionary_words")
      .upsert(
        { user_id: userId, word: trimmed },
        { onConflict: "user_id,word" }
      );

    if (error) {
      throw error;
    }
  },

  async removeWord(userId: string, word: string): Promise<void> {
    const trimmed = normalizeDictionaryWord(word);
    if (!trimmed) return;

    const { data: rows, error: fetchError } = await supabase
      .from("user_dictionary_words")
      .select("*")
      .eq("user_id", userId)
      .eq("word", trimmed);

    if (fetchError) {
      throw fetchError;
    }

    if (rows && rows.length > 0) {
      await SoftDeleteService.archiveRows({
        userId,
        sourceTable: "user_dictionary_words",
        rows,
        sourceIdResolver: (row) => `${userId}:${row.word as string}`
      });
    }

    const { error } = await supabase
      .from("user_dictionary_words")
      .delete()
      .eq("user_id", userId)
      .eq("word", trimmed);

    if (error) {
      throw error;
    }
  },
};
