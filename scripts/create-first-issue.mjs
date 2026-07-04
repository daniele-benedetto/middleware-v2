import { randomUUID } from "node:crypto";

import { config } from "dotenv";
import { Client } from "pg";

config({ quiet: true });

const connectionString =
  process.env.POSTGRES_URL ?? process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL, PRISMA_DATABASE_URL or DATABASE_URL is required");
}

const now = new Date();
const issuePublishedAt = new Date("2026-06-29T10:00:00.000Z");
const seedArticleImageUrl =
  process.env.SEED_ARTICLE_IMAGE_URL ?? "/api/public/media/blob?pathname=jolly-roger.jpg";
const seedArticleImageAlt =
  process.env.SEED_ARTICLE_IMAGE_ALT ?? "Composizione grafica editoriale del magazine Middleware";
const imageArticleKeys = new Set([
  "editoriale",
  "approfondimento",
  "scomporre-sicurezza",
  "ruolo-sicurezza",
  "analisi",
]);

const categories = [
  { name: "Editoriale", slug: "editoriale" },
  { name: "Approfondimenti", slug: "approfondimenti" },
  { name: "Interviste", slug: "interviste" },
  { name: "Contributi", slug: "contributi" },
  { name: "Analisi", slug: "analisi" },
];

const tags = [
  { name: "Quartiere", slug: "quartiere" },
  { name: "Sicurezza", slug: "sicurezza" },
  { name: "Comunità", slug: "comunita" },
  { name: "Memoria", slug: "memoria" },
  { name: "Partecipazione", slug: "partecipazione" },
  { name: "Conflitto", slug: "conflitto" },
  { name: "Generazioni", slug: "generazioni" },
  { name: "Analisi urbana", slug: "analisi-urbana" },
];

const articles = [
  {
    key: "editoriale",
    title: "La soglia e la paura",
    titleStyled: styledTitle("La soglia e la [[paura]]"),
    slug: "perche-un-magazine",
    categorySlug: "editoriale",
    author: "redazione",
    tagSlugs: ["quartiere", "sicurezza", "comunita"],
    excerpt:
      "Questo numero si apre con una domanda semplice e insieme impegnativa: perche costruire un magazine, oggi, dentro un territorio attraversato da trasformazioni rapide, conflitti diffusi e parole pubbliche spesso consumate prima ancora di essere comprese? La risposta non e una dichiarazione di intenti astratta, ma il tentativo di mettere in forma uno spazio comune, capace di raccogliere osservazioni, voci, materiali e contraddizioni senza ridurli a slogan.",
  },
  {
    key: "approfondimento",
    title: "Mappe per non chiamarla emergenza",
    titleStyled: styledTitle("Mappe per non chiamarla [[emergenza]]"),
    slug: "coordinate-di-quartiere",
    categorySlug: "approfondimenti",
    author: "redazione",
    tagSlugs: ["quartiere", "analisi-urbana", "sicurezza"],
    excerpt:
      "Le coordinate del quartiere non coincidono soltanto con una mappa. Sono fatte di strade, soglie, negozi, cortili, fermate, presidi informali, orari in cui la citta cambia passo e relazioni che diventano visibili solo quando qualcosa si incrina. Questo approfondimento ricostruisce il contesto del numero provando a tenere insieme cronologia, descrizione e domande politiche.",
  },
  {
    key: "intervista-giovani-colleghi",
    title: "Chi resta dopo la piazza",
    titleStyled: styledTitle("Chi resta dopo la [[piazza]]"),
    slug: "giovani-colleghi-abitanti",
    categorySlug: "interviste",
    author: "redazione",
    tagSlugs: ["generazioni", "quartiere", "partecipazione"],
    excerpt:
      "La conversazione con giovani colleghi e abitanti parte da gesti quotidiani: attraversare una piazza, scegliere una strada, restare dopo il lavoro, riconoscere chi vive lo stesso spazio con ritmi diversi. Ne emerge uno sguardo generazionale non compatto, a tratti contraddittorio, ma prezioso per capire come il quartiere viene percepito da chi lo abita nel presente.",
  },
  {
    key: "intervista-pensionati",
    title: "Le strade ricordano",
    titleStyled: styledTitle("Le strade [[ricordano]]"),
    slug: "abitanti-storici",
    categorySlug: "interviste",
    author: "redazione",
    tagSlugs: ["memoria", "quartiere", "generazioni"],
    excerpt:
      "Gli abitanti storici raccontano il quartiere attraverso una memoria che non e nostalgia, ma archivio vivo di usi, conflitti, perdite e permanenze. Nell'intervista affiorano trasformazioni lente e brusche, luoghi scomparsi e pratiche che resistono, insieme alla difficolta di nominare cosa sia davvero cambiato e cosa invece continui a tornare sotto forme nuove.",
  },
  {
    key: "costruire-comunita",
    title: "Comunita non e riparo",
    titleStyled: styledTitle("[[Comunita]] non e riparo"),
    slug: "costruire-comunita-di-quartiere",
    categorySlug: "contributi",
    author: null,
    tagSlugs: ["comunita", "partecipazione", "conflitto"],
    excerpt:
      "Parlare di comunita di quartiere significa evitare due scorciatoie: immaginarla come un passato perduto oppure invocarla come soluzione immediata a problemi strutturali. Questo contributo la considera invece una pratica fragile, fatta di infrastrutture relazionali, fiducia costruita nel tempo, cura degli spazi comuni e capacita di reggere il dissenso senza trasformarlo subito in distanza.",
  },
  {
    key: "scomporre-sicurezza",
    title: "Disinnescare la parola sicurezza",
    titleStyled: styledTitle("Disinnescare la parola [[sicurezza]]"),
    slug: "scomporre-la-sicurezza",
    categorySlug: "contributi",
    author: null,
    tagSlugs: ["sicurezza", "conflitto", "quartiere"],
    excerpt:
      "La sicurezza e una parola che tende a chiudere la discussione proprio quando dovrebbe aprirla. Scomporla significa distinguere paure reali, bisogni materiali, dispositivi di controllo, retoriche emergenziali e pratiche di mutuo riconoscimento. Il contributo di rottura del numero prova a separare questi piani, per rifiutare risposte automatiche e rendere leggibile cio che resta nascosto nel discorso pubblico.",
  },
  {
    key: "tessuto-quartiere",
    title: "Dove il quartiere si sfilaccia",
    titleStyled: styledTitle("Dove il [[quartiere]] si sfilaccia"),
    slug: "analizzare-il-tessuto-del-quartiere",
    categorySlug: "contributi",
    author: null,
    tagSlugs: ["quartiere", "analisi-urbana", "comunita"],
    excerpt:
      "Il tessuto del quartiere non e omogeneo: si addensa in alcuni punti, si sfilaccia in altri, produce continuita impreviste e fratture molto concrete. Analizzarlo vuol dire osservare come luoghi, relazioni, servizi, vuoti urbani, economie minute e pratiche quotidiane compongano una trama che nessun indicatore da solo riesce a restituire.",
  },
  {
    key: "intervista-giovane-attivista",
    title: "Futuro con le mani sporche",
    titleStyled: styledTitle("[[Futuro]] con le mani sporche"),
    slug: "giovane-attivista-del-quartiere",
    categorySlug: "interviste",
    author: "redazione",
    tagSlugs: ["partecipazione", "generazioni", "conflitto"],
    excerpt:
      "La voce di una giovane attivista attraversa il numero portando dentro la discussione un punto di vista insieme pratico e immaginativo. Partecipazione, conflitto e futuro non vengono trattati come parole grandi, ma come questioni che si misurano nelle assemblee, nelle relazioni difficili, nella fatica di tenere aperti spazi collettivi quando il tempo disponibile sembra sempre meno.",
  },
  {
    key: "intervista-attivista-meno-giovane",
    title: "La memoria non basta",
    titleStyled: styledTitle("La [[memoria]] non basta"),
    slug: "un-attivista-di-lungo-corso",
    categorySlug: "interviste",
    author: "redazione",
    tagSlugs: ["memoria", "partecipazione", "conflitto"],
    excerpt:
      "L'intervista con un attivista di lungo corso mette in relazione esperienza e cambiamento senza trasformare il passato in manuale. Il racconto attraversa stagioni diverse di mobilitazione, linguaggi che si sono consumati, forme organizzative mutate e domande che restano aperte: come trasmettere saperi senza irrigidirli, come riconoscere il nuovo senza perdere memoria.",
  },
  {
    key: "ruolo-sicurezza",
    title: "Chi governa la paura",
    titleStyled: styledTitle("Chi governa la [[paura]]"),
    slug: "il-ruolo-della-sicurezza",
    categorySlug: "contributi",
    author: null,
    tagSlugs: ["sicurezza", "analisi-urbana", "conflitto"],
    excerpt:
      "Il ruolo della sicurezza nel quartiere non puo essere compreso solo attraverso la cronaca o l'amministrazione dell'ordine. E una dimensione che riguarda percezioni, accesso agli spazi, rapporti di genere, condizioni economiche, fiducia nelle istituzioni e possibilita di autorganizzazione. Il contributo prova a leggere questi intrecci senza ridurre la complessita a una formula.",
  },
  {
    key: "analisi",
    title: "Tenere aperta la soglia",
    titleStyled: styledTitle("Tenere aperta la [[soglia]]"),
    slug: "elementi-emersi-e-ipotesi-di-lavoro",
    categorySlug: "analisi",
    author: "redazione",
    tagSlugs: ["analisi-urbana", "sicurezza", "partecipazione"],
    excerpt:
      "La chiusura non pretende di concludere cio che il numero ha aperto. Raccoglie elementi emersi, tensioni ricorrenti e prime ipotesi di lavoro, provando a trasformare gli articoli precedenti in una traccia operativa. Non una sintesi pacificata, ma una mappa provvisoria per continuare a discutere sicurezza, territorio e radicamento con piu precisione.",
  },
];

const staticPages = [
  {
    title: "Chi siamo",
    slug: "chi-siamo",
    excerpt:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer non sem vitae justo luctus facilisis.",
  },
  {
    title: "Privacy policy",
    slug: "privacy-policy",
    excerpt:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed at arcu nec libero tempor dictum.",
  },
  {
    title: "Cookie policy",
    slug: "cookie-policy",
    excerpt:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec finibus lectus vitae augue varius, sed pretium erat porta.",
  },
];

function styledTitle(title) {
  const segments = [];
  const markerPattern = /\[\[([^\]]+)\]\]/g;
  let cursor = 0;
  let match;

  while ((match = markerPattern.exec(title)) !== null) {
    const before = title.slice(cursor, match.index);
    if (before) {
      segments.push({ text: before, tone: "default" });
    }

    segments.push({ text: match[1], tone: "primary" });
    cursor = match.index + match[0].length;
  }

  const after = title.slice(cursor);
  if (after) {
    segments.push({ text: after, tone: "default" });
  }

  return segments;
}

function richText(text) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

function issueDescriptionRich() {
  return {
    type: "doc",
    content: [
      paragraph(
        "Il primo numero di Middleware nasce intorno a una parola che nel discorso pubblico sembra non avere piu bisogno di spiegazioni: sicurezza. Proprio per questo prova a rallentare, a scomporla, a riportarla nei luoghi in cui viene pronunciata e nelle vite che attraversa. Non cerca una definizione unica, ma una costellazione di scene, interviste, contributi e appunti capaci di mostrare quanto siano diversi i bisogni che quella parola raccoglie e quanto siano rischiose le risposte automatiche.",
      ),
      paragraph(
        "Il quartiere diventa il campo di osservazione del numero: una scala abbastanza concreta da evitare astrazioni e abbastanza complessa da non ridurre tutto a cronaca. Le strade, le piazze, i cortili, le soglie dei negozi e gli spazi informali permettono di vedere come paura, fiducia, controllo, cura e conflitto convivano nello stesso territorio. Ogni articolo prova a restituire un pezzo di questa trama senza trasformarla in diagnosi definitiva.",
      ),
      paragraph(
        "Le voci raccolte nel numero non vengono ordinate per produrre consenso. Giovani abitanti, persone con memoria lunga del territorio, attivisti, contributi analitici e testi editoriali compongono un quadro intenzionalmente non pacificato. L'obiettivo e rendere leggibili le differenze: chi percepisce insicurezza, chi subisce controllo, chi prova a costruire relazioni, chi legge nelle trasformazioni urbane una perdita, chi invece intravede possibilita nuove.",
      ),
      paragraph(
        "Scomporre la sicurezza significa allora distinguere tra bisogni materiali e retoriche emergenziali, tra richiesta di protezione e domanda di riconoscimento, tra conflitti reali e narrazioni che li semplificano. Il numero invita a trattare queste dimensioni come questioni politiche e sociali, non come problemi da chiudere con una formula. Per questo alterna mappe, interviste, contributi e analisi: forme diverse per tenere aperta la complessita.",
      ),
      paragraph(
        "Questo numero serve anche come prova editoriale del magazine: definisce un metodo, un tono e una postura. Middleware vuole essere uno spazio in cui i contenuti non siano soltanto pubblicati, ma messi in relazione; in cui le categorie aiutino a orientarsi senza irrigidire il discorso; in cui immagini, tag, issue e articoli costruiscano un archivio navigabile. La sicurezza, qui, non e il punto di arrivo: e il primo banco di prova per capire come raccontare un territorio senza consegnarlo alla paura.",
      ),
    ],
  };
}

function staticPageContentRich(page) {
  return {
    type: "doc",
    content: [
      heading(2, page.title),
      paragraph(page.excerpt),
      paragraph(
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Curabitur vitae sem non lectus fermentum consequat.",
      ),
      paragraph(
        "Praesent commodo, ipsum non gravida facilisis, erat lorem posuere mi, vitae efficitur justo libero ac risus. Aliquam erat volutpat. Nulla facilisi. Integer ac nibh nec sapien bibendum tempor.",
      ),
      paragraph(
        "Sed non magna ut arcu dignissim tincidunt. Mauris congue, massa at tincidunt suscipit, lectus justo porttitor nisl, at luctus neque justo id urna. Suspendisse potenti.",
      ),
    ],
  };
}

function json(value) {
  return JSON.stringify(value);
}

function textNode(text, marks) {
  return marks ? { type: "text", text, marks } : { type: "text", text };
}

function paragraph(text) {
  return {
    type: "paragraph",
    content: [textNode(text)],
  };
}

function heading(level, text) {
  return {
    type: "heading",
    attrs: { level },
    content: [textNode(text)],
  };
}

function blockquote(text) {
  return {
    type: "blockquote",
    content: [paragraph(text)],
  };
}

function bulletList(items) {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

function orderedList(items) {
  return {
    type: "orderedList",
    attrs: { start: 1 },
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)],
    })),
  };
}

function articleContentRich(article, index) {
  const base = article.excerpt;
  const rotation = index % 3;
  const angle =
    rotation === 0
      ? "La questione centrale non e stabilire una versione definitiva dei fatti, ma rendere visibile il modo in cui esperienze diverse abitano lo stesso spazio. Per questo il testo alterna descrizione, interpretazione e domande aperte, lasciando emergere la densita di cio che spesso viene raccontato solo come problema di ordine pubblico."
      : rotation === 1
        ? "Il punto di partenza e una scena ordinaria: persone che attraversano lo stesso luogo senza necessariamente riconoscersi come parte della stessa vicenda. Da quella scena il testo allarga lo sguardo, collega pratiche quotidiane e trasformazioni urbane, e prova a capire dove si producono fiducia, distanza, conflitto e possibilita di cooperazione."
        : "Il contributo insiste sulla necessita di cambiare scala. Il quartiere non viene letto come sfondo, ma come dispositivo concreto: distribuisce tempi, vincoli, opportunita e paure; mette in contatto biografie differenti; mostra quanto le parole pubbliche diventino piu precise quando vengono misurate sui luoghi.";

  return {
    type: "doc",
    content: [
      heading(2, article.title),
      paragraph(base),
      paragraph(angle),
      blockquote(
        "Non basta nominare un territorio per conoscerlo: bisogna restare abbastanza a lungo da ascoltare quello che le sue frizioni rendono dicibile.",
      ),
      heading(3, "Una scena di partenza"),
      paragraph(
        "Il racconto prende forma da dettagli apparentemente minori: una serranda abbassata, una panchina occupata sempre dalle stesse persone, una conversazione interrotta quando arriva qualcuno da fuori, una strada che cambia funzione tra mattina e sera. Sono indizi piccoli, ma permettono di capire come il territorio venga prodotto giorno dopo giorno da abitudini, economie, attese e forme di controllo diffuse.",
      ),
      paragraph(
        "Da qui nasce una domanda che attraversa l'intero numero: quali condizioni rendono possibile sentirsi parte di un luogo senza trasformare l'appartenenza in chiusura? La risposta non e lineare, perche ogni pratica di prossimita porta con se anche esclusioni, gerarchie implicite, memorie selettive e conflitti non risolti.",
      ),
      bulletList([
        "osservare i luoghi nei momenti in cui cambiano uso e densita",
        "distinguere bisogni materiali, percezioni e narrazioni pubbliche",
        "riconoscere il ruolo delle relazioni informali senza idealizzarle",
        "tenere insieme conflitto, cura e responsabilita collettiva",
      ]),
      heading(3, "Che cosa resta aperto"),
      paragraph(
        "La parte piu utile del lavoro non sta nelle conclusioni immediate, ma nelle domande che obbliga a formulare meglio. Chi parla a nome del quartiere? Quali presenze vengono considerate legittime e quali soltanto tollerate? Dove si colloca il confine tra richiesta di protezione e domanda di controllo? In che modo le istituzioni possono intervenire senza cancellare cio che gia esiste dal basso?",
      ),
      paragraph(
        "Rispondere richiede tempo, ma anche un metodo: raccogliere testimonianze, verificare le ipotesi sul campo, non confondere il disagio con la sua rappresentazione piu rumorosa. Il testo propone quindi una forma di attenzione lenta, capace di attraversare il rumore e di restituire spessore politico alle pratiche ordinarie.",
      ),
      orderedList([
        "mappare i punti di frizione senza ridurli a emergenza",
        "mettere in relazione memorie diverse dello stesso spazio",
        "costruire occasioni di confronto che non cancellino il dissenso",
      ]),
      heading(3, "Una traccia provvisoria"),
      paragraph(
        "Il testo si chiude lasciando una traccia di lavoro piu che una soluzione. La sicurezza, la comunita, la partecipazione e il radicamento diventano parole utili solo se vengono riportate a condizioni concrete: chi ha tempo per partecipare, chi puo restare, chi viene ascoltato, chi viene spostato ai margini, quali luoghi rendono possibile incontrarsi e quali invece organizzano separazione.",
      ),
      paragraph(
        "In questa prospettiva il magazine non e un contenitore neutro, ma uno strumento editoriale per accumulare precisione. Ogni articolo aggiunge un frammento, corregge una semplificazione, apre un varco. La sua funzione e tenere insieme materiali diversi abbastanza a lungo da far emergere una lettura condivisibile, anche quando non e ancora pacificata.",
      ),
    ],
  };
}

function block(
  id,
  type,
  articleIds,
  featuredArticleId = articleIds[0],
  featuredPlacement = "left",
  copy = {},
) {
  return {
    id,
    type,
    title: copy.title ?? null,
    titleStyled: copy.titleStyled ?? null,
    description: copy.description ?? null,
    articleIds,
    featuredArticleId,
    featuredPlacement,
  };
}

async function upsertCategory(client, category) {
  const id = randomUUID();
  const result = await client.query(
    `insert into categories (id, name, slug, "isActive", "createdAt", "updatedAt")
     values ($1, $2, $3, true, $4, $4)
     on conflict (slug) do update set name = excluded.name, "isActive" = true, "updatedAt" = excluded."updatedAt"
     returning id`,
    [id, category.name, category.slug, now],
  );
  return result.rows[0].id;
}

async function upsertAuthor(client) {
  const id = randomUUID();
  const result = await client.query(
    `insert into authors (id, name, slug, "isActive", "createdAt", "updatedAt")
     values ($1, 'Redazione', 'redazione', true, $2, $2)
     on conflict (slug) do update set name = excluded.name, "isActive" = true, "updatedAt" = excluded."updatedAt"
     returning id`,
    [id, now],
  );
  return result.rows[0].id;
}

async function upsertTag(client, tag) {
  const id = randomUUID();
  const result = await client.query(
    `insert into tags (id, name, slug, "isActive", "createdAt", "updatedAt")
     values ($1, $2, $3, true, $4, $4)
     on conflict (slug) do update set name = excluded.name, "isActive" = true, "updatedAt" = excluded."updatedAt"
     returning id`,
    [id, tag.name, tag.slug, now],
  );
  return result.rows[0].id;
}

async function upsertIssue(client) {
  const id = randomUUID();
  const result = await client.query(
    `insert into issues (id, title, "titleStyled", slug, description, "homeBlocks", "homeVariant", "isActive", "sortOrder", "publishedAt", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, null, 'black', true, 0, $6, $7, $7)
     on conflict (slug) do update set
        title = excluded.title,
        "titleStyled" = excluded."titleStyled",
        description = excluded.description,
        "homeVariant" = 'black',
        "isActive" = true,
       "publishedAt" = excluded."publishedAt",
       "updatedAt" = excluded."updatedAt"
     returning id`,
    [
      id,
      "Scomporre la sicurezza",
      json(styledTitle("Scomporre la [[sicurezza]]")),
      "scomporre-la-sicurezza-primo-numero",
      json(issueDescriptionRich()),
      issuePublishedAt,
      now,
    ],
  );
  return result.rows[0].id;
}

async function syncArticleTags(client, articleId, tagSlugs, tagIdsBySlug) {
  await client.query(`delete from article_tags where "articleId" = $1`, [articleId]);

  for (const tagSlug of tagSlugs) {
    const tagId = tagIdsBySlug.get(tagSlug);

    if (!tagId) {
      throw new Error(`Missing tag for slug: ${tagSlug}`);
    }

    await client.query(
      `insert into article_tags ("articleId", "tagId", "createdAt")
       values ($1, $2, $3)
       on conflict ("articleId", "tagId") do nothing`,
      [articleId, tagId, now],
    );
  }
}

async function upsertArticle(client, article, issueId, categoryId, redazioneId, index) {
  const id = randomUUID();
  const authorId = article.author === "redazione" ? redazioneId : null;
  const publishedAt = new Date(issuePublishedAt.getTime() + (index + 1) * 60_000);
  const imageUrl = imageArticleKeys.has(article.key) ? seedArticleImageUrl : null;
  const imageAlt = imageArticleKeys.has(article.key) ? seedArticleImageAlt : null;
  const result = await client.query(
    `insert into articles (
        id, "issueId", "categoryId", "authorId", status, "isFeatured", "publishedAt",
        title, "titleStyled", slug, excerpt, "excerptRich", "contentRich", "imageUrl", "imageAlt", "createdAt", "updatedAt"
      ) values ($1, $2, $3, $4, 'PUBLISHED', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
      on conflict (slug) do update set
        "issueId" = excluded."issueId",
        "categoryId" = excluded."categoryId",
       "authorId" = excluded."authorId",
       status = 'PUBLISHED',
        "isFeatured" = excluded."isFeatured",
        "publishedAt" = excluded."publishedAt",
        title = excluded.title,
        "titleStyled" = excluded."titleStyled",
        excerpt = excluded.excerpt,
        "excerptRich" = excluded."excerptRich",
        "contentRich" = excluded."contentRich",
        "imageUrl" = excluded."imageUrl",
        "imageAlt" = excluded."imageAlt",
        "updatedAt" = excluded."updatedAt"
      returning id`,
    [
      id,
      issueId,
      categoryId,
      authorId,
      article.key === "approfondimento" || article.key === "ruolo-sicurezza",
      publishedAt,
      article.title,
      json(article.titleStyled),
      article.slug,
      article.excerpt,
      json(richText(article.excerpt)),
      json(articleContentRich(article, index)),
      imageUrl,
      imageAlt,
      now,
    ],
  );
  return result.rows[0].id;
}

async function updateHomeBlocks(client, issueId, articleIdsByKey) {
  const homeBlocks = [
    block("opening-editoriale", "opening", [articleIdsByKey.get("editoriale")]),
    block(
      "body-contesto-comunita",
      "body",
      [
        articleIdsByKey.get("approfondimento"),
        articleIdsByKey.get("intervista-giovani-colleghi"),
        articleIdsByKey.get("intervista-pensionati"),
        articleIdsByKey.get("costruire-comunita"),
      ],
      articleIdsByKey.get("approfondimento"),
      "left",
      {
        title: "Geografie della paura quotidiana",
        titleStyled: styledTitle("Geografie della [[paura]] quotidiana"),
        description:
          "Prima di chiedere risposte, il numero attraversa il quartiere: le sue soglie, le memorie, le voci giovani e le forme concrete con cui una comunita prova a non diventare chiusura.",
      },
    ),
    block("rupture-sicurezza", "rupture", [articleIdsByKey.get("scomporre-sicurezza")]),
    block(
      "body-tessuto-sicurezza",
      "body",
      [
        articleIdsByKey.get("tessuto-quartiere"),
        articleIdsByKey.get("intervista-giovane-attivista"),
        articleIdsByKey.get("intervista-attivista-meno-giovane"),
        articleIdsByKey.get("ruolo-sicurezza"),
      ],
      articleIdsByKey.get("ruolo-sicurezza"),
      "right",
      {
        title: "Dove la sicurezza cambia nome",
        titleStyled: styledTitle("Dove la [[sicurezza]] cambia nome"),
        description:
          "Nel punto piu teso del numero, il discorso pubblico viene riportato ai luoghi: tessuti che si sfilacciano, attivismi che resistono, istituzioni che governano e paure che chiedono parole meno automatiche.",
      },
    ),
    block(
      "closing-analisi",
      "closing",
      [articleIdsByKey.get("analisi")],
      articleIdsByKey.get("analisi"),
      "left",
      {
        title: "Una soglia da tenere aperta",
        titleStyled: styledTitle("Una [[soglia]] da tenere aperta"),
        description:
          "La chiusura non pacifica il conflitto: raccoglie le tracce, trattiene le domande e prepara il prossimo passo per discutere sicurezza senza consegnarla alla paura.",
      },
    ),
  ];

  await client.query(
    `update issues set "homeBlocks" = $1, "homeVariant" = 'black', "updatedAt" = $2 where id = $3`,
    [json(homeBlocks), now, issueId],
  );
}

async function upsertStaticPage(client, page) {
  const id = randomUUID();
  const titleStyled = styledTitle(page.title);

  await client.query(
    `insert into pages (
        id, title, "titleStyled", slug, status, excerpt, "excerptRich", "contentRich", "publishedAt", "createdAt", "updatedAt"
      ) values ($1, $2, $3, $4, 'PUBLISHED', $5, $6, $7, $8, $9, $9)
      on conflict (slug) do update set
        title = excluded.title,
        "titleStyled" = excluded."titleStyled",
        status = 'PUBLISHED',
        excerpt = excluded.excerpt,
        "excerptRich" = excluded."excerptRich",
        "contentRich" = excluded."contentRich",
        "publishedAt" = excluded."publishedAt",
        "updatedAt" = excluded."updatedAt"`,
    [
      id,
      page.title,
      json(titleStyled),
      page.slug,
      page.excerpt,
      json(richText(page.excerpt)),
      json(staticPageContentRich(page)),
      now,
      now,
    ],
  );
}

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query("begin");

  const categoryIdsBySlug = new Map();
  for (const category of categories) {
    categoryIdsBySlug.set(category.slug, await upsertCategory(client, category));
  }

  const tagIdsBySlug = new Map();
  for (const tag of tags) {
    tagIdsBySlug.set(tag.slug, await upsertTag(client, tag));
  }

  const redazioneId = await upsertAuthor(client);
  const issueId = await upsertIssue(client);
  const articleIdsByKey = new Map();

  for (const [index, article] of articles.entries()) {
    const categoryId = categoryIdsBySlug.get(article.categorySlug);
    const articleId = await upsertArticle(client, article, issueId, categoryId, redazioneId, index);
    await syncArticleTags(client, articleId, article.tagSlugs, tagIdsBySlug);
    articleIdsByKey.set(article.key, articleId);
  }

  await updateHomeBlocks(client, issueId, articleIdsByKey);

  for (const page of staticPages) {
    await upsertStaticPage(client, page);
  }

  await client.query("commit");

  console.log(`Created/updated issue: ${issueId}`);
  console.log("Public slug: scomporre-la-sicurezza-primo-numero");
  console.log(`Created/updated static pages: ${staticPages.map((page) => page.slug).join(", ")}`);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
