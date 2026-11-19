import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

/* Shared dark-theme class names for shadcn inputs (explicit so they look
   right even if your shadcn theme tokens are light). */
export const fieldClass =
  "h-10 w-full border-white/10 bg-[#101010] px-3 text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:border-red-500/70 focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:ring-offset-0";

export const textareaClass =
  "min-h-[96px] w-full border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white shadow-none placeholder:text-zinc-500 focus-visible:border-red-500/70 focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:ring-offset-0";

export const selectClass =
  "h-10 w-full rounded-md border border-white/10 bg-[#101010] px-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-red-500/70 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50";

export const fileClass =
  "h-auto w-full cursor-pointer border-white/10 bg-[#101010] py-2 text-sm text-zinc-300 shadow-none file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-red-500 focus-visible:ring-red-500/20";

export const PageHeader = ({ eyebrow, title, description, children }) => (
  <motion.div
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="flex flex-wrap items-start justify-between gap-4"
  >
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-400">
          {description}
        </p>
      )}
    </div>
    {children}
  </motion.div>
);

export const ErrorAlert = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        key="error-alert"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <Alert className="border-red-500/30 bg-red-500/10 text-red-300 [&>svg]:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </motion.div>
    )}
  </AnimatePresence>
);

export const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
  className = "",
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    <Card
      className={`border-white/10 bg-[#181818] text-white shadow-xl shadow-black/20 ${className}`}
    >
      <CardHeader className="border-b border-white/5 p-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/15 text-red-500">
              <Icon size={18} />
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-0.5 text-xs text-zinc-400">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">{children}</CardContent>
    </Card>
  </motion.div>
);

export const Field = ({
  label,
  htmlFor,
  required,
  hint,
  compact = false,
  className = "",
  children,
}) => (
  <div className={className}>
    <Label
      htmlFor={htmlFor}
      className={
        compact
          ? "mb-1.5 flex text-xs font-medium text-zinc-400"
          : "mb-2 flex text-sm font-medium text-zinc-300"
      }
    >
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </Label>
    {children}
    {hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
  </div>
);
