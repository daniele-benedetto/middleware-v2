import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const GLOBALS_CSS = path.join(ROOT, "app", "globals.css");
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set([".git", ".next", "node_modules", "dist", "build", "coverage", "out"]);
const PIXEL_TO_SCALE_UTILITIES = new Set([
  "space-x",
  "space-y",
  "min-w",
  "max-w",
  "min-h",
  "max-h",
  "gap-x",
  "gap-y",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "gap",
  "size",
  "w",
  "h",
  "p",
  "m",
  "inset",
  "inset-x",
  "inset-y",
  "top",
  "right",
  "bottom",
  "left",
  "translate-x",
  "translate-y",
  "scroll-m",
  "scroll-mx",
  "scroll-my",
  "scroll-mt",
  "scroll-mr",
  "scroll-mb",
  "scroll-ml",
  "scroll-p",
  "scroll-px",
  "scroll-py",
  "scroll-pt",
  "scroll-pr",
  "scroll-pb",
  "scroll-pl",
]);

const NEGATIVE_SAFE_UTILITIES = new Set([
  "space-x",
  "space-y",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "m",
  "inset",
  "inset-x",
  "inset-y",
  "top",
  "right",
  "bottom",
  "left",
  "translate-x",
  "translate-y",
  "scroll-m",
  "scroll-mx",
  "scroll-my",
  "scroll-mt",
  "scroll-mr",
  "scroll-mb",
  "scroll-ml",
]);

const GENERIC_VAR_SHORTHAND_UTILITIES = new Set(["leading"]);

function buildColorTokenMap(cssSource) {
  const colorTokenByVar = new Map();
  const matcher = /--color-([a-z0-9-]+)\s*:\s*var\(--([a-z0-9-]+)\)\s*;/gi;

  for (const match of cssSource.matchAll(matcher)) {
    const colorToken = match[1];
    const variableName = match[2];
    if (!colorTokenByVar.has(variableName)) {
      colorTokenByVar.set(variableName, colorToken);
    }
  }

  return colorTokenByVar;
}

async function walkFiles(dirPath, files = []) {
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".vscode") {
      continue;
    }

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      await walkFiles(path.join(dirPath, entry.name), files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(extension)) {
      continue;
    }

    files.push(path.join(dirPath, entry.name));
  }

  return files;
}

function replaceArbitraryColorVarClasses(source, colorTokenByVar) {
  const classPattern =
    /((?:[a-z-]+:)*)(bg|text|border|fill|stroke)-\[(?:color:)?var\(--([a-z0-9-]+)\)\]/gi;

  return source.replace(classPattern, (fullMatch, variants, utility, variableName) => {
    const colorToken = colorTokenByVar.get(variableName);
    if (!colorToken) {
      return fullMatch;
    }
    return `${variants}${utility}-${colorToken}`;
  });
}

function replaceArbitraryCssVarShorthand(source) {
  const classPattern =
    /((?:[a-z-]+:)*)(!?)(bg|text|border|fill|stroke)-\[(?:(color|length):)?var\(--([a-z0-9-]+)\)\](!?)/gi;

  return source.replace(
    classPattern,
    (_fullMatch, variants, importantPrefix, utility, valueHint, variableName, importantSuffix) => {
      const important = importantPrefix === "!" || importantSuffix === "!" ? "!" : "";
      const explicitHint = valueHint ? `${valueHint}:` : "";
      const inferredHint =
        !valueHint && utility === "text" && variableName.startsWith("text-") ? "length:" : "";
      const normalizedHint = explicitHint || inferredHint;
      return `${variants}${utility}-(${normalizedHint}--${variableName})${important}`;
    },
  );
}

function replaceGenericVarShorthand(source) {
  const classPattern =
    /((?:[a-z-]+:)*)(!?)([a-z][a-z0-9-]*)-\[(?:length:)?var\(--([a-z0-9-]+)\)\](!?)/gi;

  return source.replace(
    classPattern,
    (_fullMatch, variants, importantPrefix, utility, variableName, importantSuffix) => {
      const normalizedUtility = utility.toLowerCase();
      if (!GENERIC_VAR_SHORTHAND_UTILITIES.has(normalizedUtility)) {
        return _fullMatch;
      }

      const important = importantPrefix === "!" || importantSuffix === "!" ? "!" : "";
      return `${variants}${normalizedUtility}-(--${variableName})${important}`;
    },
  );
}

function normalizeTailwindVarShorthand(classToken) {
  const important = classToken.endsWith("!") ? "!" : "";
  const withoutImportant = important ? classToken.slice(0, -1) : classToken;

  const { variants, utility: utilityPart } = splitVariantPrefix(withoutImportant);

  const match = utilityPart.match(/^([a-z-]+)-\[(?:color:)?var\(--([a-z0-9-]+)\)\]$/i);
  if (!match) {
    return classToken;
  }

  const utility = match[1];
  const variableName = match[2];
  const supportsVarShorthand =
    utility === "bg" ||
    utility === "text" ||
    utility === "border" ||
    utility === "fill" ||
    utility === "stroke";

  if (!supportsVarShorthand) {
    return classToken;
  }

  return `${variants}${utility}-(--${variableName})${important}`;
}

function normalizeTextLengthVarShorthand(classToken) {
  const important = classToken.endsWith("!") ? "!" : "";
  const withoutImportant = important ? classToken.slice(0, -1) : classToken;
  const { variants, utility } = splitVariantPrefix(withoutImportant);

  const lengthMatch = utility.match(/^text-\(--(text-[a-z0-9-]+)\)$/i);
  if (!lengthMatch) {
    return classToken;
  }

  return `${variants}text-(length:--${lengthMatch[1]})${important}`;
}

function formatScaleValue(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return `${rounded}`.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function toSpacingScaleToken(pxValueRaw) {
  const px = Number.parseFloat(pxValueRaw.replace(/^-/, ""));
  if (!Number.isFinite(px) || px < 0) {
    return null;
  }

  const scale = px / 4;
  if (!Number.isFinite(scale)) {
    return null;
  }

  return formatScaleValue(scale);
}

function splitVariantPrefix(classToken) {
  let bracketDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let lastSeparator = -1;

  for (let i = 0; i < classToken.length; i += 1) {
    const char = classToken[i];
    if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
    else if (char === ":" && bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
      lastSeparator = i;
    }
  }

  if (lastSeparator < 0) {
    return { variants: "", utility: classToken };
  }

  return {
    variants: classToken.slice(0, lastSeparator + 1),
    utility: classToken.slice(lastSeparator + 1),
  };
}

function normalizeImportantModifier(classToken) {
  if (!classToken.includes("!")) {
    return classToken;
  }

  const { variants, utility } = splitVariantPrefix(classToken);

  if (!utility.startsWith("!") || utility.endsWith("!")) {
    return classToken;
  }

  if (!utility.includes("-") && !utility.includes("/")) {
    return classToken;
  }

  if (/[=<>|&(),;{}]/.test(utility)) {
    return classToken;
  }

  if (!/^![a-z0-9][a-z0-9-./\[\]%]*$/i.test(utility)) {
    return classToken;
  }

  return `${variants}${utility.slice(1)}!`;
}

function normalizePxClass(classToken) {
  const important = classToken.endsWith("!") ? "!" : "";
  const withoutImportant = important ? classToken.slice(0, -1) : classToken;

  const { variants, utility: utilityPart } = splitVariantPrefix(withoutImportant);

  const negativePrefix = utilityPart.startsWith("-") ? "-" : "";
  const unsigned = negativePrefix ? utilityPart.slice(1) : utilityPart;
  const match = unsigned.match(/^([a-z-]+)-\[(-?\d+(?:\.\d+)?)px\]$/i);
  if (!match) {
    return classToken;
  }

  const utility = match[1];
  const valueToken = match[2];
  if (!PIXEL_TO_SCALE_UTILITIES.has(utility)) {
    return classToken;
  }

  const valueIsNegative = valueToken.startsWith("-");
  const isNegative = negativePrefix === "-" ? !valueIsNegative : valueIsNegative;
  if (isNegative && !NEGATIVE_SAFE_UTILITIES.has(utility)) {
    return classToken;
  }

  const scale = toSpacingScaleToken(valueToken);
  if (!scale) {
    return classToken;
  }

  const normalizedNegative = isNegative ? "-" : "";
  return `${variants}${normalizedNegative}${utility}-${scale}${important}`;
}

function normalizeClassTokens(source) {
  return source.replace(/[^\s"'`]+/g, (token) => {
    let normalized = token;
    normalized = normalizeImportantModifier(normalized);
    normalized = normalizeTextLengthVarShorthand(normalized);
    normalized = normalizeTailwindVarShorthand(normalized);
    normalized = normalizePxClass(normalized);
    return normalized;
  });
}

function resolveTargetFiles(argvFiles) {
  if (argvFiles.length === 0) {
    return null;
  }

  const absoluteFiles = argvFiles.map((filePath) =>
    path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath),
  );

  return absoluteFiles.filter((filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
  );
}

function parseArgs(argv) {
  const files = [];
  let check = false;

  for (const arg of argv) {
    if (arg === "--check") {
      check = true;
      continue;
    }
    files.push(arg);
  }

  return { check, files };
}

async function main() {
  const { check, files: requestedFiles } = parseArgs(process.argv.slice(2));

  const globalsCss = await readFile(GLOBALS_CSS, "utf8");
  const colorTokenByVar = buildColorTokenMap(globalsCss);

  const explicitTargetFiles = resolveTargetFiles(requestedFiles);
  const sourceFiles = explicitTargetFiles ?? (await walkFiles(ROOT));
  let changedFiles = 0;
  const changedPaths = [];

  for (const filePath of sourceFiles) {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      continue;
    }

    const original = await readFile(filePath, "utf8");
    let updated = original;

    if (colorTokenByVar.size > 0) {
      updated = replaceArbitraryColorVarClasses(updated, colorTokenByVar);
    }
    updated = replaceArbitraryCssVarShorthand(updated);
    updated = replaceGenericVarShorthand(updated);
    updated = normalizeClassTokens(updated);

    if (updated === original) {
      continue;
    }

    changedPaths.push(path.relative(ROOT, filePath));
    if (check) {
      changedFiles += 1;
      continue;
    }

    await writeFile(filePath, updated, "utf8");
    changedFiles += 1;
  }

  if (check) {
    if (changedFiles > 0) {
      console.log("Tailwind class fix needed in:");
      for (const changedPath of changedPaths) {
        console.log(`- ${changedPath}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log("Tailwind class fix check passed.");
    return;
  }

  console.log(`Tailwind class fix complete. Updated ${changedFiles} file(s).`);
}

await main();
