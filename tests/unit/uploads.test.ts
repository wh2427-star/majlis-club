import { describe, expect, it } from "vitest";
import { checkUploadFile, isValidUploadPath } from "@/lib/domain/uploads";

const club = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const file = "33333333-3333-4333-8333-333333333333";

describe("upload rules", () => {
  it("accepts allowed types within size and rejects the rest", () => {
    expect(checkUploadFile("photo", { size: 1000, type: "image/png" })).toEqual({ ext: "png" });
    expect(checkUploadFile("photo", { size: 6 * 1024 * 1024, type: "image/png" })).toEqual({ error: "errors.fileType" });
    expect(checkUploadFile("photo", { size: 1000, type: "application/pdf" })).toEqual({ error: "errors.fileType" });
    expect(checkUploadFile("licence", { size: 9 * 1024 * 1024, type: "application/pdf" })).toEqual({ ext: "pdf" });
    expect(checkUploadFile("licence", null)).toEqual({ error: "errors.file" });
  });

  it("only accepts stored paths inside the club's own folder", () => {
    expect(isValidUploadPath("photo", club, `${club}/${file}.png`)).toBe(true);
    expect(isValidUploadPath("photo", club, `${other}/${file}.png`)).toBe(false);
    expect(isValidUploadPath("photo", club, `${club}/${file}.pdf`)).toBe(false);
    expect(isValidUploadPath("licence", club, `${club}/../${other}/${file}.pdf`)).toBe(false);
    expect(isValidUploadPath("licence", club, `${club}/${file}.pdf`)).toBe(true);
  });
});
