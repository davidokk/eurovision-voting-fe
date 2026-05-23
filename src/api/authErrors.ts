import type { ApiError } from "./auth";

export function formatAuthError(err: ApiError): string {
  switch (err.code) {
    case "INVALID_CODE":
      return "Неверный или просроченный код. Проверьте цифры или запросите новый код.";
    case "USERNAME_TAKEN":
      return "Это имя пользователя уже занято.";
    case "USER_NOT_EXISTS":
      return "Аккаунт с такими данными не найден.";
    case "WRONG_PASSWORD":
      return "Неверный пароль.";
    case "SIGNUP_CLOSED":
      return "Регистрация закрыта :( Возвращайся в следующем году!";
    case "TELEGRAM_NOT_CONFIGURED":
      return "Вход через Telegram временно недоступен.";
    case "TELEGRAM_RATE_LIMIT":
      return "Слишком много кодов в Telegram. Подождите около часа.";
    case "TELEGRAM_SESSION_INVALID":
      return "Сессия устарела. Начните вход заново.";
    case "TELEGRAM_NOT_CONNECTED":
      return "Сначала откройте бота по ссылке и дождитесь кода в Telegram.";
    case "TELEGRAM_ALREADY_LINKED":
      return "Этот Telegram уже привязан к другому аккаунту.";
    case "TELEGRAM_ACCOUNT_NOT_FOUND":
      return "Не удалось войти. Запросите новую ссылку на сайте и повторите.";
    case "VALIDATE":
      return err.message || "Проверьте введённые данные.";
    default:
      if (err.message?.toLowerCase().includes("invalid or expired code")) {
        return "Неверный или просроченный код. Проверьте цифры или запросите новый код.";
      }
      return err.message || "Что-то пошло не так. Попробуйте ещё раз.";
  }
}
