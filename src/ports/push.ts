export interface PushSendInput {
  userId: string;
  title: string;
  body: string;
  href?: string;
  idempotencyKey: string;
}

export interface PushPort {
  send(input: PushSendInput): Promise<void>;
  ping?(): Promise<boolean>;
}
