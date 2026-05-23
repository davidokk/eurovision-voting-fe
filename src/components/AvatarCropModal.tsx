import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Theme } from "../types/contest";

const OUTPUT_SIZE = 512;
const VIEW_SIZE = 280;

type Props = {
  open: boolean;
  file: File | null;
  theme: Theme;
  onClose: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
};

export function AvatarCropModal({ open, file, theme, onClose, onConfirm }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [baseCover, setBaseCover] = useState(1);

  const isLight = theme === "light";
  const isGray = theme === "dark-gray";
  const paperBg = isLight ? "#fff" : isGray ? "#1c1c1c" : "#0f172a";
  const border = isLight ? "1px solid #e2e8f0" : "1px solid #334155";
  const text = isLight ? "#0f172a" : "#e2e8f0";
  const sub = isLight ? "#64748b" : "#94a3b8";

  useEffect(() => {
    if (!open || !file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    const cover = Math.max(VIEW_SIZE / img.naturalWidth, VIEW_SIZE / img.naturalHeight);
    setBaseCover(cover);
    setScale(cover);
    setOffset({ x: 0, y: 0 });
  }, []);

  const renderCrop = useCallback(() => {
    const img = imgRef.current;
    if (!img || !natural.w) return null;

    const dispW = natural.w * scale;
    const dispH = natural.h * scale;
    const left = VIEW_SIZE / 2 - dispW / 2 + offset.x;
    const top = VIEW_SIZE / 2 - dispH / 2 + offset.y;

    return { dispW, dispH, left, top };
  }, [natural, scale, offset]);

  const cropPreview = renderCrop();

  async function handleSave() {
    const img = imgRef.current;
    if (!img || !cropPreview) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = OUTPUT_SIZE / VIEW_SIZE;
    const { dispW, dispH, left, top } = cropPreview;

    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      img,
      left * ratio,
      top * ratio,
      dispW * ratio,
      dispH * ratio
    );

    setSaving(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("canvas empty"))),
          "image/jpeg",
          0.92
        );
      });
      await onConfirm(blob);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open || !file) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: paperBg,
          border,
          borderRadius: 24,
          padding: "24px 20px 20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 6px", color: text, fontSize: 18, fontWeight: 800, textAlign: "center" }}>
          Аватар
        </h3>
        <p style={{ margin: "0 0 16px", color: sub, fontSize: 13, textAlign: "center", lineHeight: 1.4 }}>
          Перетащите фото и отрегулируйте масштаб. Кадр — круглый.
        </p>

        <div
          style={{
            position: "relative",
            width: VIEW_SIZE,
            height: VIEW_SIZE,
            margin: "0 auto 16px",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#000",
            border: "3px solid rgba(79,124,255,0.5)",
            boxShadow: "0 0 0 4px rgba(79,124,255,0.15)",
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
          onPointerDown={(e) => {
            setDragging(true);
            dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            setOffset({
              x: dragStart.current.ox + (e.clientX - dragStart.current.x),
              y: dragStart.current.oy + (e.clientY - dragStart.current.y),
            });
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {imageUrl && (
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                userSelect: "none",
                pointerEvents: "none",
                ...(cropPreview
                  ? {
                      width: cropPreview.dispW,
                      height: cropPreview.dispH,
                      left: cropPreview.left,
                      top: cropPreview.top,
                    }
                  : {
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }),
              }}
            />
          )}
        </div>

        {natural.w > 0 && (
          <label style={{ display: "block", marginBottom: 16, color: sub, fontSize: 12, fontWeight: 600 }}>
            Масштаб
            <input
              type="range"
              min={baseCover * 0.6}
              max={baseCover * 2.2}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              style={{ width: "100%", marginTop: 6, accentColor: "#4f7cff" }}
            />
          </label>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border,
              background: "transparent",
              color: sub,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={saving || !natural.w}
            onClick={() => void handleSave()}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #4f7cff, #7c4dff)",
              color: "#fff",
              fontWeight: 800,
              cursor: saving ? "wait" : "pointer",
              opacity: saving || !natural.w ? 0.6 : 1,
            }}
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
