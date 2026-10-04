export interface ToolBlueprint {
  id: string;
  name: string;
  dialectName: string;
  era: string;
  difficulty: 'Apprendista' | 'Artigiano' | 'Maestro del Maglio';
  parStrikes: number;
  maxStrikes: number;
  description: string;
  historicalContext: string;
  // 18 thickness values (in mm, from 10 to 80) representing the longitudinal cross-section profile
  initialProfile: number[];
  targetProfile: number[];
  recommendedForce: string;
}

export const BLUEPRINTS: ToolBlueprint[] = [
  {
    id: 'vanghetto',
    name: 'Vanghetto Contadino',
    dialectName: 'Ol Vanghèt',
    era: 'XIX Secolo · Agricoltura Seriana',
    difficulty: 'Apprendista',
    parStrikes: 5,
    maxStrikes: 9,
    description:
      'Attrezzo agricolo fondamentale con codolo robusto a sinistra e lama progressivamente assottigliata verso la punta.',
    historicalContext:
      'Fino al 1972 il Maglio Calvi di Comenduno batteva vomeri, vanghe e badili per i contadini della media e bassa Valle Seriana, sfruttando la forza idraulica della roggia Serio.',
    initialProfile: [62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62],
    targetProfile: [62, 62, 60, 56, 50, 44, 38, 34, 30, 27, 25, 23, 21, 19, 17, 15, 14, 13],
    recommendedForce: 'Colpi Pesanti al centro-destra, Leggeri in punta'
  },
  {
    id: 'roncola',
    name: 'Roncola Bergamasca',
    dialectName: 'La Palòrza / Ol Podèt',
    era: 'XVIII–XX Secolo · Boschivo',
    difficulty: 'Artigiano',
    parStrikes: 6,
    maxStrikes: 10,
    description:
      'Lama da bosco con innesto spesso, ventre centrale nervato e punta assottigliata e ricurva per il taglio netto dei rami.',
    historicalContext:
      'I fabbri ("i maér") regolavano la chiusa dell’acqua per alternare colpi profondi di sbozzatura a battute rapide di rifinitura sul filo della roncola.',
    initialProfile: [64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64],
    targetProfile: [60, 56, 48, 36, 30, 32, 38, 42, 42, 38, 32, 26, 22, 20, 22, 26, 20, 14],
    recommendedForce: 'Colpi Medi sul collo e prima della punta'
  },
  {
    id: 'forbici',
    name: 'Lama di Forbice da Tosatura',
    dialectName: 'I Fòrbes de Albì',
    era: 'XV–XVIII Secolo · Repubblica Veneta',
    difficulty: 'Artigiano',
    parStrikes: 6,
    maxStrikes: 10,
    description:
      'Profilo ad alta precisione: tallone elastico sottile, snodo rinforzato centrale e lama lunga perfettamente planare.',
    historicalContext:
      'Tra il Quattrocento e il Settecento le forbici forgiate ad Albino avevano il valore unitario più alto dell’intero territorio bergamasco ed erano esportate fino in Spagna.',
    initialProfile: [56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56, 56],
    targetProfile: [24, 24, 28, 38, 52, 54, 48, 36, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12],
    recommendedForce: 'Colpi Pesanti su tallone e lama, preserva lo snodo al segmento 5-6'
  },
  {
    id: 'zappa',
    name: 'Zappa da Pietraia a Doppio Spessore',
    dialectName: 'La Sàpa de Mùt',
    era: 'XIX Secolo · Terrazzamenti',
    difficulty: 'Maestro del Maglio',
    parStrikes: 7,
    maxStrikes: 11,
    description:
      'Occhio centrale ad alto spessore per il manico in frassino, fianchi rastremati simmetricamente e tagliente temperato.',
    historicalContext:
      'Il grande albero in legno con quattro denti in ferro ("scagno") sollevava la testa del maglio quattro volte a ogni giro della ruota idraulica, permettendo di scolpire nervature complesse.',
    initialProfile: [66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66],
    targetProfile: [28, 30, 36, 48, 62, 66, 62, 48, 38, 32, 30, 32, 36, 32, 26, 20, 16, 14],
    recommendedForce: 'Alterna Colpi Pesanti alle estremità e Colpi di Precisione al centro-destra'
  },
  {
    id: 'spada',
    name: 'Quadrello di Lama Veneta',
    dialectName: 'La Làma de Sèrio',
    era: '1438 · Antiche Fucine di Comenduno',
    difficulty: 'Maestro del Maglio',
    parStrikes: 7,
    maxStrikes: 12,
    description:
      'Codolo stretto, guardia pronunciata e lama affusolata costante fino alla punta con scanalatura centrale.',
    historicalContext:
      'I documenti storici del 1438 attestano a Comenduno e Albino la produzione di spade, sciabole, lance e falci grazie alla ricchezza di ferro delle valli bergamasche e alla forza delle acque.',
    initialProfile: [58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58],
    targetProfile: [22, 22, 34, 56, 54, 34, 28, 27, 26, 25, 24, 23, 22, 21, 19, 17, 14, 11],
    recommendedForce: 'Colpo Pesante sul codolo (seg. 1-2) e stesura progressiva lungo la lama'
  }
];

export interface HistoricalNote {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  technicalSpec: string;
}

export const HISTORICAL_NOTES: HistoricalNote[] = [
  {
    id: 'ruota-albero',
    title: '01. La Ruota Idraulica e l’Albero a Camme',
    subtitle: 'Quattro battute per ogni rotazione dell’acqua',
    body: 'Il cuore del Maglio Calvi è un pesante trave oscillante in legno imperniato tra due blocchi monolitici in pietra ("scagno"). L’estremità posteriore in ferro viene premuta verso il basso da quattro sbarre metalliche (denti o camme) sporgenti da un albero rotante solidale con la ruota idraulica esterna.',
    technicalSpec: 'Rapporto: 4 colpi / giro ruota · Massa battente: ~180 kg'
  },
  {
    id: 'tromba-idroeolica',
    title: '02. La Tromba Idroeolica per la Forgia',
    subtitle: 'Aria compressa generata dalla caduta dell’acqua',
    body: 'Per portare i masselli di ferro oltre i 1.150 °C senza mantici manuali, il Maglio Calvi utilizzava una tromba idroeolica: l’acqua incanalata precipitava in una condotta verticale aspirando aria per effetto Venturi, separandola poi in una botticella di pietra e soffiandola direttamente sui carboni ardenti.',
    technicalSpec: 'Temperatura forgia: 850 °C – 1.220 °C · Alimentazione: continua ad acqua'
  },
  {
    id: 'ca-del-maer',
    title: '03. La Cà del Maér e la Fondazione Maglio Calvi ETS',
    subtitle: 'Oltre 200 anni di storia fino al 1972 e la rinascita',
    body: 'Rimasto attivo fino all’alluvione del 1972 come ultimo maglio storico di Comenduno di Albino, il complesso fa parte del Museo Etnografico della Torre di Comenduno. Nel 2026 la nascita della Fondazione Maglio Calvi ETS e la candidatura a "I Luoghi del Cuore" FAI guidano il restauro delle ruote idrauliche e della Cà del Maér.',
    technicalSpec: 'Località: Comenduno di Albino (BG) · Anno cessazione: 1972 · Fondazione ETS: 2026'
  }
];
