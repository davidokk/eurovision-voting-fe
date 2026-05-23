import type { ApiError } from "./auth";

export function formatAuthError(err: ApiError): string {
  switch (err.code) {
    case "INVALID_CODE":
      return "Неверный или просроченный код. Проверьте цифры или запросите новый код.";
    case "EMAIL_RATE_LIMIT":
      return "Слишком много писем на этот адрес. Можно отправить не больше 5 писем в час — попробуйте позже.";
    case "EMAIL_TAKEN":
      return "Этот email уже зарегистрирован.";
    case "USERNAME_TAKEN":
      return "Это имя пользователя уже занято.";
    case "USER_NOT_EXISTS":
      return "Аккаунт с такими данными не найден.";
    case "WRONG_PASSWORD":
      return "Неверный пароль.";
    case "SIGNUP_CLOSED":
      return "Регистрация закрыта.";
    case "EMAIL_NOT_CONFIGURED":
      return "Отправка писем временно недоступна. Попробуйте позже.";
    case "VALIDATE":
      return err.message || "Проверьте введённые данные.";
    default:
      if (err.message?.toLowerCase().includes("invalid or expired code")) {
        return "Неверный или просроченный код. Проверьте цифры или запросите новый код.";
      }
      return err.message || "Что-то пошло не так. Попробуйте ещё раз.";
  }
}
