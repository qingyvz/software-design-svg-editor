export abstract class Command<Receiver = unknown> {
  protected constructor(protected readonly receiver: Receiver) {}
  abstract execute(): readonly string[];
}
