export const LINK_SENT_MESSAGE =
  "Sprawdź skrzynkę. Wysłaliśmy link do logowania.";

export const CALLBACK_ERROR_MESSAGE =
  "Link wygasł albo jest niepoprawny. Poproś o nowy.";

const SIGNUPS_DISABLED_MESSAGE =
  "Rejestracja nowych kont jest wyłączona. Zalogować można się tylko na adres, który ma już konto.";

const PROVIDER_DISABLED_MESSAGE =
  "Logowanie przez Google nie jest jeszcze włączone.";

const RATE_LIMIT_MESSAGE = "Za dużo prób. Spróbuj ponownie za chwilę.";

const EMAIL_SEND_MESSAGE =
  "Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.";

const GENERIC_LOGIN_MESSAGE =
  "Nie udało się zalogować. Spróbuj ponownie za chwilę.";

export function loginErrorMessage(raw: string): string {
  const message = raw.toLowerCase();

  if (message.includes("signups not allowed")) {
    return SIGNUPS_DISABLED_MESSAGE;
  }

  if (
    message.includes("unsupported provider") ||
    (message.includes("not enabled") &&
      (message.includes("provider") || message.includes("google")))
  ) {
    return PROVIDER_DISABLED_MESSAGE;
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return RATE_LIMIT_MESSAGE;
  }

  if (
    message.includes("error sending") ||
    (message.includes("email") && message.includes("send")) ||
    message.includes("smtp")
  ) {
    return EMAIL_SEND_MESSAGE;
  }

  return GENERIC_LOGIN_MESSAGE;
}
