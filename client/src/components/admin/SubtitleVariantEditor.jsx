const createDraft = () => ({
  draftId: `subtitle-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  locale: "",
  label: "",
  eventId: "",
  variationId: "",
  optionId: "",
  file: null,
});

const SubtitleVariantEditor = ({ variants, onChange, timeline }) => {
  const updateVariant = (draftId, changes) => {
    onChange((previous) =>
      previous.map((variant) =>
        variant.draftId === draftId ? { ...variant, ...changes } : variant,
      ),
    );
  };

  const variationPoints = timeline.filter(
    (event) => event.eventType === "variationPoint",
  );

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-[#181818] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Subtitle / Localization Variants</h2>
          <p className="mt-1 text-xs text-gray-400">
            Upload pre-authored WebVTT files. Subtitle content is never generated
            or changed by AI.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange((previous) => [...previous, createDraft()])}
          className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
        >
          Add subtitle variant
        </button>
      </div>

      {variants.length === 0 && (
        <p className="text-sm text-gray-500">No subtitle variants added.</p>
      )}

      {variants.map((variant, index) => {
        const options =
          variationPoints.find(
            (event) => event.variationId === variant.variationId,
          )?.options || [];

        return (
          <div
            key={variant.draftId}
            className="space-y-3 rounded-lg border border-white/10 bg-[#202020] p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Subtitle variant {index + 1}
              </h3>
              <button
                type="button"
                onClick={() =>
                  onChange((previous) =>
                    previous.filter(
                      (item) => item.draftId !== variant.draftId,
                    ),
                  )
                }
                className="text-sm text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-gray-400">
                Locale *
                <input
                  value={variant.locale}
                  onChange={(event) =>
                    updateVariant(variant.draftId, {
                      locale: event.target.value,
                    })
                  }
                  placeholder="en-US"
                  className="mt-1 w-full rounded border border-white/10 bg-[#141414] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-gray-400">
                Display label *
                <input
                  value={variant.label}
                  onChange={(event) =>
                    updateVariant(variant.draftId, {
                      label: event.target.value,
                    })
                  }
                  placeholder="English"
                  className="mt-1 w-full rounded border border-white/10 bg-[#141414] px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-gray-400">
                Timeline event (optional)
                <select
                  value={variant.eventId}
                  onChange={(event) =>
                    updateVariant(variant.draftId, {
                      eventId: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded border border-white/10 bg-[#141414] px-3 py-2 text-sm text-white"
                >
                  <option value="">All timeline events</option>
                  {timeline.map((event) => (
                    <option key={event.eventId} value={event.eventId}>
                      {event.eventId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-400">
                Variation point (optional)
                <select
                  value={variant.variationId}
                  onChange={(event) =>
                    updateVariant(variant.draftId, {
                      variationId: event.target.value,
                      optionId: "",
                    })
                  }
                  className="mt-1 w-full rounded border border-white/10 bg-[#141414] px-3 py-2 text-sm text-white"
                >
                  <option value="">All story outcomes</option>
                  {variationPoints.map((event) => (
                    <option key={event.variationId} value={event.variationId}>
                      {event.variationId}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-400">
                Variation option
                <select
                  value={variant.optionId}
                  onChange={(event) =>
                    updateVariant(variant.draftId, {
                      optionId: event.target.value,
                    })
                  }
                  disabled={!variant.variationId}
                  className="mt-1 w-full rounded border border-white/10 bg-[#141414] px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  <option value="">Choose an option</option>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-xs text-gray-400">
              WebVTT file {variant.variantId && "(optional replacement)"}
              <input
                type="file"
                accept=".vtt,text/vtt"
                onChange={(event) =>
                  updateVariant(variant.draftId, {
                    file: event.target.files?.[0] || null,
                  })
                }
                className="mt-1 block w-full rounded border border-white/10 bg-[#141414] p-2 text-sm text-white"
              />
              <span className="mt-1 block text-gray-500">
                {variant.file?.name ||
                  (variant.variantId
                    ? "Existing subtitle file retained"
                    : "Required for a new variant; maximum 5 MB")}
              </span>
            </label>
          </div>
        );
      })}
    </section>
  );
};

export default SubtitleVariantEditor;
