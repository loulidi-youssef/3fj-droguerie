export class TransactionDataUnavailableError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TransactionDataUnavailableError";
    this.code = code;
  }
}
