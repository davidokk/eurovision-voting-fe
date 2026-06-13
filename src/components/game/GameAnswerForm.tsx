import { useState } from "react";
import { Loader2, Send } from "lucide-react";

type Props = {
  onSubmit: (answer: string) => Promise<void>;
  disabled?: boolean;
  inputBg: string;
  border: string;
  textColor: string;
};

export function GameAnswerForm({ onSubmit, disabled, inputBg, border, textColor }: Props) {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || loading || disabled) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setAnswer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="gts-answer-form" onSubmit={(e) => void handleSubmit(e)}>
      <input
        className="gts-answer-form__input"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Страна, исполнитель или песня…"
        maxLength={200}
        disabled={loading || disabled}
        style={{ background: inputBg, border, color: textColor }}
        autoFocus
      />
      <button type="submit" className="gts-btn gts-btn--primary gts-answer-form__btn" disabled={loading || disabled || !answer.trim()}>
        {loading ? <Loader2 size={16} className="gts-spin" /> : <Send size={16} />}
        Отправить
      </button>
      {error && <p className="gts-answer-form__error">{error}</p>}
    </form>
  );
}
