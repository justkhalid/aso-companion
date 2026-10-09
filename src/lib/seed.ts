import type {
  State,
  Level,
  Week,
  ClassEntry,
  Club,
  EventEntry,
  TeamMember,
  Volunteer,
  LibraryFolder,
  Note,
} from './types'

/* helpers to keep the seed compact */
function w(p: Partial<Week>): Week {
  return {
    theme: p.theme || '',
    obj: p.obj || '',
    lang: p.lang || '',
    res: p.res || '',
    urls: p.urls || [],
    act: p.act || '',
    hw: p.hw || '',
    skills: p.skills || { L: '', S: '', R: '', W: '' },
    lp: p.lp,
  }
}

/* a full lesson plan used for Kids - Beginners W1 */
const KIDS_W1_LP = {
  wu: 'Name ball toss: teacher models "Hello, I am Miss/Mister X", each child catches, says their name, throws back. Slow pace, big smiles, no pressure to speak perfectly.',
  wuAlt: [
    'Sit in a circle; roll the ball softly to music, stop music, ball-holder says "My name is..."',
    'Puppet introduces itself to each child; children wave and say hello to the puppet',
  ],
  pres: 'Present hello/goodbye + 4 instructions (stand up, sit down, look, listen) with giant flashcards and exaggerated modelling. Teach the attention signal ("Hands on head... 1, 2, 3, eyes on me!") and rehearse it 5 times as a game.',
  presAlt: [
    'Puppet show: puppet does right and wrong things; class shouts Yes!/No!',
    'Model and mirror: teacher says + does, children copy like mirrors',
  ],
  prac: 'Simon Says with the 4 instructions, slow then fast. Then drill "Hello, my name is ___" around the circle with the puppet.',
  pracAlt: [
    'Freeze game: instructions to music, freeze when it stops',
    'Line racing: two teams, first to correctly do the instruction wins a point',
  ],
  ls: 'Listen and do: teacher calls instructions in random order while children respond; add "touch your nose/head" silliness to check listening honestly.',
  re: 'Quick hello circle again - count how many children say their name with confidence; celebrate with a class cheer.',
  prod: 'Make the Class Rules Poster together: children add handprints / smiley stickers and practise "We look. We listen." Display it on the wall all year.',
  rw: 'Table time: trace names on pre-writing sheets (dotted letters), colour a "Hello" badge to wear home. Fast finishers trace "hello" and "goodbye".',
  st: 'Hello Song (Music/Songs) with actions, sung twice; teach the Goodbye Song ready for the end of class. Goodbye routine: Goodbye Song + sticker chart + high-five line (teach it this week).',
  g: [
    ['Name Ball Toss', 'Soft ball, catch-say name-throw. Wrong name? Everyone helps kindly.'],
    ['Simon Says (basics)', 'Only stand up / sit down / look / listen. Remove "Simon says" later weeks.'],
    ['Puppet Talk', 'Puppet greets each child; child answers or waves - any attempt praised.'],
    ['Freeze!', 'Music + instructions; freeze when music stops. Last to freeze is next caller.'],
    ['Line Race', 'Two lines; run and match the called word or instruction.'],
  ] as [string, string][],
  diff: [
    'Shy speakers: wave or hold up a name card instead of saying the name - any attempt counts.',
    'Fast finishers: trace "hello" and "goodbye" plus decorate their name badge.',
    'Need more support: sit the child next to the teacher in the circle for the first two weeks.',
  ],
  hw: [
    'Teach the hello song to someone at home.',
    'Bring a small object from home that makes you happy (for next week show and tell).',
    'Practise the goodbye routine once with a family member.',
  ],
  tip: 'Lower the stakes this week: lots of smiles, no correction of pronunciation yet. The goal is that every child leaves saying "I like English class". Build the routines now - they carry the whole year.',
}

const TEENS_W1_LP = {
  wu: 'Find someone who... : students mingle with a 6-item grid ("Find someone who has a pet / likes pizza / ..."). First to fill all squares reads them back.',
  wuAlt: ['Two truths and a lie: each student says 3 statements, group guesses the lie.'],
  pres: `Present yourself: name, age, one thing you like. Model on the board: "Hi, I'm ___. I'm ___. I like ___." Drill chorally then in pairs.`,
  presAlt: ['Celebrity intro: each student introduces a famous person using the frame.'],
  prac: 'Pair interviews: A interviews B for 2 minutes using 5 prompts, then swap. Rehearse the question forms on the board.',
  pracAlt: ['Speed dating: rotate partners every 60 seconds with a new prompt.'],
  ls: 'Listen to a short audio of two people introducing themselves; students tick the names and likes they hear, then compare.',
  re: 'Vocabulary slap: 8 cards on the table; teacher says a definition, pairs race to slap the right word.',
  prod: 'Class introduction wall: each student writes their intro on a sticky note and posts it; the class reads 3 aloud.',
  rw: 'Write a 40-word self-introduction using the frame; partner checks spelling of names and the verb forms.',
  st: 'Goodbye round: each person says one new word they learned today. Quick recap of the week goal.',
  g: [
    ['Find Someone Who', 'Mingle grid; first to complete reads back.'],
    ['Two Truths and a Lie', '3 statements, group guesses the lie.'],
    ['Vocabulary Slap', 'Cards on table; call a definition; slap the word.'],
  ] as [string, string][],
  diff: [
    'Stronger students: add a third sentence (a goal for the year).',
    'Quieter students: interview first in pairs, then present their partner instead of themselves.',
    'Need support: sentence starters printed on a card.',
  ],
  hw: [
    'Write a 60-word paragraph introducing yourself (use the frame + add one hobby).',
    'Record a 20-second voice introduction and send it to your teacher.',
  ],
  tip: 'Set the "English only" signal this week and use it kindly. The pair work is where the language lives - keep teacher talking time under 30%.',
}

function kidsWeeks(): Week[] {
  return [
    w({
      theme: 'Welcome and classroom routines',
      obj: 'say hello and goodbye and give their name; follow 3 basic class instructions',
      lang: 'Hello. My name is... Goodbye!; stand up, sit down, look, listen',
      res: 'Music/Songs (hello song); Flashcards/Class rules',
      urls: [
        'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxd2NkOXNyUWlGVTg',
        'https://drive.google.com/drive/folders/1tr4HBYfXQ8HnNEPHRTn-GZd6yG9cQQwY',
      ],
      act: 'Hello circle with names; rehearse attention signal; make the rules poster together',
      hw: 'teach the hello song to someone at home',
      skills: {
        L: 'Hello song and attention signal - listen and join in (Music/Songs)',
        S: 'Greet the class chorally and say my name in the hello circle',
        R: 'Match name cards to faces; find letters in my name (Flashcards)',
        W: 'Trace and copy my name; help colour the class-rules poster',
      },
      lp: KIDS_W1_LP,
    }),
    w({
      theme: 'Feelings: happy, sad, angry, tired, scared',
      obj: 'name 5 feelings and say how I feel today using "I am..."',
      lang: "I am happy/sad/angry/tired/scared; How are you? I'm...",
      res: 'Flashcards/Feelings; Music/Songs (feelings song)',
      urls: ['https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU'],
      act: 'Feelings charades; feelings chart check-in; mirror my face game',
      hw: 'ask 3 people at home how they feel and tell the class',
      skills: {
        L: 'Feelings song - listen and match the face',
        S: 'Tell the class how I feel today in a full sentence',
        R: 'Match the feeling word to the face card',
        W: 'Draw my face and trace the feeling word',
      },
    }),
    w({
      theme: 'Colors',
      obj: 'name 5 colors and say "It is [color]" for objects',
      lang: 'red, blue, green, yellow, orange; It is...; What color is it?',
      res: 'Flashcards/Colors; Worksheets/Coloring',
      urls: ['https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU'],
      act: 'Listen and colour; colour team collage; "It is blue!" gallery',
      hw: 'find 3 things at home in your favourite colour',
      skills: {
        L: 'Listen and colour: match the description to the right crayon',
        S: 'Present my team collage: "It is blue!"',
        R: 'Read 5 colour words on the wall labels',
        W: 'Trace and colour the 5 target words',
      },
    }),
    w({
      theme: 'Numbers 1-10',
      obj: 'count 1-10 and say "I have [number]" for classroom objects',
      lang: 'one to ten; I have...; How many?',
      res: 'Flashcards/Numbers; Worksheets/Counting',
      urls: ['https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU'],
      act: 'Listen and count claps; number jump; "I have 5 pencils" show and tell',
      hw: 'count 5 objects at home and draw them',
      skills: {
        L: 'Listen and count claps behind a screen; hold up the numeral',
        S: 'Show and tell: "I have [number] [object]"',
        R: 'Match numerals to number words',
        W: 'Trace and copy numbers 1-10',
      },
    }),
    w({
      theme: 'Assessment: what I can do (Semester 1)',
      obj: 'show what I can do across the four skills in a calm station day',
      lang: 'recycle of W1-W14 language',
      res: 'Assessment stations; observation checklists',
      urls: [],
      act: 'Station day: hello, feelings, colours, numbers; tick the checklist during play',
      hw: 'tell someone at home three things you can do in English',
      skills: {
        L: 'Listen and do: 5 instructions in a row',
        S: 'Say my name and how I feel in a full sentence',
        R: 'Match 10 word cards to pictures',
        W: 'Trace my name and 5 target words',
      },
      lp: {
        ...KIDS_W1_LP,
        wu: 'Gentle hello routine; quick feelings check-in to settle the class.',
        pres: 'Walk through the 4 stations with the whole class so everyone knows what to do.',
        prac: 'Station rotation in small groups, 6 minutes each; teacher observes and ticks.',
        ls: 'Station 1 (Listening): listen and do 5 instructions.',
        re: 'Quick regroup: "Who can do 3 things? Who can do 5?" celebrate all.',
        prod: 'Station 2 (Speaking): say my name and how I feel to a partner.',
        rw: 'Stations 3 and 4 (Reading + Writing): match cards, trace words.',
        st: 'Goodbye routine; each child gets a "I can..." sticker.',
        tip: 'Tick DURING play, never as a table test. If a child freezes, observe again later. The record should show their best normal self.',
        checklist: [
          'Says own name in a full sentence',
          'Follows 3 classroom instructions',
          'Names 5 feelings',
          'Names 5 colours',
          'Counts 1-10',
          'Matches word cards to pictures',
          'Traces own name',
        ],
      },
    }),
  ]
}

function teensWeeks(): Week[] {
  return [
    w({
      theme: 'Introductions and the class community',
      obj: 'introduce myself and a partner using 3 sentences; ask 5 get-to-know-you questions',
      lang: "Hi, I'm ___. I'm ___. I like ___.; Do you...? Have you...? Are you...?",
      res: 'Speaking/Prompts; Worksheets/Introductions',
      urls: ['https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU'],
      act: 'Find someone who; pair interviews; class intro wall',
      hw: 'write a 60-word self-introduction',
      skills: {
        L: 'Listen to two introductions; tick names and likes',
        S: 'Interview a partner and present them to the class',
        R: 'Read 8 prompts and choose 5 to ask',
        W: 'Write a 40-word self-introduction using the frame',
      },
      lp: TEENS_W1_LP,
    }),
    w({
      theme: 'Daily routines and the present simple',
      obj: 'describe my daily routine using the present simple and 6 time expressions',
      lang: 'I get up at 7. She goes to school. always/usually/never; at 7 / in the morning',
      res: 'Coursebook/Unit 2; Worksheets/Routines',
      urls: ['https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU'],
      act: 'My day timeline; partner compare; find the lie',
      hw: 'write a 60-word paragraph about a typical Saturday',
      skills: {
        L: 'Listen to a teen describe their day; order the 6 activities',
        S: 'Compare my routine with a partner; 3 differences',
        R: 'Read a short text; identify routine verbs',
        W: 'Write my Saturday routine with 4 time expressions',
      },
    }),
    w({
      theme: 'Food and likes/dislikes',
      obj: 'talk about food I like and dislike; order food in a cafe roleplay',
      lang: "I like/don't like...; Can I have...?; How much is it?; some/any",
      res: 'Coursebook/Unit 3; Speaking/Roleplay',
      urls: ['https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU'],
      act: 'Cafe roleplay; food survey; "would you eat this?" debate',
      hw: 'make a 1-day food diary',
      skills: {
        L: 'Listen to a cafe order; note 4 items and the total',
        S: 'Roleplay ordering food in a cafe',
        R: 'Read a menu; choose a meal for a partner',
        W: 'Write a short review of a cafe (40 words)',
      },
    }),
    w({
      theme: 'Assessment: speaking and writing (Semester 1)',
      obj: 'show my speaking and writing progress across the term',
      lang: 'recycle of W1-W14 language',
      res: 'Assessment tasks; observation grids',
      urls: [],
      act: 'Speaking task (3 min) + writing task (15 min); teacher ticks the grid',
      hw: 'write 3 goals for semester 2',
      skills: {
        L: 'Listen to a short dialogue; answer 5 questions',
        S: '3-minute speaking task: introduce + describe my routine',
        R: 'Read a 120-word text; answer 6 comprehension questions',
        W: 'Write 80 words about my favourite food',
      },
      lp: {
        ...TEENS_W1_LP,
        wu: 'Quick warm-up: 1-minute free talk to settle nerves.',
        pres: 'Explain the two tasks and the timing clearly; show the rubric.',
        prac: 'Speaking task in pairs (teacher ticks the grid); others do silent reading.',
        ls: 'Listening paper: 5 short items, played twice.',
        re: 'Regroup: 2-minute stretch and water.',
        prod: 'Writing task: 80 words in 15 minutes.',
        rw: 'Writing task continues; fast finishers self-check with the rubric.',
        st: 'Recap; collect papers; one thing each student is proud of.',
        tip: 'Keep it calm. Praise effort. Tick the rubric, not the person.',
        checklist: [
          'Introduces self in 3 sentences',
          'Uses the present simple correctly',
          'Asks and answers 5 questions',
          'Writes 80 words on topic',
          'Uses 4 time expressions',
          'Self-corrects a mistake',
        ],
      },
    }),
  ]
}

function lightWeeks(themePrefix: string, n: number): Week[] {
  const themes = [
    'Getting started',
    'Building vocabulary',
    'Grammar in context',
    'Skills practice',
    'Review and assessment',
  ]
  return Array.from({ length: n }, (_, i) =>
    w({
      theme: themes[i % themes.length],
      obj: `${themePrefix} - week ${i + 1} objectives (sample)`,
      lang: 'key grammar and vocabulary for this week',
      res: 'Coursebook; Worksheets',
      urls: ['https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU'],
      act: 'presentation, controlled practice, freer practice, review',
      hw: 'coursebook exercises + 60-word writing',
      skills: {
        L: 'Listening task from the coursebook',
        S: 'Pair speaking task with prompts',
        R: 'Reading text + comprehension questions',
        W: 'Short writing task (60-80 words)',
      },
    }),
  )
}

const LEVELS: Level[] = [
  {
    key: 'kids-beg',
    label: 'Kids - Beginners',
    cefr: 'Pre-A1',
    band: 'Kids',
    tier: 'Beginners',
    desc:
      'A playful first English year for children. Hello routines, songs, flashcards and games build the four skills every week, with play-based assessment in W15 and W30.',
    weeks: kidsWeeks(),
  },
  {
    key: 'kids-int',
    label: 'Kids - Intermediate',
    cefr: 'A1',
    band: 'Kids',
    tier: 'Intermediate',
    desc:
      'Children who can already greet and follow routines. Short sentences, simple stories and craft projects widen vocabulary and confidence each week.',
    weeks: lightWeeks('Kids Intermediate', 5),
  },
  {
    key: 'kids-adv',
    label: 'Kids - Advanced',
    cefr: 'A2',
    band: 'Kids',
    tier: 'Advanced',
    desc:
      'Confident young learners ready for short reading texts, simple writing and group projects that recycle the whole year.',
    weeks: lightWeeks('Kids Advanced', 5),
  },
  {
    key: 'teens-beg',
    label: 'Teens - Beginners',
    cefr: 'A1',
    band: 'Teens',
    tier: 'Beginners',
    desc:
      'A communicative start for teens: introductions, routines, food and hobbies. The four skills every week, with peer work and short writing.',
    weeks: teensWeeks(),
  },
  {
    key: 'teens-int',
    label: 'Teens - Intermediate',
    cefr: 'A2',
    band: 'Teens',
    tier: 'Intermediate',
    desc:
      'Teens building fluency: past and future narratives, opinions, and short presentations. Reading and writing grow with the speaking.',
    weeks: lightWeeks('Teens Intermediate', 5),
  },
  {
    key: 'teens-adv',
    label: 'Teens - Advanced',
    cefr: 'B1',
    band: 'Teens',
    tier: 'Advanced',
    desc:
      'Teens ready for B1-level texts, discussions, and 120-word writing. Debate, presentations and exam-style tasks round out the year.',
    weeks: lightWeeks('Teens Advanced', 5),
  },
  {
    key: 'adults-beg',
    label: 'Adults - Beginners',
    cefr: 'A1',
    band: 'Adults',
    tier: 'Beginners',
    desc:
      'Practical English for adults: greetings, personal information, daily life and transactions. Polite, real-world language from week one.',
    weeks: lightWeeks('Adults Beginners', 5),
  },
  {
    key: 'adults-int',
    label: 'Adults - Intermediate',
    cefr: 'A2',
    band: 'Adults',
    tier: 'Intermediate',
    desc:
      'Adults who can handle simple exchanges. Work, travel, health and opinions, with reading and short writing every week.',
    weeks: lightWeeks('Adults Intermediate', 5),
  },
  {
    key: 'adults-adv',
    label: 'Adults - Advanced',
    cefr: 'B1',
    band: 'Adults',
    tier: 'Advanced',
    desc:
      'Adults ready for B1+ fluency: discussions, presentations, emails and exam-style tasks. Authentic listening and reading throughout.',
    weeks: lightWeeks('Adults Advanced', 5),
  },
]

const CLASSES: ClassEntry[] = [
  {
    id: 'c1',
    code: 'ASO-K1',
    level: 'Kids - Beginners',
    teacher: 'Aya Boutarfas',
    room: 'Room 1',
    days: ['Mon', 'Wed'],
    time: '14:00-16:00',
  },
  {
    id: 'c2',
    code: 'ASO-T1',
    level: 'Teens - Beginners',
    teacher: 'Sara El Amrani',
    room: 'Room 2',
    days: ['Tue', 'Thu'],
    time: '16:30-18:00',
  },
  {
    id: 'c3',
    code: 'ASO-A1',
    level: 'Adults - Beginners',
    teacher: 'Yassine Maaroufi',
    room: 'Room 3',
    days: ['Mon', 'Thu'],
    time: '18:30-20:00',
  },
  {
    id: 'c4',
    code: 'ASO-K2',
    level: 'Kids - Intermediate',
    teacher: 'Imane Cherkaoui',
    room: 'Room 1',
    days: ['Sat'],
    time: '10:00-12:00',
  },
]

const CLUBS: Club[] = [
  {
    id: 'cl1',
    name: 'Conversation Club',
    icon: 'mic',
    desc:
      'A relaxed weekly speaking club where members practise real-life English around a theme: travel, food, work, dreams. Open to all levels.',
    days: ['Tue'],
    time: '17:00-18:30',
    room: 'American Space',
    lead: 'Sara El Amrani',
    vol: ['Imane Cherkaoui', 'Yassine Maaroufi'],
    url: 'https://drive.google.com/',
  },
  {
    id: 'cl2',
    name: 'Reading Circle',
    icon: 'book',
    desc:
      'A short story or article each week, read together and discussed. Builds vocabulary and fluency through shared reading.',
    days: ['Wed'],
    time: '15:30-17:00',
    room: 'Library',
    lead: 'Aya Boutarfas',
    vol: [],
    url: 'https://drive.google.com/',
  },
  {
    id: 'cl3',
    name: 'Movie Club',
    desc:
      'A short film or scene, then a guided discussion in English. Listening, culture and vocabulary in one session.',
    days: ['Fri'],
    time: '16:00-18:00',
    room: 'American Space',
    lead: '',
    vol: ['Sara El Amrani'],
    url: '',
    placeholder: true,
  },
]

const EVENTS: EventEntry[] = [
  {
    id: 'e1',
    title: 'Halloween Party',
    desc: 'Costumes, games, storytelling and a short scavenger hunt. Open to all members and their friends.',
    recur: 'none',
    date: '2026-10-31',
    time: '16:00-18:00',
    place: 'American Space Oujda',
  },
  {
    id: 'e2',
    title: 'Thanksgiving Potluck',
    desc: 'A shared meal and a short talk on the story of Thanksgiving. Bring a dish if you can.',
    recur: 'none',
    date: '2026-11-26',
    time: '18:00-20:00',
    place: 'American Space Oujda',
  },
  {
    id: 'e3',
    title: 'English Hour',
    desc: 'A weekly open speaking table: drop in, pick a topic card, talk for an hour.',
    recur: 'weekly',
    day: 'Sat',
    time: '11:00-12:00',
    place: 'American Space',
  },
]

const TEAM: TeamMember[] = [
  {
    id: 't1',
    name: 'Khalid Chellali',
    role: 'Coordinator',
    phone: '+212 6 00 00 00 00',
    email: 'khalid@aso-oujda.ma',
  },
  {
    id: 't2',
    name: 'Aya Boutarfas',
    role: 'Volunteer Teacher - Kids',
    phone: '+212 6 11 11 11 11',
    email: 'aya@aso-oujda.ma',
  },
  {
    id: 't3',
    name: 'Sara El Amrani',
    role: 'Volunteer Teacher - Teens',
    phone: '+212 6 22 22 22 22',
    email: 'sara@aso-oujda.ma',
  },
]

const VOLUNTEERS: Volunteer[] = [
  {
    id: 'v1',
    name: 'Imane Cherkaoui',
    role: 'Club volunteer',
    phone: '+212 6 33 33 33 33',
    aso: '10234',
    email: 'imane@aso-oujda.ma',
  },
  {
    id: 'v2',
    name: 'Yassine Maaroufi',
    role: 'Club volunteer',
    phone: '+212 6 44 44 44 44',
    aso: '10235',
    email: 'yassine@aso-oujda.ma',
  },
]

const LIBRARY: LibraryFolder[] = [
  {
    id: 'l1',
    name: "Teacher's Guide",
    desc: 'Classroom routines, lesson structures and assessment guides for new teachers.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['L', 'S', 'R', 'W'],
  },
  {
    id: 'l2',
    name: 'Lesson Plans',
    desc: 'Ready-to-teach weekly plans for every level and week.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['L', 'S', 'R', 'W'],
  },
  {
    id: 'l3',
    name: 'Flashcards',
    desc: 'Picture flashcards organised by topic, ready to print.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['L', 'S', 'R'],
  },
  {
    id: 'l4',
    name: 'Worksheets',
    desc: 'Printable worksheets for vocabulary, grammar and writing practice.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['R', 'W'],
  },
  {
    id: 'l5',
    name: 'Music and Songs',
    desc: 'Songs and chants for the kids levels - hello, goodbye and topic songs.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxd2NkOXNyUWlGVTg',
    sk: ['L'],
  },
  {
    id: 'l6',
    name: 'Listening and Podcasts',
    desc: 'Audio and podcast clips graded by level for the listening slot.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['L'],
  },
  {
    id: 'l7',
    name: 'Reading and Books',
    desc: 'Graded readers, short stories and comprehension tasks.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['R'],
  },
  {
    id: 'l8',
    name: 'Speaking Games',
    desc: 'Board games, roleplay cards and prompts for the speaking slot.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['S'],
  },
  {
    id: 'l9',
    name: 'Tests and Exams',
    desc: 'Practice tests, KET/PET materials and end-of-term assessments.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['L', 'S', 'R', 'W'],
  },
  {
    id: 'l10',
    name: 'Coursebooks',
    desc: 'Cambridge Global English and supplementary coursebooks for all levels.',
    url: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    sk: ['L', 'S', 'R', 'W'],
  },
]

const NOTES: Note[] = [
  { week: 4, text: 'Halloween week' },
  { week: 14, text: 'Christmas party - last class before winter break' },
  { week: 15, text: 'Semester 1 assessment' },
  { week: 30, text: 'Final assessment + certificates' },
]

export function seedState(): State {
  return {
    v: 1,
    _rev: 1,
    settings: {
      theme: 'light',
      coordinator: 'Khalid',
      institute: 'American Space Oujda',
      year: '2026-2027',
      cc: '212',
      s1Start: '2026-10-05',
      s2Start: '2027-01-18',
      s1Weeks: 15,
      adminCode: '1234',
      ghAutoSave: false,
      ghAutoLoad: true,
    },
    rootUrl: 'https://drive.google.com/drive/folders/0B2Q8XuO2ebzxMEYzb0RYV1NBZVU',
    levels: LEVELS,
    classes: CLASSES,
    clubs: CLUBS,
    events: EVENTS,
    volunteers: VOLUNTEERS,
    library: LIBRARY,
    libraryPins: [],
    notes: NOTES,
    team: TEAM,
  }
}
