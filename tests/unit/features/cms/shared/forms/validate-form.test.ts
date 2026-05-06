import { z } from "zod";

import { validateFormInput } from "@/features/cms/shared/forms/validate-form";
import { i18n } from "@/lib/i18n";

describe("validateFormInput", () => {
  it("returns parsed data on success", () => {
    const schema = z.object({ title: z.string().min(1) });

    expect(validateFormInput(schema, { title: "Hello" })).toEqual({
      ok: true,
      value: { title: "Hello" },
    });
  });

  it("formats required field errors with labels", () => {
    const schema = z.object({ title: z.string().min(1) });

    expect(validateFormInput(schema, { title: "" }, { title: "Titolo" })).toMatchObject({
      ok: false,
      message: i18n.cms.validation.required("Titolo"),
    });
  });

  it("formats array minimum errors", () => {
    const schema = z.object({ tagIds: z.array(z.string()).min(2) });

    expect(validateFormInput(schema, { tagIds: ["a"] }, { tagIds: "Tag" })).toMatchObject({
      ok: false,
      message: i18n.cms.validation.arrayMinimum("Tag", 2),
    });
  });

  it("formats invalid email errors", () => {
    const schema = z.object({ email: z.email() });

    expect(validateFormInput(schema, { email: "not-an-email" }, { email: "Email" })).toMatchObject({
      ok: false,
      message: i18n.cms.validation.invalidEmail("Email"),
    });
  });

  it("falls back to generic message when there are no issues", () => {
    const invalidSchema = {
      safeParse: () => ({ success: false, error: { issues: [] } }),
    } as unknown as z.ZodType<string>;

    expect(validateFormInput(invalidSchema, "x")).toEqual({
      ok: false,
      message: i18n.cms.validation.invalidData,
      issues: [],
    });
  });
});
