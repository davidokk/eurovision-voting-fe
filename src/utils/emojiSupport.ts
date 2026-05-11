export const getDoesBrowserSupportFlagEmojis = (): boolean => {
  const canvas = document.createElement("canvas");
  canvas.height = 1;
  canvas.width = 1;

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.font = `${canvas.height}px sans-serif`;

  const flagEmoji = "🇺🇸";
  ctx.fillText(flagEmoji, 0, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  for (let i = 0; i < imageData.length; i += 4) {
    if (imageData[i + 3] === 0) continue;

    if (
      imageData[i] !== imageData[i + 1] ||
      imageData[i] !== imageData[i + 2]
    ) {
      return true;
    }
  }

  return false;
};