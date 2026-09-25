import { createHash, randomUUID } from "node:crypto";

import pg from "pg";

const { Client } = pg;
const slug = "questionario-demo-grafici";
const issueId = "28800dc8-1cc6-4867-8876-84a88828e94b";
const questionnaireId = randomUUID();
const submittedAt = new Date("2026-09-25T12:00:00.000Z");

const fieldIds = Object.fromEntries(
  [
    "boolean",
    "single",
    "multiple",
    "scale",
    "integerDiscrete",
    "integerHistogram",
    "decimal",
    "date",
    "datetime",
    "hours",
  ].map((name) => [name, randomUUID()]),
);

const optionIds = {
  single: [randomUUID(), randomUUID(), randomUUID()],
  multiple: [randomUUID(), randomUUID(), randomUUID(), randomUUID()],
};

const copy = {
  introduction: "Una raccolta dimostrativa per verificare tutte le visualizzazioni dei risultati.",
  privacyNotice: "Dati sintetici creati per la demo.",
  progressLabel: "Sezione {current} di {total}",
  backLabel: "Indietro",
  nextLabel: "Avanti",
  submitLabel: "Invia risposte",
  requiredFieldsMessage: "Compila i campi obbligatori.",
  resumeMessage: "Puoi riprendere il questionario da questo dispositivo.",
  successTitle: "Risposte ricevute",
  successMessage: "Grazie per aver partecipato alla demo.",
  alreadySubmittedTitle: "Risposta già inviata",
  alreadySubmittedMessage: "Questo dispositivo ha già inviato una risposta.",
  closedTitle: "Questionario chiuso",
  closedMessage: "Questo questionario non accetta più risposte.",
  resultsTitle: "Risultati",
  resultsEmptyMessage: "Nessun risultato disponibile.",
};

const fieldBase = (id, label) => ({
  id,
  label,
  description: "Domanda dimostrativa.",
  required: false,
  publicResults: true,
});

const fields = [
  {
    ...fieldBase(fieldIds.boolean, "Hai già visitato il quartiere? (booleano)"),
    type: "boolean",
    trueLabel: "Sì",
    falseLabel: "No",
  },
  {
    ...fieldBase(fieldIds.single, "Quale area frequenti di più? (scelta singola)"),
    type: "singleChoice",
    options: [
      { id: optionIds.single[0], label: "Zona nord" },
      { id: optionIds.single[1], label: "Zona centrale" },
      { id: optionIds.single[2], label: "Zona sud" },
    ],
  },
  {
    ...fieldBase(fieldIds.multiple, "Quali risorse utilizzi? (scelta multipla)"),
    type: "multipleChoice",
    options: [
      { id: optionIds.multiple[0], label: "Biblioteca" },
      { id: optionIds.multiple[1], label: "Spazi verdi" },
      { id: optionIds.multiple[2], label: "Trasporto pubblico" },
      { id: optionIds.multiple[3], label: "Servizi di prossimità" },
    ],
  },
  {
    ...fieldBase(fieldIds.scale, "Quanto senti accessibile il quartiere? (scala)"),
    type: "scale",
    min: 1,
    max: 5,
    step: 1,
    minLabel: "Per nulla",
    maxLabel: "Molto",
  },
  {
    ...fieldBase(fieldIds.integerDiscrete, "Quanti incontri frequenti al mese? (intero discreto)"),
    type: "integer",
    integerVisualization: "discrete",
    min: 0,
    max: 6,
  },
  {
    ...fieldBase(
      fieldIds.integerHistogram,
      "Quanti minuti impieghi per arrivare? (intero, istogramma)",
    ),
    type: "integer",
    integerVisualization: "histogram",
    min: 0,
    max: 120,
  },
  {
    ...fieldBase(fieldIds.decimal, "Quanto valuti la qualità dello spazio? (decimale, istogramma)"),
    type: "decimal",
    min: 0,
    max: 10,
    step: 0.1,
  },
  {
    ...fieldBase(
      fieldIds.date,
      "Quando hai iniziato a frequentare la zona? (data, distribuzione temporale)",
    ),
    type: "date",
    temporalMeaning: "distribution",
    timeDetail: "none",
  },
  {
    ...fieldBase(
      fieldIds.datetime,
      "Quando hai compilato la mappa? (data e ora, distribuzione temporale)",
    ),
    type: "datetime",
    temporalMeaning: "event",
    timeDetail: "none",
  },
  {
    ...fieldBase(
      fieldIds.hours,
      "In quale fascia oraria frequenti il quartiere? (data e ora, fasce orarie)",
    ),
    type: "datetime",
    temporalMeaning: "event",
    timeDetail: "hourOfDay",
  },
];

const definition = {
  version: 1,
  copy,
  steps: [
    {
      id: randomUUID(),
      title: "Profilo demo",
      description: "Dieci domande per testare i grafici.",
      fields,
    },
  ],
};

const answers = Array.from({ length: 12 }, (_, index) => ({
  [fieldIds.boolean]: index % 3 !== 0,
  [fieldIds.single]: optionIds.single[index % 3],
  [fieldIds.multiple]: [
    optionIds.multiple[index % 4],
    ...(index % 2 === 0 ? [optionIds.multiple[1]] : []),
    ...(index % 3 === 0 ? [optionIds.multiple[2]] : []),
  ],
  [fieldIds.scale]: [1, 2, 3, 4, 5, 3, 4, 2, 5, 1, 4, 3][index],
  [fieldIds.integerDiscrete]: [0, 1, 2, 3, 4, 5, 2, 3, 1, 4, 6, 2][index],
  [fieldIds.integerHistogram]: [8, 15, 23, 31, 44, 52, 67, 75, 81, 90, 105, 118][index],
  [fieldIds.decimal]: [1.2, 2.5, 3.1, 4.4, 5, 5.8, 6.2, 7.1, 7.8, 8.6, 9.3, 10][index],
  [fieldIds.date]: `2026-${String((index % 6) + 1).padStart(2, "0")}-${String((index % 9) + 1).padStart(2, "0")}`,
  [fieldIds.datetime]: `2026-09-${String(index + 1).padStart(2, "0")}T${String(8 + index).padStart(2, "0")}:30:00+02:00`,
  [fieldIds.hours]: `2026-09-25T${String([8, 9, 10, 12, 13, 15, 16, 18, 19, 20, 21, 22][index]).padStart(2, "0")}:00:00+02:00`,
}));

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");

  const existing = await client.query("SELECT id FROM questionnaires WHERE slug = $1", [slug]);
  if (existing.rowCount) throw new Error(`Questionnaire slug already exists: ${slug}`);

  await client.query(
    `INSERT INTO questionnaires
      (id, title, slug, "descriptionRich", definition, "homeVariant", status,
       "publishedAt", "closedAt", "firstResponseAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11, $11)`,
    [
      questionnaireId,
      "Questionario demo: leggere i dati del quartiere",
      slug,
      JSON.stringify(null),
      JSON.stringify(definition),
      "black",
      "CLOSED",
      submittedAt,
      submittedAt,
      submittedAt,
      submittedAt,
    ],
  );

  for (const [index, answer] of answers.entries()) {
    const anonymousTokenHash = createHash("sha256")
      .update(`questionario-demo-${index + 1}`)
      .digest("hex");

    await client.query(
      `INSERT INTO questionnaire_responses
        (id, "questionnaireId", "schemaVersion", "definitionSnapshot",
         "anonymousTokenHash", answers, "submittedAt")
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7)`,
      [
        randomUUID(),
        questionnaireId,
        1,
        JSON.stringify(definition),
        anonymousTokenHash,
        JSON.stringify(answer),
        new Date(submittedAt.getTime() + index * 3_600_000),
      ],
    );
  }

  const issue = await client.query(`SELECT "homeBlocks" FROM issues WHERE id = $1 FOR UPDATE`, [
    issueId,
  ]);
  if (issue.rowCount !== 1) throw new Error(`Issue not found: ${issueId}`);

  const blocks = Array.isArray(issue.rows[0].homeBlocks) ? issue.rows[0].homeBlocks : [];
  if (blocks.some((block) => block?.type === "questionnaireAnalysis")) {
    throw new Error("The current issue already has a questionnaire analysis block");
  }

  blocks.push({
    id: `questionnaire-analysis-${questionnaireId.slice(0, 8)}`,
    type: "questionnaireAnalysis",
    questionnaireId,
  });

  await client.query(`UPDATE issues SET "homeBlocks" = $1::jsonb WHERE id = $2`, [
    JSON.stringify(blocks),
    issueId,
  ]);

  await client.query("COMMIT");
  console.log(JSON.stringify({ questionnaireId, slug, responses: answers.length, issueId }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
