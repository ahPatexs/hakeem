export interface AiEmbeddingsPort {
  /** Embed one or more texts; returns one vector per input (same order). */
  embed(texts: string[]): Promise<number[][]>;
  /** Model identifier recorded on knowledge chunks. */
  readonly model: string;
}
