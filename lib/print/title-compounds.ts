const WORD_JOINER = "\u2060";

/** Keep a short hyphenated title word intact without changing its visible hyphen. */
export function protectPrintTitleCompounds(text: string) {
  return text.replace(/\p{L}+(?:-\p{L}+)+/gu, (compound) =>
    compound.length <= 20 ? compound.replaceAll("-", `${WORD_JOINER}-${WORD_JOINER}`) : compound,
  );
}
