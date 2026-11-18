"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { magicLinkAction, signInAction, signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Misc";
import { FormError, useFieldError } from "./PublicForms";
import type { ActionState } from "@/lib/services/public-actions";

const initial: ActionState = { ok: false };

export function SignInForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(signInAction, initial);
  const err = useFieldError(state);
  return (
    <form action={action} className="flex flex-col gap-3" aria-label={t("signInTitle")}>
      <input type="hidden" name="next" value={next} />
      <TextField id="si-email" name="email" type="email" autoComplete="email" required label={t("email")} error={err("email")} />
      <TextField id="si-password" name="password" type="password" autoComplete="current-password" required label={t("password")} error={err("password")} />
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("signInButton")}</Button>
    </form>
  );
}

export function MagicLinkForm({ next }: { next: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(magicLinkAction, initial);
  const err = useFieldError(state);
  if (state.ok) return <Notice tone="success">{t("auth.magicSent")}</Notice>;
  return (
    <form action={action} className="flex flex-col gap-3" aria-label={t("auth.magicTitle")}>
      <input type="hidden" name="next" value={next} />
      <TextField id="ml-email" name="email" type="email" autoComplete="email" required label={t("auth.email")} error={err("email")} />
      <FormError state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>{t("auth.magicButton")}</Button>
    </form>
  );
}

export function SignUpForm({ next, role }: { next: string; role: "parent" | "club" }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(signUpAction, initial);
  const err = useFieldError(state);
  if (state.ok && state.message) return <Notice tone="success">{t(state.message)}</Notice>;
  return (
    <form action={action} className="flex flex-col gap-3" aria-label={t("auth.signUpTitle")}>
      <input type="hidden" name="next" value={next} />
      <fieldset>
        <legend className="font-semibold">{t("auth.role")}</legend>
        {(["parent", "club"] as const).map((r) => (
          <label key={r} className="flex min-h-tap items-center gap-3">
            <input type="radio" name="role" value={r} defaultChecked={r === role} className="size-6 accent-emerald" />
            {r === "parent" ? t("auth.roleParent") : t("auth.roleClub")}
          </label>
        ))}
      </fieldset>
      <TextField id="su-name" name="displayName" autoComplete="name" required label={t("auth.name")} error={err("displayName")} />
      <TextField id="su-email" name="email" type="email" autoComplete="email" required label={t("auth.email")} error={err("email")} />
      <TextField
        id="su-password" name="password" type="password" autoComplete="new-password" required minLength={8}
        label={t("auth.password")} hint={t("auth.passwordHint")} error={err("password")}
      />
      <FormError state={state} />
      <Button type="submit" disabled={pending}>{t("auth.signUpButton")}</Button>
    </form>
  );
}
