export type Database = {
  public: {
    Tables: {
      words: {
        Row: Word;
        Insert: Omit<Word, "created_at">;
        Update: Partial<Word>;
      };
      noun_forms: {
        Row: NounForm;
        Insert: NounForm;
        Update: Partial<NounForm>;
      };
      verb_forms: {
        Row: VerbForm;
        Insert: VerbForm;
        Update: Partial<VerbForm>;
      };
      adjective_forms: {
        Row: AdjectiveForm;
        Insert: AdjectiveForm;
        Update: Partial<AdjectiveForm>;
      };
      examples: {
        Row: Example;
        Insert: Example;
        Update: Partial<Example>;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      search_latin_words: {
        Args: { input_words: string[] };
        Returns: {
          normalized_form: string;
          latin: string;
          turkish: string | null;
          english: string | null;
          part_of_speech: string;
          via: string;
        }[];
      };
    };
  };
};

export type Word = {
  id: string;
  latin: string;
  english: string | null;
  turkish: string | null;
  part_of_speech: string;
  declension: number | null;
  conjugation: number | null;
  gender: string | null;
  genitive: string | null;
  present_1sg: string | null;
  infinitive: string | null;
  perfect: string | null;
  supine: string | null;
  created_at: string;
};

export type NounForm = {
  id: string;
  word_id: string;
  form: string;
  case: string;
  number: string;
  declension: number | null;
  gender: string | null;
};

export type VerbForm = {
  id: string;
  word_id: string;
  form: string;
  tense: string;
  mood: string;
  voice: string;
  person: number | null;
  number: string | null;
  conjugation: number | null;
};

export type AdjectiveForm = {
  id: string;
  word_id: string;
  form: string;
  case: string;
  number: string;
  gender: string;
};

export type Example = {
  id: string;
  word_id: string;
  latin: string;
  english: string | null;
  turkish: string | null;
};

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "preposition"
  | "conjunction"
  | "pronoun"
  | "numeral"
  | "interjection"
  | "particle";
