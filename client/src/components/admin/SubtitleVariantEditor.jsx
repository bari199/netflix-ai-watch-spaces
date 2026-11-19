import { AnimatePresence, motion } from "motion/react";
import { Captions, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, fieldClass, fileClass, selectClass } from "./adminUi.jsx";

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
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="border-white/10 bg-[#181818] text-white shadow-xl shadow-black/20">
        <CardHeader className="border-b border-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/15 text-red-500">
                <Captions size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold">
                  Subtitle / Localization Variants
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Upload pre-authored WebVTT files. Subtitle content is never
                  generated or changed by AI.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange((previous) => [...previous, createDraft()])
              }
              className="gap-1.5 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Plus size={15} />
              Add subtitle variant
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          {variants.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-zinc-500">
              No subtitle variants added.
            </div>
          )}

          <AnimatePresence initial={false}>
            {variants.map((variant, index) => {
              const options =
                variationPoints.find(
                  (event) => event.variationId === variant.variationId,
                )?.options || [];

              return (
                <motion.div
                  key={variant.draftId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4 rounded-xl border border-white/10 bg-[#141414] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      Subtitle variant {index + 1}
                      {variant.variantId && (
                        <Badge
                          variant="outline"
                          className="border-white/15 text-[10px] text-zinc-400"
                        >
                          Saved
                        </Badge>
                      )}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onChange((previous) =>
                          previous.filter(
                            (item) => item.draftId !== variant.draftId,
                          ),
                        )
                      }
                      className="gap-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      compact
                      label="Locale"
                      required
                      htmlFor={`${variant.draftId}-locale`}
                    >
                      <Input
                        id={`${variant.draftId}-locale`}
                        value={variant.locale}
                        onChange={(event) =>
                          updateVariant(variant.draftId, {
                            locale: event.target.value,
                          })
                        }
                        placeholder="en-US"
                        className={fieldClass}
                      />
                    </Field>

                    <Field
                      compact
                      label="Display label"
                      required
                      htmlFor={`${variant.draftId}-label`}
                    >
                      <Input
                        id={`${variant.draftId}-label`}
                        value={variant.label}
                        onChange={(event) =>
                          updateVariant(variant.draftId, {
                            label: event.target.value,
                          })
                        }
                        placeholder="English"
                        className={fieldClass}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field
                      compact
                      label="Timeline event (optional)"
                      htmlFor={`${variant.draftId}-event`}
                    >
                      <select
                        id={`${variant.draftId}-event`}
                        value={variant.eventId}
                        onChange={(event) =>
                          updateVariant(variant.draftId, {
                            eventId: event.target.value,
                          })
                        }
                        className={selectClass}
                      >
                        <option value="">All timeline events</option>
                        {timeline.map((event) => (
                          <option key={event.eventId} value={event.eventId}>
                            {event.eventId}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      compact
                      label="Variation point (optional)"
                      htmlFor={`${variant.draftId}-variation`}
                    >
                      <select
                        id={`${variant.draftId}-variation`}
                        value={variant.variationId}
                        onChange={(event) =>
                          updateVariant(variant.draftId, {
                            variationId: event.target.value,
                            optionId: "",
                          })
                        }
                        className={selectClass}
                      >
                        <option value="">All story outcomes</option>
                        {variationPoints.map((event) => (
                          <option
                            key={event.variationId}
                            value={event.variationId}
                          >
                            {event.variationId}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      compact
                      label="Variation option"
                      htmlFor={`${variant.draftId}-option`}
                      className="sm:col-span-2 lg:col-span-1"
                    >
                      <select
                        id={`${variant.draftId}-option`}
                        value={variant.optionId}
                        onChange={(event) =>
                          updateVariant(variant.draftId, {
                            optionId: event.target.value,
                          })
                        }
                        disabled={!variant.variationId}
                        className={selectClass}
                      >
                        <option value="">Choose an option</option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field
                    compact
                    label={`WebVTT file ${variant.variantId ? "(optional replacement)" : ""}`}
                    htmlFor={`${variant.draftId}-file`}
                    hint={
                      variant.file?.name ||
                      (variant.variantId
                        ? "Existing subtitle file retained"
                        : "Required for a new variant; maximum 5 MB")
                    }
                  >
                    <Input
                      id={`${variant.draftId}-file`}
                      type="file"
                      accept=".vtt,text/vtt"
                      onChange={(event) =>
                        updateVariant(variant.draftId, {
                          file: event.target.files?.[0] || null,
                        })
                      }
                      className={fileClass}
                    />
                  </Field>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.section>
  );
};

export default SubtitleVariantEditor;
