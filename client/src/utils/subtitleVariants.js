export const validateSubtitleVariants = (variants, timeline) => {
  const supportedEvents = new Set(
    (Array.isArray(timeline) ? timeline : []).map((event) => event.eventId),
  );
  const identities = new Set();

  for (const [index, variant] of variants.entries()) {
    const locale = String(variant.locale || "").trim();
    const label = String(variant.label || "").trim();
    const identity = [
      locale.toLowerCase(),
      variant.eventId || "",
      variant.variationId || "",
      variant.optionId || "",
    ].join(":");

    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) || !label) {
      return `Subtitle variant ${index + 1} needs a valid locale and label.`;
    }

    if (!variant.variantId && !variant.file) {
      return `Select a WebVTT (.vtt) file for subtitle variant ${index + 1}.`;
    }

    if (
      variant.file &&
      (!variant.file.name.toLowerCase().endsWith(".vtt") ||
        !["text/vtt", "application/octet-stream"].includes(
          variant.file.type || "application/octet-stream",
        ))
    ) {
      return "Subtitle files must be WebVTT (.vtt).";
    }

    if (variant.eventId && !supportedEvents.has(variant.eventId)) {
      return `Subtitle variant ${index + 1} references an unknown timeline event.`;
    }

    if (variant.optionId && !variant.variationId) {
      return `Subtitle variant ${index + 1} needs a variation point for its option.`;
    }

    if (identities.has(identity)) {
      return "Subtitle variants must have unique locale associations.";
    }
    identities.add(identity);
  }

  return "";
};

export const prepareSubtitleVariantSubmission = (variants) => {
  const files = [];
  const payload = variants.map((variant) => {
    const item = {
      variantId: variant.variantId || undefined,
      locale: variant.locale.trim(),
      label: variant.label.trim(),
      eventId: variant.eventId || undefined,
      variationId: variant.variationId || undefined,
      optionId: variant.optionId || undefined,
    };

    if (variant.file) {
      item.fileIndex = files.push(variant.file) - 1;
    }

    return item;
  });

  return { variants: payload, files };
};
