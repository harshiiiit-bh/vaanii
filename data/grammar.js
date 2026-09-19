/* VAANI data module — Grammar lessons.
   Extracted from index.html so it can be edited on its own. */
const GRAMMAR = [
{id:'parts-of-speech',icon:'🧩',title:'Parts of Speech',desc:'The 8 building blocks of every English sentence.',
 learn:`<p>Every word in English belongs to one of eight <b>parts of speech</b>, based on the job it does in a sentence. Recognising these instantly is the foundation for every other grammar topic on the NDA paper — error spotting, sentence improvement and cloze tests all assume you can tag a word's part of speech at speed.</p>
 <ul>
 <li><b>Noun</b> — names a person, place, thing or idea (soldier, Delhi, courage)</li>
 <li><b>Pronoun</b> — replaces a noun (he, they, who)</li>
 <li><b>Verb</b> — shows action or state (march, is, became)</li>
 <li><b>Adjective</b> — describes a noun (brave, swift)</li>
 <li><b>Adverb</b> — describes a verb, adjective or another adverb (quickly, very)</li>
 <li><b>Preposition</b> — shows relation (in, under, before)</li>
 <li><b>Conjunction</b> — joins words/clauses (and, because)</li>
 <li><b>Interjection</b> — shows sudden emotion (Wow! Alas!)</li>
 </ul>
 <p>The same word can shift part of speech depending on context: <i>"Light"</i> is a noun in "switch on the light," a verb in "light the lamp," and an adjective in "a light bag."</p>`,
 examples:[
   {s:'The disciplined cadet marched briskly across the parade ground.',note:'disciplined=adjective, cadet=noun, marched=verb, briskly=adverb, across=preposition, parade ground=noun'},
   {s:'He quickly hid behind the wall, but they found him.',note:'quickly=adverb, behind=preposition, but=conjunction, him=pronoun'}
 ],
 tricks:[{t:'Ask "what job is this word doing right now?" — never memorise a word\'s part of speech permanently; it changes with context.'}],
 mistakes:[{m:'Treating gerunds (running, reading) as verbs. They function as nouns: "Running is healthy."'}],
 summary:'8 parts of speech: noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection. Same word can change category by function.',
 quiz:[
   {q:'In "She sang beautifully," the word "beautifully" is a/an:',opts:['Adjective','Adverb','Noun','Preposition'],ans:1,exp:'It modifies the verb "sang," describing how she sang — that\'s an adverb.'},
   {q:'Identify the conjunction: "He was tired, yet he kept marching."',opts:['tired','yet','kept','marching'],ans:1,exp:'"Yet" joins two clauses showing contrast — a coordinating conjunction.'},
   {q:'"Alas! We lost the match." — "Alas" is a/an:',opts:['Adverb','Interjection','Noun','Verb'],ans:1,exp:'It expresses sudden emotion with no grammatical link to the rest of the sentence — an interjection.'}
 ],
 meta:{difficulty:1,time:'7 min',prereq:[],related:['Noun','Verb','Adjective']},
 didYouKnow:'English had only 8 official parts of speech for centuries, but many modern grammarians now treat "determiners" (a, the, this, my) as a 9th category, separate from adjectives — NDA papers still follow the classic 8-part system.',
 exception:'Some words look identical across categories: "down" is a noun (goose down), verb (down a glass of water), adjective (down payment), adverb (sit down), and preposition (down the hill) — all five at once. Always test by function in the sentence, never by the word alone.',
 diagram:{center:'Parts of Speech',branches:[
   {label:'Naming Words',sub:['Noun','Pronoun']},
   {label:'Doing Words',sub:['Verb']},
   {label:'Describing Words',sub:['Adjective','Adverb']},
   {label:'Joining/Linking',sub:['Preposition','Conjunction']},
   {label:'Feeling Words',sub:['Interjection']}
 ]},
 levels:{
   beginner:`<p>Think of a sentence as a small team with fixed jobs. The <b>noun</b> is the player who is named. The <b>verb</b> is the action they perform. The <b>adjective</b> describes the noun, the <b>adverb</b> describes the verb. Start by spotting just these four in every sentence you read — the rest follow naturally.</p>`,
   intermediate:`<p>Move beyond labelling to <b>function-testing</b>: ask "what role is this word playing right now?" rather than "what part of speech is this word, generally?" This matters because NDA error-spotting questions hide their trick in exactly this shift — a word you know as a noun (e.g. "water") appears as a verb ("water the plants").</p>`,
   advanced:`<p>Study <b>conversion</b> (zero derivation) — the process by which a word changes part of speech without changing form, e.g. "access" (noun → verb), "google" (proper noun → verb). NDA cloze and improvement questions test whether you can recognise a converted word mid-sentence without being thrown off by its "default" category.</p>`,
   expert:`<p>At competitive level, study how part-of-speech ambiguity creates <b>garden-path sentences</b> — "The old man the boats" (where "man" is forced to be read as a verb, not a noun) — a classic trick used in toughest sentence-improvement and error-spotting sets to test whether your parsing is genuinely fast or just pattern-matched.</p>`
 },
 comparison:{headers:['Part of Speech','Job in Sentence','Quick Test','Example'],
   rows:[
     ['Noun','Names a thing','Can you put "the" before it?','the soldier'],
     ['Pronoun','Replaces a noun','Does it stand in for a name already mentioned?','he, they'],
     ['Verb','Shows action/state','Can it take "-ed/-ing" or follow "to"?','marched, is'],
     ['Adjective','Describes a noun','Can it answer "what kind/which/how many"?','brave, three'],
     ['Adverb','Describes verb/adj/adv','Can it answer "how/when/where/how much"?','quickly, very']
   ]},
 cheatSheet:{title:'8 Parts of Speech — One Glance',items:[
   {k:'NOUN',v:'person/place/thing/idea'},{k:'PRONOUN',v:'replaces a noun'},
   {k:'VERB',v:'action or state'},{k:'ADJECTIVE',v:'describes a noun'},
   {k:'ADVERB',v:'describes verb/adj/adv'},{k:'PREPOSITION',v:'shows relation'},
   {k:'CONJUNCTION',v:'joins words/clauses'},{k:'INTERJECTION',v:'sudden emotion'}
 ]},
 officerTip:'In SSB-style group discussions and the written exam alike, identifying a speaker\'s use of strong verbs vs weak adjectives is a fast way to judge clarity of thought — officers are trained to write in active verbs, not adjective-heavy fluff. Carry this habit into your own sentence-improvement answers: when in doubt, the verb-strong option is usually the better English.',
 realLife:'Newspaper headlines deliberately compress grammar by dropping articles and using nouns as verbs ("Govt eyes new policy") — recognising this helps in reading comprehension passages drawn from editorials.',
 pyqNotes:[
   {q:'NDA papers repeatedly test interjections hidden inside longer sentences — what is the trick?',a:'Look for a word/phrase set off by a comma or exclamation mark that carries no grammatical link to the rest of the sentence (Alas, Hurrah, Oh) — it is almost always the interjection, regardless of position.'},
   {q:'Gerunds are the single most common parts-of-speech trap in NDA error spotting — why?',a:'A gerund (verb+ing) functions as a noun ("Swimming is good exercise"), so candidates wrongly mark the sentence as having a "missing subject" or "wrong verb form" when actually it is grammatically correct.'}
 ],
 mnemonicChain:'"Some New Verbs Are Always Perfectly Concise, Interjecting!" — first letters cue Noun, Verb, Adjective, Adverb, Preposition, Conjunction, Interjection (plus Pronoun, the silent "S").'},
{id:'noun',icon:'🏷️',title:'Noun',desc:'Common, proper, abstract, collective and countable/uncountable nouns.',
 learn:`<p>A <b>noun</b> names a person, place, thing, quality or idea. NDA papers test noun <i>types</i> and <i>number agreement</i> heavily.</p>
 <ul><li><b>Proper noun</b> — specific name, always capitalised (India, Kargil)</li>
 <li><b>Common noun</b> — general class (country, soldier)</li>
 <li><b>Collective noun</b> — group treated as one unit (army, fleet, jury)</li>
 <li><b>Abstract noun</b> — idea/quality, cannot be touched (courage, loyalty)</li>
 <li><b>Material noun</b> — substance (steel, water)</li>
 <li><b>Countable vs uncountable</b> — "soldiers" can be counted; "information" cannot.</li></ul>
 <p>Collective nouns usually take a <b>singular verb</b> when the group acts as one: "The army marches." They take a plural verb only when members act individually: "The army are quarrelling among themselves" (less common, more British usage).</p>`,
 examples:[{s:'The committee has announced its decision.',note:'Collective noun "committee" acting as one unit → singular verb "has".'},
 {s:'Honesty is the best policy.',note:'Abstract noun "honesty" used as subject.'}],
 tricks:[{t:'Uncountable nouns (advice, furniture, information, news) never take "a/an" or a plural -s. Say "a piece of advice," not "an advice."'}],
 mistakes:[{m:'Writing "informations" or "furnitures" — these nouns have no plural form.'}],
 summary:'Know proper/common/collective/abstract/material distinctions; uncountable nouns never pluralise; collective nouns mostly take singular verbs.',
 quiz:[
   {q:'Which sentence is correct?',opts:['She gave me an advice.','She gave me a piece of advice.','She gave me advices.','She gave me an advices.'],ans:1,exp:'"Advice" is uncountable — use "a piece of advice."'},
   {q:'"The jury ___ reached its verdict." Choose the correct verb.',opts:['have','has','were','are'],ans:1,exp:'Jury acting as a single unit takes a singular verb "has."'}
 ]},
{id:'pronoun',icon:'🔁',title:'Pronoun',desc:'Personal, reflexive, relative and indefinite pronouns.',
 learn:`<p>A <b>pronoun</b> stands in for a noun to avoid repetition. NDA frequently tests pronoun-antecedent agreement and case (subject/object/possessive).</p>
 <ul><li><b>Personal</b> — I, you, he, she, it, we, they</li>
 <li><b>Reflexive</b> — myself, himself, themselves (action reflects back on subject)</li>
 <li><b>Relative</b> — who, whom, whose, which, that (introduce relative clauses)</li>
 <li><b>Indefinite</b> — someone, anybody, each, none, all</li>
 <li><b>Demonstrative</b> — this, that, these, those</li></ul>
 <p>A pronoun must agree in <b>number and gender</b> with its antecedent: "Each student must submit <u>his/her</u> form" (not "their," strictly, in formal grammar — though modern usage increasingly accepts singular "they").</p>`,
 examples:[{s:'Neither of the boys has finished his homework.',note:'"Neither" is singular, so the pronoun "his" and verb "has" must be singular.'},
 {s:'She blamed herself for the mistake.',note:'Reflexive pronoun "herself" because subject and object are the same person.'}],
 tricks:[{t:'WHO vs WHOM: if you can replace it with "he," use WHO. If you can replace it with "him," use WHOM. ("Who/Whom did you see?" → "I saw him" → WHOM.)'}],
 mistakes:[{m:'"Me and him went to the range" — should be "He and I went to the range." Subject pronouns (I, he) are used as subjects, not "me/him."'}],
 summary:'Match pronoun number/gender to antecedent; distinguish who/whom by subject/object test; reflexive pronouns when subject=object.',
 quiz:[
   {q:'Choose correct: "___ did you give the report to?"',opts:['Who','Whom','Whose','Which'],ans:1,exp:'It is the object of "give...to" — replace with "him" → use WHOM.'},
   {q:'"Each of the candidates must bring ___ own ID card."',opts:['their','his','they','them'],ans:1,exp:'"Each" is singular, formally requiring "his" (or his/her).'}
 ]},
{id:'verb',icon:'⚡',title:'Verb',desc:'Action, linking, auxiliary and transitive/intransitive verbs.',
 learn:`<p>A <b>verb</b> expresses action or state of being and is the engine of every clause.</p>
 <ul><li><b>Action verb</b> — run, fight, build</li>
 <li><b>Linking verb</b> — is, seem, become (connect subject to a complement)</li>
 <li><b>Auxiliary (helping) verb</b> — is, has, will, do, can, must — supports the main verb</li>
 <li><b>Transitive verb</b> — needs a direct object ("He kicked the ball")</li>
 <li><b>Intransitive verb</b> — no object needed ("He sleeps")</li></ul>
 <p>Verbs change form for <b>tense</b> (walk/walked), <b>number</b> (he walks vs they walk), and <b>voice</b> (active/passive) — all separately tested topics below.</p>`,
 examples:[{s:'The general appeared confident before the briefing.',note:'"Appeared" is a linking verb connecting subject to adjective "confident."'},
 {s:'She gave him the map.',note:'Transitive verb "gave" with direct object "map" and indirect object "him."'}],
 tricks:[{t:'If a sentence sounds complete without an object, the verb is likely intransitive. Test: "He arrived" works alone — intransitive. "He brought" needs an object — transitive.'}],
 mistakes:[{m:'Confusing "lay" (to place something) with "lie" (to recline). "I lay the book on the table" vs "I lie down to rest." Past tense of "lie" is "lay," which adds to the confusion.'}],
 summary:'Verbs: action/linking/auxiliary; transitive needs an object, intransitive doesn\'t; watch lay vs lie.',
 quiz:[
   {q:'Which verb is intransitive? "He laughed loudly."',opts:['laughed is transitive','laughed is intransitive','loudly is the verb','No verb present'],ans:1,exp:'"Laughed" needs no object to complete its meaning — intransitive.'},
   {q:'Correct form: "Please ___ the file on my desk."',opts:['lay','lie','lain','laying'],ans:0,exp:'"Lay" takes a direct object ("the file") — to place something.'}
 ]},
{id:'adjective',icon:'🎨',title:'Adjective',desc:'Descriptive, quantitative, demonstrative and degrees.',
 learn:`<p>An <b>adjective</b> qualifies or describes a noun/pronoun. Types include descriptive (brave), quantitative (some, few), demonstrative (this, those), and possessive (my, his).</p>
 <p>Adjective <b>order</b> matters in English: opinion → size → age → shape → colour → origin → material → purpose → noun. E.g., "a beautiful small old round brown Indian wooden carving" follows this chain — NDA tests this through sentence-correction questions.</p>`,
 examples:[{s:'He owns a small antique brass compass.',note:'Order: size(small) → age(antique) → material(brass) → noun(compass).'}],
 tricks:[{t:'Remember adjective order with OSASCOMP: Opinion, Size, Age, Shape, Colour, Origin, Material, Purpose.'}],
 mistakes:[{m:'Using "more better" or "most best" — double comparatives/superlatives are always wrong. Just "better" or "best."'}],
 summary:'Adjective types and OSASCOMP ordering rule; never double up comparative/superlative forms.',
 quiz:[{q:'Which is correctly ordered?',opts:['a brass small old compass','a small old brass compass','an old brass small compass','a compass small old brass'],ans:1,exp:'Correct OSASCOMP order: size(small) → age(old) → material(brass).'}]},
{id:'adverb',icon:'🏃',title:'Adverb',desc:'Manner, time, place, frequency and degree.',
 learn:`<p>An <b>adverb</b> modifies a verb, adjective or another adverb, usually answering how/when/where/how often/to what extent.</p>
 <ul><li>Manner: quickly, bravely</li><li>Time: now, yesterday</li><li>Place: here, outside</li><li>Frequency: always, rarely</li><li>Degree: very, almost</li></ul>
 <p>Position matters: adverbs of frequency usually sit before the main verb but after "be": "He <u>always</u> arrives early," but "He <u>is always</u> punctual."</p>`,
 examples:[{s:'She rarely complains about the harsh training.',note:'Frequency adverb "rarely" placed before main verb "complains."'}],
 tricks:[{t:'Not all words ending in -ly are adverbs (friendly, lovely are adjectives!) — check the function, not just the spelling.'}],
 mistakes:[{m:'"He drives slow" should be "He drives slowly" in formal/written English — use the adverb form to modify a verb.'}],
 summary:'5 adverb types; placement rules around "be" verbs; -ly is not a reliable test for adverb status.',
 quiz:[{q:'Which sentence uses the adverb correctly?',opts:['He is always late.','He always is late.','He late is always.','Always he is late.'],ans:0,exp:'Frequency adverbs go after the verb "be": "is always."'}]},
{id:'preposition',icon:'📍',title:'Preposition',desc:'In, on, at, by, since, for — and the fixed prepositional phrases NDA loves to test.',
 learn:`<p>A <b>preposition</b> shows the relationship between a noun/pronoun and another word — usually time, place or direction.</p>
 <ul><li><b>Time:</b> at 5pm, on Monday, in March, since 2020, for 3 years</li>
 <li><b>Place:</b> in the room, on the table, at the gate, under the bridge</li>
 <li><b>Fixed phrases:</b> good at, afraid of, married to, dependent on, proud of</li></ul>
 <p>NDA loves testing fixed preposition collocations — these must be memorised, since logic alone won't always predict the right one.</p>`,
 examples:[{s:'He is proud of his achievements.',note:'"Proud of" is a fixed collocation, not "proud on" or "proud for."'},
 {s:'The meeting is scheduled for 9 am on Monday.',note:'"for" + time-point, "on" + day.'}],
 tricks:[{t:'Memorise prepositions as part of the whole phrase (e.g. "good AT," "interested IN," "married TO") rather than translating literally from your first language.'}],
 mistakes:[{m:'"Married with" is wrong — correct form is "married TO" someone.'}],
 summary:'Time/place prepositions + fixed collocations must be memorised as units.',
 quiz:[{q:'Fill the blank: "She is married ___ an army officer."',opts:['with','to','by','at'],ans:1,exp:'Correct fixed collocation: "married to."'},
 {q:'Fill the blank: "He has been working here ___ 2019."',opts:['for','since','from','at'],ans:1,exp:'"Since" + a specific starting point in time; "for" + duration.'}]},
{id:'conjunction',icon:'🔗',title:'Conjunction',desc:'Coordinating, subordinating and correlative conjunctions.',
 learn:`<p>A <b>conjunction</b> joins words, phrases or clauses.</p>
 <ul><li><b>Coordinating</b> (FANBOYS): For, And, Nor, But, Or, Yet, So — join equal elements</li>
 <li><b>Subordinating</b>: because, although, since, while, if — join a dependent clause to a main clause</li>
 <li><b>Correlative</b>: either...or, neither...nor, not only...but also, both...and</li></ul>
 <p>Correlative conjunctions require <b>parallel structure</b> on both sides — a major NDA error-spotting trap.</p>`,
 examples:[{s:'Not only did he win the race, but he also broke the record.',note:'Correlative pair "not only...but also" with parallel clause structure.'}],
 tricks:[{t:'For correlatives, check that the grammatical form after each part matches: "either swimming or running" (both gerunds) — not "either swimming or to run."'}],
 mistakes:[{m:'"He is neither tall or strong" — wrong pairing. Correct: "neither tall NOR strong."'}],
 summary:'3 conjunction types; correlative conjunctions demand parallel structure; memorise correct pairings (neither/nor, either/or).',
 quiz:[{q:'Correct sentence:',opts:['He is neither tall or strong.','He is neither tall nor strong.','He is either tall or strong nor weak.','He is neither tall, or strong.'],ans:1,exp:'"Neither" must pair with "nor," never "or."'}]},
{id:'articles',icon:'🅰️',title:'Articles',desc:'A, an, the — and when to use no article at all.',
 learn:`<p><b>A/An</b> are indefinite articles (one of many); <b>the</b> is definite (a specific, known thing).</p>
 <ul><li>Use "a" before consonant <i>sounds</i>: a university (sounds like "yoo")</li>
 <li>Use "an" before vowel <i>sounds</i>: an hour (silent h), an MBA (sounds like "em")</li>
 <li>Use "the" for unique things (the sun), previously mentioned nouns, superlatives (the best)</li>
 <li>No article before most proper nouns, uncountable nouns in general sense, or plural general nouns: "Soldiers are brave" (no article needed)</li></ul>`,
 examples:[{s:'She is an honest officer who arrived in an hour.',note:'"Honest" and "hour" start with silent/vowel sounds → "an."'},
 {s:'The Ganga is the longest river in India.',note:'"The" used for a unique/specific named river and superlative.'}],
 tricks:[{t:'Always test by SOUND, not spelling: "a European trip" (Y-sound) but "an MP" (EM-sound).'}],
 mistakes:[{m:'"He is an university student" is wrong — university starts with a Y-sound, so it takes "a."'}],
 summary:'A/an depends on sound not spelling; "the" for specific/unique/superlative; no article for general plurals and most proper nouns.',
 quiz:[{q:'Choose correctly: "He bought ___ one-rupee coin."',opts:['a','an','the','no article'],ans:1,exp:'"One" is pronounced "won" — a consonant sound — wait, actually "one" starts with a W sound, so it should be "a." '}],
 meta:{difficulty:1,time:'5 min',prereq:['Noun'],related:['Determiners','Noun']},
 didYouKnow:'"The" is the most frequently used word in the entire English language — appearing roughly once in every 16 words of typical written text — yet it is also the single most-tested error-spotting word on competitive English papers, including NDA.',
 exception:'Some nouns that look uncountable take "the" when made specific by context: "Water is essential for life" (no article, general) vs "The water in this tank is dirty" (the, specific). The presence of a describing phrase after the noun often signals you need "the."',
 diagram:{center:'Articles',branches:[
   {label:'Indefinite (a/an)',sub:['One of many','By sound not spelling','First mention']},
   {label:'Definite (the)',sub:['Specific/known','Superlatives','Unique things']},
   {label:'Zero Article',sub:['Proper nouns','General plurals','Uncountables (general)']}
 ]},
 levels:{
   beginner:`<p>Three choices only: <b>a</b> (one of many, starts with consonant sound), <b>an</b> (one of many, starts with vowel sound), or <b>the</b> (one specific thing both speaker and listener already know about). Read every noun and ask: "Am I talking about ANY one, or THE one we both know?"</p>`,
   intermediate:`<p>The sound rule trips most students: it is about pronunciation, not the written letter. "An hour" (silent h), "a university" (sounds like "yoo-niversity"), "an MBA" (sounds like "em-bee-ay"), "a one-way street" (sounds like "won"). Always say the word aloud mentally before choosing.</p>`,
   advanced:`<p>Study article use with abstract and proper nouns in special contexts: rivers, oceans, mountain ranges, and countries with plural-sounding names take "the" (the Ganga, the Himalayas, the United States), while single countries, cities, and most proper names take no article (India, Delhi, Ravi) — except formal/official institutional names (the Indian Army, the Parliament).</p>`,
   expert:`<p>NDA-level traps combine zero article with generic plural nouns used in a near-specific sense: "Tigers are endangered" (general, no article) vs "The tigers in Ranthambore are closely monitored" (specific group, "the"). Expert test-takers scan for any qualifying phrase (in Ranthambore, on this list, that we saw) immediately after the noun — its presence almost always demands "the."</p>`
 },
 comparison:{headers:['Article','Type','When Used','Example'],
   rows:[
     ['a','Indefinite','Before consonant SOUND, one of many','a soldier, a university'],
     ['an','Indefinite','Before vowel SOUND, one of many','an officer, an hour'],
     ['the','Definite','Specific/unique/superlative/previously mentioned','the Ganga, the best'],
     ['(none)','Zero article','Proper nouns, general plurals, uncountables in general sense','Soldiers are brave']
   ]},
 cheatSheet:{title:'Article Selection — One Glance',items:[
   {k:'SOUND TEST',v:'consonant sound→a, vowel sound→an'},
   {k:'SPECIFIC?',v:'yes→the'},
   {k:'SUPERLATIVE',v:'always takes the'},
   {k:'PROPER NOUN',v:'usually no article'},
   {k:'GENERAL PLURAL',v:'no article'},
   {k:'RIVERS/RANGES/OCEANS',v:'always the'}
 ]},
 officerTip:'In SSB interviews, overusing "the" before general statements ("The discipline is important for the soldiers") is a giveaway of translated Hindi-thinking English. Officers are trained to speak in clean generic statements without unnecessary articles — practise dropping "the" wherever the noun is general, not specific.',
 realLife:'Headlines often drop articles entirely for brevity ("PM to visit Delhi tomorrow") — recognising this helps you correctly expand headline-style sentences in cloze and sentence-improvement questions.',
 pyqNotes:[
   {q:'Why does NDA repeatedly test "an hour" / "an honest man" / "an MBA"?',a:'These are the classic silent-consonant/vowel-sound traps — the spelling starts with a consonant but the sound starts with a vowel, so "an" is correct despite the spelling.'},
   {q:'What is the trap with "the police", "the army", "the public"?',a:'These collective/institutional nouns conventionally always take "the" even though they look like general/common nouns — a frequently tested exception.'}
 ],
 mnemonicChain:'"A/An is ANY one — THE is THE one we both know." Say it before every blank.'},
{id:'tenses',icon:'⏱️',title:'Tenses (All 12)',desc:'Past, present, future × simple, continuous, perfect, perfect continuous.',
 learn:`<p>English has 12 tense forms across 3 time-frames × 4 aspects. NDA's grammar and error-spotting sections lean heavily on tense consistency.</p>
 <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:.85rem">
 <tr style="color:var(--gold)"><td></td><td><b>Simple</b></td><td><b>Continuous</b></td><td><b>Perfect</b></td><td><b>Perfect Continuous</b></td></tr>
 <tr><td><b>Present</b></td><td>I write</td><td>I am writing</td><td>I have written</td><td>I have been writing</td></tr>
 <tr><td><b>Past</b></td><td>I wrote</td><td>I was writing</td><td>I had written</td><td>I had been writing</td></tr>
 <tr><td><b>Future</b></td><td>I will write</td><td>I will be writing</td><td>I will have written</td><td>I will have been writing</td></tr>
 </table>
 <p style="margin-top:14px">Key signal words: "since/for" → perfect tenses; "yesterday/ago" → simple past; "by next year" → future perfect; "now/currently" → continuous.</p>`,
 examples:[{s:'I have lived in Dehradun for ten years.',note:'Present perfect — action started in the past, continues now, with "for" + duration.'},
 {s:'By the time he reaches the academy, the parade will have started.',note:'Future perfect — an action completed before another future action.'}],
 tricks:[{t:'"Since" pairs with a POINT in time (since 2015, since Monday); "for" pairs with a DURATION (for 5 years, for two weeks). Mixing them up is one of the most common NDA traps.'}],
 mistakes:[{m:'"I am knowing the answer" is wrong — stative verbs (know, believe, love, want) are rarely used in continuous form. Say "I know the answer."'}],
 summary:'12 tense forms = 3 times × 4 aspects; since=point, for=duration; stative verbs avoid continuous form.',
 quiz:[
   {q:'Choose correct: "She ___ here since 2018."',opts:['lives','is living','has lived','lived'],ans:2,exp:'"Since" + point in time signals present perfect: "has lived."'},
   {q:'Choose correct: "I ___ this book; ask me anything about it."',opts:['am knowing','know','was knowing','have been knowing'],ans:1,exp:'"Know" is stative — never used in continuous form.'},
   {q:'"By 2030, India ___ its space station."',opts:['will launch','will have launched','launches','is launching'],ans:1,exp:'Future perfect signals an action complete before a future point — "will have launched."'}
 ],
 meta:{difficulty:3,time:'12 min',prereq:['Verb'],related:['Subject-Verb Agreement','Active & Passive Voice']},
 didYouKnow:'Despite having 12 named tense forms, English technically has only TWO true grammatical tenses by linguistic definition — present and past. "Future" is built using the modal "will," not a unique verb ending, which is why some grammarians argue English has no dedicated future tense at all.',
 exception:'Stative verbs (know, believe, love, want, own, seem, belong) are not normally used in continuous form even when describing a current state — "I am knowing him" is wrong; say "I know him." However, several stative verbs CAN take continuous form when describing a deliberate, temporary action: "I am thinking about it" (active choice) vs "I think it is true" (opinion/state).',
 diagram:{center:'12 Tenses',branches:[
   {label:'Present',sub:['Simple: I write','Continuous: I am writing','Perfect: I have written','Perf. Continuous: I have been writing']},
   {label:'Past',sub:['Simple: I wrote','Continuous: I was writing','Perfect: I had written','Perf. Continuous: I had been writing']},
   {label:'Future',sub:['Simple: I will write','Continuous: I will be writing','Perfect: I will have written','Perf. Continuous: I will have been writing']}
 ]},
 levels:{
   beginner:`<p>Start with the 3 SIMPLE tenses only: simple present (daily facts/habits — "I walk"), simple past (finished actions — "I walked"), simple future (predictions/plans — "I will walk"). Master spotting these three correctly before touching continuous or perfect forms.</p>`,
   intermediate:`<p>Add CONTINUOUS (action in progress, uses be+verb-ing) and PERFECT (action linked to another time, uses have+past participle). The key mental shift: continuous = "happening right now/then," perfect = "already completed, but relevant to another point in time."</p>`,
   advanced:`<p>Master PERFECT CONTINUOUS forms, which combine duration + ongoing relevance: "I have been working here for five years" stresses both the ongoing action AND its duration up to now. NDA loves testing whether you can distinguish present perfect ("I have worked," completed, result matters) from present perfect continuous ("I have been working," duration matters).</p>`,
   expert:`<p>At the highest level, study tense SEQUENCING across multi-clause sentences — the rule that a past-tense main clause forces a past or past-perfect form in the subordinate clause ("He said he HAD finished," not "has finished"), except for universal truths and habitual facts which remain in present tense regardless of the reporting verb's tense.</p>`
 },
 comparison:{headers:['Tense','Structure','Signal Words','Example'],
   rows:[
     ['Simple Present','V1/V1+s','always, usually, every day','He walks daily.'],
     ['Present Continuous','am/is/are + V-ing','now, currently, right now','He is walking now.'],
     ['Present Perfect','have/has + V3','already, just, since, for, yet','He has walked already.'],
     ['Present Perfect Continuous','have/has been + V-ing','since, for (with ongoing emphasis)','He has been walking for an hour.'],
     ['Simple Past','V2','yesterday, ago, last week','He walked yesterday.'],
     ['Future Perfect','will have + V3','by the time, by next year','He will have walked by then.']
   ]},
 cheatSheet:{title:'Tense Signal Words — One Glance',items:[
   {k:'SINCE',v:'point in time → perfect tense'},
   {k:'FOR',v:'duration → perfect tense'},
   {k:'YESTERDAY/AGO',v:'simple past'},
   {k:'NOW/CURRENTLY',v:'continuous'},
   {k:'BY + future time',v:'future perfect'},
   {k:'EVERY DAY/USUALLY',v:'simple present'}
 ]},
 officerTip:'In written exam essays and SSB personal interviews, switching tenses mid-narrative (starting in past, drifting into present) is one of the most common marks-losers. Officers are taught to lock a single reporting tense for a whole narrative — pick past tense for retelling an experience and hold it throughout.',
 realLife:'News anchors deliberately use present tense for past events to create immediacy ("Breaking: Forces RECAPTURE post") — called the "historical present" — recognise this style shift in reading comprehension passages drawn from news reports.',
 pyqNotes:[
   {q:'Why does NDA test "since" vs "for" so heavily?',a:'Because both pair only with perfect tenses but signal different things — "since" marks a starting POINT (since 2015), "for" marks a DURATION (for 5 years). Swapping them is grammatically wrong even though meaning seems similar.'},
   {q:'What is the most common tense-consistency trap in NDA error spotting?',a:'A sentence starting in past tense that silently shifts to present tense mid-sentence without a valid reason (such as reporting a universal truth) — always check that every verb in one continuous narrative matches in time-frame.'}
 ],
 mnemonicChain:'"SUFFER" for Since/Until = point in Future/perFect; "FOR" = duration. Or simply: SINCE points, FOR counts.'},
{id:'voice',icon:'🔄',title:'Active &amp; Passive Voice',desc:'Subject-does vs subject-receives — and when each is appropriate.',
 learn:`<p>In <b>active voice</b>, the subject performs the action: "The soldier fired the gun." In <b>passive voice</b>, the subject receives the action: "The gun was fired by the soldier."</p>
 <p>Formula: <b>object + be(in correct tense) + past participle + (by + agent)</b>. Passive is preferred in formal/official writing when the doer is unknown or unimportant: "The bridge was constructed in 1998."</p>`,
 examples:[{s:'Active: The committee approved the proposal. → Passive: The proposal was approved by the committee.',note:'Object becomes new subject; verb becomes be+past participle.'},
 {s:'Active: They are repairing the road. → Passive: The road is being repaired.',note:'Continuous tense passive uses "being + past participle."'}],
 tricks:[{t:'To convert any sentence, identify Subject-Verb-Object first, then swap S and O, adjust the verb to match tense, and add "by" only if the doer matters.'}],
 mistakes:[{m:'Forgetting to change the helping verb to match tense: "The work was finishing" is wrong — should be "The work was finished" or "The work was being finished."'}],
 summary:'Passive = object + correct form of be + past participle (+ by agent); used when doer is unknown/unimportant or in formal tone.',
 quiz:[
   {q:'Passive of "She is writing a letter":',opts:['A letter is written by her.','A letter is being written by her.','A letter was written by her.','A letter has been written by her.'],ans:1,exp:'Present continuous passive: "is being written."'},
   {q:'Passive of "Someone has stolen my wallet":',opts:['My wallet was stolen.','My wallet has been stolen.','My wallet is stolen.','My wallet had been stolen.'],ans:1,exp:'Present perfect active → present perfect passive: "has been stolen."'}
 ],
 meta:{difficulty:2,time:'8 min',prereq:['Verb','Tenses (All 12)'],related:['Tenses (All 12)','Direct & Indirect Speech']},
 didYouKnow:'Military and official reports overwhelmingly favour passive voice ("The post was attacked at 0400 hours") because it foregrounds the EVENT rather than the actor — this is why NDA comprehension passages drawn from defence reporting are unusually passive-heavy compared to everyday English.',
 exception:'Intransitive verbs (sleep, arrive, die, happen — verbs with no object) CANNOT be converted to passive voice at all, because passive requires an object to become the new subject. "He arrived early" has no passive form. Also, sentences with verbs like "have" (possession, not action) and "resemble," "suit," "fit" are rarely passivised in natural English.',
 diagram:{center:'Active ↔ Passive',branches:[
   {label:'Active Voice',sub:['Subject DOES the action','Subject + Verb + Object','Direct, concise']},
   {label:'Passive Voice',sub:['Subject RECEIVES the action','Object + be + V3 (+ by agent)','Formal, doer unknown/unimportant']}
 ]},
 levels:{
   beginner:`<p>Find the doer and the receiver. In "The dog bit the man," the dog DOES the biting (active). Flip it: "The man WAS BITTEN by the dog" — the man now sits in subject position but receives the action (passive). Practice flipping 5 simple sentences a day until this feels automatic.</p>`,
   intermediate:`<p>Learn the formula precisely: <b>object + correct form of "be" + past participle (+ by + agent)</b>. The hardest part is matching "be" to the original tense — present simple uses is/are, past simple uses was/were, present perfect uses has/have been, and so on. Get the tense of "be" wrong and the whole sentence is marked incorrect.</p>`,
   advanced:`<p>Master passive forms of modal verbs (can/could/should/must + be + V3): "The report must be submitted by Friday." Also study passive forms of imperative sentences, which use "Let + object + be + V3": "Close the door" → "Let the door be closed."</p>`,
   expert:`<p>Study the difference between passive voice and "get-passive" (informal, emphasises the change happening to the subject rather than agency): "The window got broken" vs "The window was broken." NDA papers occasionally test recognition of "get-passive" as informal/incorrect register in formal writing contexts.</p>`
 },
 comparison:{headers:['Tense','Active Formula','Passive Formula','Example (Passive)'],
   rows:[
     ['Simple Present','V1/V1+s','am/is/are + V3','The work is done.'],
     ['Present Continuous','am/is/are + V-ing','am/is/are + being + V3','The work is being done.'],
     ['Simple Past','V2','was/were + V3','The work was done.'],
     ['Present Perfect','have/has + V3','have/has been + V3','The work has been done.'],
     ['Modal (can/must)','modal + V1','modal + be + V3','The work must be done.']
   ]},
 cheatSheet:{title:'Active↔Passive — One Glance',items:[
   {k:'FORMULA',v:'Object + be(tense) + V3 (+by agent)'},
   {k:'NO OBJECT',v:'cannot be passivised'},
   {k:'CONTINUOUS',v:'be + being + V3'},
   {k:'PERFECT',v:'be + been + V3'},
   {k:'MODALS',v:'modal + be + V3'},
   {k:'DROP "BY"',v:'when doer is obvious/unimportant'}
 ]},
 officerTip:'In official correspondence and reports (a real skill tested indirectly through NDA English), passive voice is preferred for objectivity: "The operation was conducted successfully" reads more professional than "We conducted the operation successfully." Learn to switch voice deliberately based on tone required, not just for grammar drills.',
 realLife:'Scientific and technical writing (lab reports, manuals) defaults to passive voice to keep focus on the process, not the person: "The mixture was heated to 100°C" rather than "I heated the mixture."',
 pyqNotes:[
   {q:'What passive-voice trap does NDA repeat most often?',a:'Continuous-tense passive ("is being done") is frequently confused with simple passive ("is done") — examiners test whether you can spot which tense the active sentence was in before adding "being."'},
   {q:'Why can\'t "He slept early" be converted to passive?',a:'"Slept" is intransitive — it has no direct object, and passive voice requires an object to promote into subject position. No object means no valid passive form exists.'}
 ],
 mnemonicChain:'"OBJECT BECOMES BOSS" — in passive voice, the original object always becomes the new subject (the boss of the sentence).'},
{id:'narration',icon:'💬',title:'Direct &amp; Indirect Speech',desc:'Reported speech rules: tense backshift, pronouns, time/place words.',
 learn:`<p>Converting <b>direct</b> (exact words, quotation marks) to <b>indirect/reported speech</b> requires three shifts:</p>
 <ul><li><b>Tense backshift:</b> present → past, past → past perfect (when reporting verb is in past tense)</li>
 <li><b>Pronoun shift:</b> matches the new speaker's perspective (I→he/she, my→his/her)</li>
 <li><b>Time/place shift:</b> now→then, today→that day, here→there, tomorrow→the next day, this→that</li></ul>
 <p>Questions in indirect speech drop the question mark and invert back to statement word order: "He asked where I was going" (not "where was I going").</p>`,
 examples:[{s:'Direct: He said, "I am tired." → Indirect: He said that he was tired.',note:'Tense backshift: am → was; pronoun shift: I → he.'},
 {s:'Direct: She said, "I will visit tomorrow." → Indirect: She said that she would visit the next day.',note:'"will"→"would", "tomorrow"→"the next day".'}],
 tricks:[{t:'Universal truths and scientific facts do NOT backshift tense: "He said the sun rises in the east" stays present tense.'}],
 mistakes:[{m:'Keeping the question word order in reported questions: "He asked what is the time" is wrong — should be "He asked what the time was."'}],
 summary:'3 shifts: tense backshift, pronoun shift, time/place shift; universal truths stay present tense; reported questions use statement order.',
 quiz:[
   {q:'Indirect: He said, "I can swim."',opts:['He said that he can swim.','He said that he could swim.','He said that he swims.','He said he is able to swim.'],ans:1,exp:'"Can" backshifts to "could" in reported speech.'},
   {q:'Indirect: She asked, "Where do you live?"',opts:['She asked where do I live.','She asked where I lived.','She asked where did I live.','She asked where I live.'],ans:1,exp:'Reported question uses statement word order + tense backshift: "where I lived."'}
 ]},
{id:'sva',icon:'🤝',title:'Subject-Verb Agreement',desc:'Singular/plural matching rules — the single most-tested NDA grammar rule.',
 learn:`<p>The verb must agree in number with its subject. Key rules:</p>
 <ul><li>Two subjects joined by "and" → plural verb ("Ram and Shyam are friends")</li>
 <li>Subjects joined by "or/nor" → verb agrees with the nearer subject ("Neither the teacher nor the students were ready")</li>
 <li>Indefinite pronouns (each, everyone, nobody, either) → always singular verb</li>
 <li>Collective nouns acting as one unit → singular verb</li>
 <li>"A number of" → plural verb; "The number of" → singular verb</li></ul>`,
 examples:[{s:'A number of students were absent today.',note:'"A number of" + plural noun → plural verb.'},
 {s:'The number of accidents has increased.',note:'"The number of" treated as a singular subject → singular verb.'},
 {s:'Each of the boys has submitted his assignment.',note:'"Each" is always singular regardless of the plural noun that follows it.'}],
 tricks:[{t:'For "or/nor" sentences, the verb always agrees with whichever subject is CLOSEST to it — ignore the farther one.'}],
 mistakes:[{m:'"Each of the players have arrived" is wrong — "each" demands a singular verb: "has arrived."'}],
 summary:'And→plural; or/nor→agree with nearer subject; indefinite pronouns→singular; "a number of"→plural, "the number of"→singular.',
 quiz:[
   {q:'"Neither the captain nor the players ___ ready."',opts:['is','are','was','has'],ans:1,exp:'Verb agrees with the nearer subject "players" (plural) → "are."'},
   {q:'"Everyone in the class ___ submitted the form."',opts:['have','has','were','are'],ans:1,exp:'"Everyone" is an indefinite singular pronoun → "has."'}
 ],
 meta:{difficulty:2,time:'9 min',prereq:['Noun','Verb','Pronoun'],related:['Noun','Determiners']},
 didYouKnow:'Subject-verb agreement is considered the single most-tested rule across every major Indian competitive English paper (NDA, CDS, SSC, banking) — not because it is conceptually hard, but because exam-setters can hide the real subject far from the verb using long modifying phrases, tricking even strong readers.',
 exception:'When a sentence starts with "there" or "here," the verb agrees with the noun that FOLLOWS it, not with "there/here" itself: "There WAS a problem" (singular) vs "There WERE several problems" (plural) — always find the true subject after "there is/are."',
 diagram:{center:'Subject-Verb Agreement',branches:[
   {label:'AND → Plural',sub:['Ram and Shyam are...','Compound subjects']},
   {label:'OR/NOR → Nearer Subject',sub:['Neither...nor','Either...or']},
   {label:'Indefinite Pronouns → Singular',sub:['each, everyone','nobody, either']},
   {label:'Collective Nouns → Singular*',sub:['army, jury, team','*acting as one unit']}
 ]},
 levels:{
   beginner:`<p>Basic rule: singular subject takes singular verb (he IS, she HAS), plural subject takes plural verb (they ARE, we HAVE). The challenge is always identifying the TRUE subject — ignore any phrase sitting between subject and verb: "The box of chocolates IS on the table" (subject is "box," not "chocolates").</p>`,
   intermediate:`<p>Learn the special-case words that are ALWAYS singular regardless of appearance: each, every, either, neither, everyone, everybody, everything, someone, anybody, nobody, no one. Even "Each of the ten soldiers HAS arrived" stays singular because "each" controls the verb, not "soldiers."</p>`,
   advanced:`<p>Master the "nearer subject rule" for or/nor/either...or/neither...nor constructions — the verb always matches whichever noun is physically closest to it: "Neither the manager nor the employees WERE informed" (matches "employees," plural) vs "Neither the employees nor the manager WAS informed" (matches "manager," singular).</p>`,
   expert:`<p>Study quantity expressions that look plural but behave as singular units of measurement: "Ten kilometres IS a long distance," "Two-thirds of the work IS done" (when referring to one mass) vs "Two-thirds of the students ARE present" (when referring to countable individuals) — the verb depends on whether the noun after the fraction is countable or uncountable.</p>`
 },
 comparison:{headers:['Pattern','Rule','Example'],
   rows:[
     ['X and Y','Plural verb','Ram and Shyam are friends.'],
     ['X or/nor Y','Agrees with nearer subject','Neither he nor they were ready.'],
     ['Each/Every/Either/Neither','Always singular','Each of them has arrived.'],
     ['A number of + plural noun','Plural verb','A number of students were absent.'],
     ['The number of + plural noun','Singular verb','The number of cases has risen.'],
     ['There is/are + noun','Agrees with the noun after it','There are many reasons.']
   ]},
 cheatSheet:{title:'Subject-Verb Agreement — One Glance',items:[
   {k:'AND',v:'→ plural verb'},
   {k:'OR / NOR',v:'→ nearer subject wins'},
   {k:'EACH/EVERY/EITHER',v:'→ always singular'},
   {k:'A NUMBER OF',v:'→ plural verb'},
   {k:'THE NUMBER OF',v:'→ singular verb'},
   {k:'COLLECTIVE NOUN',v:'→ singular (as one unit)'}
 ]},
 officerTip:'Subject-verb slips are the fastest way to lose marks in written staff papers at the Academy — train yourself to silently re-read every sentence you write by isolating just the subject and verb, ignoring every other word, before submitting any written answer.',
 realLife:'Spoken Hindi-English ("Everyone are coming") commonly carries over plural-feeling agreement errors from Hindi sentence structure — being conscious of this transfer error is one of the fastest ways Hindi-medium candidates can improve their NDA English score.',
 pyqNotes:[
   {q:'What is NDA\'s favourite SVA trap?',a:'Burying the real subject under a long prepositional phrase: "The quality of the products in this factory ARE excellent" looks plural because of "products," but the true subject is "quality" (singular) — should be "IS excellent."'},
   {q:'How does NDA test "a number of" vs "the number of"?',a:'By placing both in near-identical sentences and asking which verb form is correct — "A number of" always pairs with plural verbs (it means "several"), while "The number of" always pairs with singular verbs (it refers to one specific count/figure).'}
 ],
 mnemonicChain:'"AND ADDS, OR CHOOSES NEAREST" — and always pluralises; or/nor always matches whichever subject sits right next to the verb.'},
{id:'modals',icon:'🔑',title:'Modals',desc:'Can, could, may, might, must, shall, should, will, would, ought to.',
 learn:`<p><b>Modal verbs</b> express ability, possibility, permission, obligation or advice, and are always followed by the base form of the main verb (no "to," no -s, no -ing).</p>
 <ul><li><b>Can/Could</b> — ability/permission (could = more polite/past ability)</li>
 <li><b>May/Might</b> — possibility/permission (might = less certain)</li>
 <li><b>Must</b> — strong obligation/certainty</li>
 <li><b>Should/Ought to</b> — advice or mild obligation</li>
 <li><b>Shall/Will</b> — future, offers, promises</li></ul>`,
 examples:[{s:'You must submit the form by Friday.',note:'Strong obligation — "must."'},
 {s:'He might join the academy next year.',note:'"Might" expresses lower certainty than "may."'}],
 tricks:[{t:'Modals never take "to" directly after them with the bare verb: say "He can swim," never "He can to swim." (But "ought TO" is the one exception.)'}],
 mistakes:[{m:'"He musts go" is wrong — modals never take an -s, regardless of subject: "He must go."'}],
 summary:'Modals + base verb, no "to" (except ought to), no -s ending ever.',
 quiz:[{q:'Choose correct:',opts:['She can to drive.','She can drives.','She can drive.','She cans drive.'],ans:2,exp:'Modal + bare infinitive, no "to," no -s: "can drive."'}]},
{id:'conditionals',icon:'🌗',title:'Conditional Sentences',desc:'Zero, first, second, third and mixed conditionals.',
 learn:`<p>Conditionals express cause-effect relationships using "if."</p>
 <ul><li><b>Zero:</b> If + present, present — general truths: "If you heat ice, it melts."</li>
 <li><b>First:</b> If + present, will + base — real future possibility: "If it rains, we will cancel the parade."</li>
 <li><b>Second:</b> If + past, would + base — hypothetical present: "If I were you, I would apply now."</li>
 <li><b>Third:</b> If + had + past participle, would have + past participle — unreal past: "If he had trained harder, he would have qualified."</li></ul>`,
 examples:[{s:'If she studies daily, she will crack the exam.',note:'First conditional — realistic future condition.'},
 {s:'If I had known earlier, I would have prepared better.',note:'Third conditional — hypothetical regret about the past.'}],
 tricks:[{t:'In the second conditional, "were" is used for all subjects (including I/he/she) in formal English: "If I were rich" not "If I was rich."'}],
 mistakes:[{m:'Mixing tenses: "If I will see him, I will tell him" is wrong — never use "will" in the if-clause itself: "If I see him..."'}],
 summary:'4 main conditional types matched to time-frame and reality level; never use "will" in the if-clause.',
 quiz:[
   {q:'Choose correct: "If I ___ you, I would resign."',opts:['was','were','am','will be'],ans:1,exp:'Second conditional formally uses "were" for all subjects.'},
   {q:'Choose correct: "If he ___ harder, he would have passed."',opts:['studied','had studied','studies','has studied'],ans:1,exp:'Third conditional if-clause: had + past participle.'}
 ]},
{id:'question-tags',icon:'❓',title:'Question Tags',desc:'Mini-questions added to confirm a statement.',
 learn:`<p>A <b>question tag</b> turns a statement into a question seeking confirmation. The rule: positive statement → negative tag; negative statement → positive tag, and the tag's auxiliary verb must match the main clause's tense.</p>`,
 examples:[{s:'He is your friend, isn\'t he?',note:'Positive statement → negative tag using same auxiliary "is."'},
 {s:'They didn\'t come, did they?',note:'Negative statement → positive tag.'},
 {s:'Let\'s go, shall we?',note:'Special case — "let\'s" always takes "shall we?"'}],
 tricks:[{t:'For sentences starting with "I am," the tag is irregularly "aren\'t I?" — not "amn\'t I."'}],
 mistakes:[{m:'"He can swim, can\'t he?" — correct. But "He can swim, isn\'t he?" is wrong — the tag\'s verb must match the auxiliary used in the statement (can, not be).'}],
 summary:'Positive→negative tag, negative→positive tag; tag verb matches statement\'s auxiliary; special cases: I am→aren\'t I, let\'s→shall we.',
 quiz:[{q:'"She has finished her work, ___?"',opts:['hasn\'t she','isn\'t she','doesn\'t she','didn\'t she'],ans:0,exp:'Match the auxiliary "has" used in the statement.'}]},
{id:'comparison',icon:'⚖️',title:'Degrees of Comparison',desc:'Positive, comparative and superlative forms.',
 learn:`<p>Adjectives/adverbs have 3 degrees: <b>positive</b> (tall), <b>comparative</b> (taller, comparing 2), <b>superlative</b> (tallest, comparing 3+).</p>
 <p>Short words add -er/-est; longer words (3+ syllables) use more/most. Irregular forms must be memorised: good→better→best, bad→worse→worst, little→less→least, far→farther/further→farthest/furthest.</p>`,
 examples:[{s:'He is more intelligent than his brother.',note:'Multi-syllable adjective uses "more," not "intelligenter."'},
 {s:'This is the best solution among all.',note:'Superlative "best," irregular form of "good."'}],
 tricks:[{t:'Never combine -er/-est WITH more/most: "more taller" or "most fastest" are always wrong — pick one method only.'}],
 mistakes:[{m:'"He is the most tallest boy" is a double superlative — should be just "the tallest boy."'}],
 summary:'3 degrees; short adjectives take -er/-est, long ones take more/most; never combine both; irregular forms must be memorised.',
 quiz:[{q:'Correct sentence:',opts:['He is more taller than me.','He is taller than me.','He is most tall than me.','He is tallest than me.'],ans:1,exp:'Single comparative form only: "taller than."'}]},
{id:'clauses',icon:'🧷',title:'Clauses',desc:'Independent, dependent, noun, adjective and adverb clauses.',
 learn:`<p>A <b>clause</b> has a subject and verb. An <b>independent clause</b> can stand alone as a sentence; a <b>dependent (subordinate) clause</b> cannot.</p>
 <ul><li><b>Noun clause:</b> functions as a noun — "What he said surprised everyone."</li>
 <li><b>Adjective clause:</b> describes a noun, starts with who/which/that — "The man who called is my uncle."</li>
 <li><b>Adverb clause:</b> shows time/reason/condition — "He left because he was late."</li></ul>`,
 examples:[{s:'I know that he is honest.',note:'"That he is honest" is a noun clause, object of "know."'},
 {s:'The book which you gave me is excellent.',note:'Adjective clause modifying "book."'}],
 tricks:[{t:'Test for dependence: if the clause starts with a subordinating word (because, although, if, when, that) and can\'t stand alone, it\'s dependent.'}],
 mistakes:[{m:'Writing a dependent clause as a full sentence: "Because he was late." is a sentence fragment, not a complete sentence.'}],
 summary:'Clauses = subject+verb; independent stands alone, dependent cannot; 3 types: noun, adjective, adverb clauses.',
 quiz:[{q:'Identify the clause type: "I will go wherever you go."',opts:['Noun clause','Adjective clause','Adverb clause','Independent clause'],ans:2,exp:'"Wherever you go" shows place/condition for the main verb — adverb clause.'}]},
{id:'phrases',icon:'📐',title:'Phrases',desc:'Noun, verb, adjective, adverb and prepositional phrases.',
 learn:`<p>A <b>phrase</b> is a group of words without a subject-verb pair, functioning as a single part of speech.</p>
 <ul><li><b>Noun phrase:</b> "the tall soldier"</li><li><b>Verb phrase:</b> "has been training"</li>
 <li><b>Prepositional phrase:</b> "under the bridge"</li><li><b>Adjective phrase:</b> "full of courage"</li>
 <li><b>Adverb phrase:</b> "in a hurry"</li></ul>`,
 examples:[{s:'The soldier with the medal saluted sharply.',note:'"With the medal" is a prepositional phrase modifying "soldier."'}],
 tricks:[{t:'Phrase vs Clause — the fastest test: does it have BOTH a subject and a finite verb? If not, it\'s a phrase.'}],
 mistakes:[{m:'Calling "having finished the work" a clause — it has a verb form but no subject, so it\'s a participial phrase.'}],
 summary:'Phrase = group of words, no subject+verb combo; types match parts of speech they substitute for.',
 quiz:[{q:'"Running every morning" in "Running every morning keeps him fit" is a:',opts:['Verb phrase','Gerund (noun) phrase','Adjective phrase','Independent clause'],ans:1,exp:'It acts as the subject of the sentence — a gerund/noun phrase.'}]},
{id:'gerunds-infinitives',icon:'➰',title:'Gerunds &amp; Infinitives',desc:'-ing forms as nouns vs "to + verb" forms.',
 learn:`<p>A <b>gerund</b> (verb+ing) functions as a noun: "Swimming is good exercise." An <b>infinitive</b> (to+verb) can function as noun, adjective, or adverb: "To win was his only goal."</p>
 <p>Certain verbs are followed only by gerunds (enjoy, avoid, finish, mind, suggest), others only by infinitives (want, decide, plan, hope, agree), and some by either with a meaning change (stop to do vs stop doing).</p>`,
 examples:[{s:'He enjoys reading military history.',note:'"Enjoy" is always followed by a gerund, never an infinitive.'},
 {s:'She stopped to smoke. / She stopped smoking.',note:'Different meanings: "stopped to smoke" = paused in order to smoke; "stopped smoking" = quit the habit.'}],
 tricks:[{t:'Memorise common gerund-only verbs with the acronym MAFEPS: Mind, Avoid, Finish, Enjoy, Practise, Suggest — all take -ing.'}],
 mistakes:[{m:'"He suggested to go" is wrong — "suggest" takes a gerund or that-clause: "He suggested going" or "He suggested that we go."'}],
 summary:'Gerunds act as nouns; certain verbs strictly pair with gerund OR infinitive — memorise the common lists.',
 quiz:[{q:'Choose correct:',opts:['He avoided to answer the question.','He avoided answering the question.','He avoided answer the question.','He avoided to answering.'],ans:1,exp:'"Avoid" is always followed by a gerund.'}]},
{id:'participles',icon:'🧵',title:'Participles',desc:'Present, past and perfect participles, and dangling modifiers.',
 learn:`<p>A <b>participle</b> is a verb form used as an adjective or in compound tenses. <b>Present participle</b> (-ing) shows ongoing/active sense ("the barking dog"). <b>Past participle</b> (-ed/-en) shows passive/completed sense ("the broken window").</p>
 <p>A <b>dangling modifier</b> happens when the participle phrase has no clear subject to attach to — a classic NDA error-spotting trap.</p>`,
 examples:[{s:'Walking into the room, the smell of smoke hit him.',note:'Dangling — it sounds like "the smell" was walking. Correct: "Walking into the room, he was hit by the smell of smoke."'}],
 tricks:[{t:'Always check: the noun immediately AFTER a participial phrase must be the one performing that action.'}],
 mistakes:[{m:'"Having finished the exam, the bell rang" — wrongly implies the bell finished the exam. Should be "Having finished the exam, he heard the bell ring."'}],
 summary:'Participles = -ing (active/ongoing) or -ed/-en (passive/complete); dangling modifiers occur when subject doesn\'t match the action.',
 quiz:[{q:'Which sentence avoids a dangling modifier?',opts:['Driving to work, the radio broke.','Driving to work, I heard the radio break.','To work driving, the radio broke.','The radio, driving to work, broke.'],ans:1,exp:'"I" is the one driving — correctly placed subject right after the participial phrase.'}]},
{id:'parallelism',icon:'⛓️',title:'Parallelism',desc:'Matching grammatical structure in lists and comparisons.',
 learn:`<p><b>Parallel structure</b> requires that items in a list or comparison share the same grammatical form.</p>`,
 examples:[{s:'He likes swimming, running, and cycling.',note:'All three items are gerunds — parallel.'},
 {s:'Not: He likes swimming, to run, and cycling.',note:'Mixed forms (gerund, infinitive, gerund) break parallelism.'}],
 tricks:[{t:'Whenever you see "and," "or," "not only...but also," or "both...and," check that every item joined has the SAME grammatical shape.'}],
 mistakes:[{m:'"The job requires honesty, dedication, and to be punctual" — mixes nouns with an infinitive phrase; should be "punctuality."'}],
 summary:'Items joined by conjunctions must share identical grammatical form.',
 quiz:[{q:'Which is correctly parallel?',opts:['She likes to read, writing, and to paint.','She likes reading, writing, and painting.','She likes read, write, and paint.','She likes to read, to writing, and paint.'],ans:1,exp:'All three are gerunds — fully parallel.'}]},
{id:'punctuation',icon:'✒️',title:'Punctuation',desc:'Commas, semicolons, colons, apostrophes and quotation marks.',
 learn:`<p>Key rules: use a comma before a coordinating conjunction joining two independent clauses; use a semicolon to join two related independent clauses without a conjunction; use a colon to introduce a list or explanation; use an apostrophe for possession (Ravi's) and contractions (it's = it is).</p>`,
 examples:[{s:'He trained hard; he still lost the race.',note:'Semicolon joins two related independent clauses.'},
 {s:'The kit includes the following: boots, belt, and beret.',note:'Colon introduces a list.'}],
 tricks:[{t:'Its vs It\'s — "It\'s" always means "it is" or "it has." "Its" (no apostrophe) is possessive: "The dog wagged its tail."'}],
 mistakes:[{m:'"The boys books" should be "the boys\' books" (plural possessive) — apostrophe placement is frequently tested.'}],
 summary:'Comma before FANBOYS joining clauses; semicolon for related independent clauses; colon introduces lists; apostrophes for possession/contraction only.',
 quiz:[{q:'Correct sentence:',opts:['Its a great day.','It\'s a great day.','Its\' a great day.','Its a great day\'s.'],ans:1,exp:'"It\'s" = "it is."'}]},
{id:'capitalization',icon:'🔠',title:'Capitalization',desc:'Proper nouns, titles, first words and the rules in between.',
 learn:`<p>Capitalize: the first word of every sentence, proper nouns (names of people, places, organisations), titles before names (General Manekshaw), days/months (but not seasons), and the pronoun "I."</p>`,
 examples:[{s:'General Manekshaw led the Indian Army during the 1971 war.',note:'Title+name capitalised, organisation capitalised, specific year not.'}],
 tricks:[{t:'Seasons (summer, winter) are NOT capitalised unless personified or at sentence start — common NDA trap.'}],
 mistakes:[{m:'Capitalising "the Government" generically — only capitalise when part of a specific official title or name.'}],
 summary:'Capitalise sentence starts, proper nouns, titles-before-names, "I"; don\'t capitalise seasons or generic common nouns.',
 quiz:[{q:'Which is correctly capitalised?',opts:['I love Summer.','i love summer.','I love summer.','I Love summer.'],ans:2,exp:'Seasons aren\'t capitalised; "I" always is; mid-sentence words stay lowercase.'}]},
{id:'word-formation',icon:'🧱',title:'Word Formation, Prefixes &amp; Suffixes',desc:'Building new words from roots using affixes.',
 learn:`<p>Words are built from a <b>root</b> plus <b>prefixes</b> (before) and <b>suffixes</b> (after) that change meaning or part of speech.</p>
 <ul><li><b>un-, dis-, in-/im-, non-</b> → negation (unhappy, disagree, impossible)</li>
 <li><b>re-</b> → again (rebuild)</li><li><b>pre-</b> → before (preview)</li>
 <li><b>-tion/-sion</b> → noun (creation)</li><li><b>-ful/-less</b> → adjective (careful/careless)</li>
 <li><b>-ize/-ify</b> → verb (modernize, simplify)</li></ul>`,
 examples:[{s:'The disorganized soldiers needed reorganization.',note:'dis-(negation)+organize+-d; re-(again)+organize+-ation(noun).'}],
 tricks:[{t:'When stuck on vocabulary in the exam, break unfamiliar words into root+affix to guess meaning under time pressure.'}],
 mistakes:[{m:'Using "im-" before words starting with letters other than m/p/b — e.g. "imlegal" is wrong; correct is "illegal" (il- before l).'}],
 summary:'Roots + prefixes/suffixes build vocabulary; negation prefixes change by following letter (il-, im-, ir-, in-, un-).',
 quiz:[{q:'Correct negative form of "responsible":',opts:['unresponsible','imresponsible','irresponsible','disresponsible'],ans:2,exp:'"ir-" is used before words starting with "r": irresponsible.'}]},
{id:'sentence-structure',icon:'🏗️',title:'Sentence Structure',desc:'Simple, compound, complex and compound-complex sentences.',
 learn:`<p>A <b>simple sentence</b> has one independent clause. A <b>compound sentence</b> joins two independent clauses with a coordinating conjunction or semicolon. A <b>complex sentence</b> has one independent + one or more dependent clauses. A <b>compound-complex</b> sentence combines both.</p>`,
 examples:[{s:'He trained daily, and he eventually qualified. (Compound)',note:'Two independent clauses joined by "and."'},
 {s:'Although he was tired, he completed the run. (Complex)',note:'Dependent clause + independent clause.'}],
 tricks:[{t:'Varying sentence structure (mixing simple/complex) improves essay scores in the SSB interview\'s written tasks too, not just the grammar paper.'}],
 mistakes:[{m:'Run-on sentences: joining two independent clauses with just a comma ("He was tired, he kept going") — needs a conjunction or semicolon.'}],
 summary:'4 sentence types based on clause combinations; avoid comma splices/run-ons.',
 quiz:[{q:'"Although he was tired, he kept marching, and his spirit never broke." This is a:',opts:['Simple sentence','Compound sentence','Complex sentence','Compound-complex sentence'],ans:3,exp:'It has a dependent clause (although...) plus two independent clauses joined by "and."'}]},
{id:'determiners',icon:'📌',title:'Determiners',desc:'This/that, some/any, much/many, few/little.',
 learn:`<p><b>Determiners</b> introduce nouns and specify quantity, possession or which one. Key distinction: <b>much/little</b> go with uncountable nouns; <b>many/few</b> go with countable nouns.</p>`,
 examples:[{s:'There is little water left in the canteen.',note:'"Little" + uncountable noun "water."'},
 {s:'Few soldiers volunteered for the mission.',note:'"Few" + countable plural noun "soldiers."'}],
 tricks:[{t:'"Few/little" = almost none (negative); "a few/a little" = some, a small positive amount. The article changes the meaning entirely.'}],
 mistakes:[{m:'"Many information" is wrong — information is uncountable, so it should be "much information."'}],
 summary:'Much/little with uncountable; many/few with countable; few vs a few changes positive/negative meaning.',
 quiz:[{q:'Correct: "He has ___ friends in the academy."',opts:['much','many','little','a little'],ans:1,exp:'"Friends" is countable → "many."'}]},

{id:'spotting-errors',icon:'🔍',title:'Spotting Errors',desc:'The NDA technique for finding the one wrong part in a sentence, fast.',
 learn:`<p><b>Spotting Errors</b> gives you a sentence split into three or four underlined parts (A/B/C/D), one of which usually contains a grammar mistake — or none does ("No error"). This is less about knowing more rules and more about scanning in the right order.</p>
 <ul>
 <li>Read the whole sentence once for sense, then re-scan part by part.</li>
 <li>Check subject-verb agreement first — it accounts for the largest share of NDA error-spotting mistakes.</li>
 <li>Then check tense consistency across the sentence, then preposition/article choice, then pronoun agreement.</li>
 <li>If every part looks grammatically clean, mark "No error" confidently — NDA papers do include genuinely correct sentences as traps for over-thinkers.</li>
 </ul>
 <p>Never fix the sentence in your head and then hunt for that fix — find the actual break in agreement or logic as it stands.</p>`,
 examples:[
   {s:'A) The soldiers / B) has arrived / C) at the border / D) No error',note:'Error at B — "soldiers" (plural) needs "have arrived," not "has arrived."'},
   {s:'A) Neither of the officers / B) were willing / C) to compromise / D) No error',note:'Error at B — "neither" is singular, so it takes "was," not "were."'}
 ],
 tricks:[{t:'Scan for the four usual suspects in fixed order: agreement → tense → preposition → article. Most papers hide the error in one of these four categories.'}],
 mistakes:[{m:'Rewriting the sentence mentally into "better" English and then flagging a part that is not actually grammatically wrong, just less elegant — spotting errors tests correctness, not style.'}],
 summary:'Scan in order: subject-verb agreement, tense consistency, preposition/article, pronoun agreement. Do not rewrite for style — only flag genuine grammatical breaks.',
 quiz:[
   {q:'A) Each of the boys / B) have finished / C) their homework / D) No error — where is the error?',opts:['A','B','C','D'],ans:1,exp:'"Each" is singular, so it needs "has finished," not "have finished" — error at B.'},
   {q:'A) She don\'t know / B) the answer / C) to that question / D) No error — where is the error?',opts:['A','B','C','D'],ans:0,exp:'"She" needs "doesn\'t," not "don\'t" — error at A.'}
 ],
 meta:{difficulty:2,time:'8 min',prereq:['sva','tenses'],related:['Subject-Verb Agreement','Tenses (All 12)']},
 didYouKnow:'Spotting-errors questions are deliberately written so that only one small word (an auxiliary, a preposition, an article) is wrong — the rest of the sentence is a decoy of otherwise-natural English.',
 exception:'Some sentences are genuinely error-free by design, specifically to test whether candidates over-correct out of exam anxiety — always weigh "No error" as a real option, not a last resort.',
 comparison:{headers:['Error Type','What To Check','Typical Giveaway'],
   rows:[
     ['Agreement','Does subject match verb in number?','Singular subject + plural verb or vice versa'],
     ['Tense','Do all verbs in the sentence agree in time frame?','Mixing past and present without reason'],
     ['Preposition','Is the fixed preposition used?','"married with" instead of "married to"'],
     ['Article','Is a/an/the missing or wrong?','Missing "the" before a specific, already-mentioned noun']
   ]},
 officerTip:'In SSB written exercises and orders, a single wrong word can change meaning entirely — the discipline of scanning line-by-line for the "one wrong element" mirrors how officers proofread operational orders before they go out.',
 pyqNotes:[{q:'Why do many candidates get spotting-errors questions wrong despite knowing the underlying grammar rule?',a:'Because they read for overall sense rather than checking each underlined part individually against a specific rule — the fix is a disciplined, rule-by-rule scan, not a "does this sound right" read.'}],
 mnemonicChain:'"SPOT": Subject agreement, Preposition, Overall tense, The article — the four checkpoints, in order.'},

{id:'sentence-improvement',icon:'🛠️',title:'Sentence Improvement',desc:'Choosing the grammatically best replacement for an underlined part of a sentence.',
 learn:`<p><b>Sentence Improvement</b> questions underline a phrase in a sentence and ask you to pick the best replacement from four options (one of which is usually "No improvement"). Unlike spotting errors, the original phrase is often not wrong — just not the best available option.</p>
 <ul>
 <li>First check if the underlined part is grammatically incorrect — if so, eliminate options that repeat the same mistake.</li>
 <li>If the original is grammatically fine, look for the option that is more concise and idiomatic, without changing the meaning.</li>
 <li>Be wary of options that "fix" something that was never broken — that is the classic wrong-answer trap.</li>
 </ul>
 <p>The correct choice usually removes redundancy, corrects a subtly wrong preposition/tense, or restores standard word order — not a wholesale rewrite.</p>`,
 examples:[
   {s:'"He is one of the student who work hard." → "one of the students who work hard"',note:'"One of the" always takes a plural noun ("students") even though the verb that follows agrees with the plural relative clause.'},
   {s:'"Scarcely he had left when it started raining." → "Scarcely had he left when it started raining"',note:'"Scarcely," when it opens a sentence, requires inverted word order ("had he").'}
 ],
 tricks:[{t:'If all four options sound equally "fine," pick the one that is shortest and most direct — NDA sentence improvement almost always rewards concision over elaboration.'}],
 mistakes:[{m:'Choosing "No improvement" reflexively because the original sentence "sounds okay" on a fast read, without actually testing each option against the grammar rule being targeted.'}],
 summary:'Check the underlined part for a real error first; if none, choose the most concise, idiomatic option that preserves meaning — avoid unnecessary rewrites.',
 quiz:[
   {q:'Improve: "Despite of the rain, the parade continued."',opts:['Despite the rain','In spite the rain','Despite of rain','No improvement'],ans:0,exp:'"Despite" never takes "of" — "despite the rain" is correct; "in spite of the rain" would also work but wasn\'t offered correctly here.'},
   {q:'Improve: "He is senior than me in the regiment."',opts:['senior to me','more senior than me','senior from me','No improvement'],ans:0,exp:'"Senior," "junior," "prior" and "superior" take "to," not "than."'}
 ],
 meta:{difficulty:3,time:'9 min',prereq:['spotting-errors','clauses'],related:['Spotting Errors','Parallelism']},
 didYouKnow:'Certain comparative adjectives borrowed from Latin — senior, junior, superior, inferior, prior — never take "than"; they always take "to." This single rule accounts for a disproportionate share of NDA sentence-improvement questions.',
 comparison:{headers:['Trap Word','Wrong Pattern','Correct Pattern'],
   rows:[
     ['Despite','despite of','despite / in spite of'],
     ['Senior/Junior/Superior/Inferior/Prior','senior than','senior to'],
     ['Scarcely...when','scarcely...than','scarcely...when'],
     ['No sooner...than','no sooner...when','no sooner...than']
   ]},
 officerTip:'Concise, unambiguous phrasing is exactly what is expected in military written communication (situation reports, orders) — practising sentence improvement is directly transferable to that skill.',
 pyqNotes:[{q:'What is the single most common category of correct answer in NDA sentence-improvement sets?',a:'Fixed idiomatic prepositions after specific words (despite, senior to, married to, different from) — memorising this small, closed list solves a large fraction of these questions instantly.'}],
 mnemonicChain:'"SIC": Spot the real error, Idiom check (fixed prepositions), Concise wins ties.'},

{id:'idioms-phrasal-verbs',icon:'🗣️',title:'Idioms &amp; Phrasal Verbs',desc:'High-frequency NDA idioms and multi-word verbs with their exact meanings.',
 learn:`<p><b>Idioms</b> are fixed expressions whose meaning cannot be worked out from the individual words (e.g. "spill the beans" = reveal a secret). <b>Phrasal verbs</b> are verb + preposition/particle combinations that often carry a completely different meaning from the base verb (e.g. "give up" = stop trying, not "give" upward).</p>
 <ul>
 <li>Idioms and phrasal verbs are almost always tested as one-line meaning-matching questions, not in long passages.</li>
 <li>Learn them in short, high-frequency batches rather than long alphabetical lists — recall is far better for the ones you have actually seen used in a sentence.</li>
 <li>Watch for phrasal verbs that change meaning completely with a different particle: "look up" (search for), "look after" (take care of), "look down on" (despise), "look forward to" (anticipate happily).</li>
 </ul>`,
 examples:[
   {s:'"The recruit had to bite the bullet and accept the tough training schedule."',note:'"Bite the bullet" = face a difficult situation with courage.'},
   {s:'"The commanding officer decided to call off the exercise due to bad weather."',note:'"Call off" = cancel.'},
   {s:'"After months of training, the cadet finally came into his own on the assault course."',note:'"Come into one\'s own" = start performing at one\'s true, strong potential.'}
 ],
 tricks:[{t:'When unsure of an idiom\'s exact meaning, look at whether the surrounding sentence has a positive or negative tone — idioms rarely flip that tone, so you can often eliminate two of the four options purely on register.'}],
 mistakes:[{m:'Translating an idiom word-for-word into another language and choosing the option that matches that literal translation rather than the true English meaning.'}],
 summary:'Idioms and phrasal verbs are fixed-meaning expressions; learn them via example sentences, not isolated definitions, and watch how the particle changes a phrasal verb\'s meaning.',
 quiz:[
   {q:'"The team had to bite the bullet" means the team:',opts:['Literally bit something','Faced a hard situation bravely','Won easily','Gave up'], ans:1,exp:'"Bite the bullet" means to accept something difficult or unpleasant with courage.'},
   {q:'"He looks up to his elder brother" means he:',opts:['Searches for his brother','Respects and admires his brother','Looks upward at his brother','Avoids his brother'],ans:1,exp:'"Look up to" means to admire or respect someone.'}
 ],
 meta:{difficulty:2,time:'10 min',prereq:[],related:['Vocabulary','Word Formation, Prefixes & Suffixes']},
 didYouKnow:'Many idioms tested at NDA level have military or nautical origin — "toe the line," "show one\'s true colours" and "batten down the hatches" all began as literal military or naval instructions before becoming figures of speech.',
 comparison:{headers:['Phrasal Verb','Meaning','Example'],
   rows:[
     ['Look into','Investigate','The officer looked into the complaint.'],
     ['Look after','Take care of','She looked after the injured soldier.'],
     ['Look down on','Despise / consider inferior','Never look down on a junior recruit.'],
     ['Look forward to','Anticipate happily','We look forward to the passing-out parade.']
   ]},
 officerTip:'Precise, idiomatic English in interviews and group discussions signals fluency to SSB assessors — using a natural idiom correctly (not overusing them) reads as confident, native-level command of language.',
 pyqNotes:[{q:'How are idioms usually tested on the NDA paper?',a:'As a standalone sentence with the idiom underlined or highlighted, followed by four possible meanings — rarely inside a full reading-comprehension passage.'}],
 mnemonicChain:'Learn idioms in "story batches" of 5-6 tied to one theme (military, weather, animals) — grouped recall beats alphabetical lists.'},

{id:'one-word-substitution',icon:'📝',title:'One Word Substitution',desc:'Replacing a long phrase with the single precise word that means the same thing.',
 learn:`<p><b>One Word Substitution</b> asks you to identify the single word that means the same as a given phrase (e.g. "a person who loves books" = <b>bibliophile</b>). These questions reward precise, high-frequency vocabulary rather than obscure words.</p>
 <ul>
 <li>Focus on categories that repeat often at NDA level: people (by profession/habit), places, legal/administrative terms, and abstract qualities.</li>
 <li>Many of these words share a Latin or Greek root — learning the root (e.g. "phil-" = love, "phobia" = fear, "-cide" = killing) lets you decode unfamiliar one-word-substitution answers on sight.</li>
 </ul>`,
 examples:[
   {s:'"A person who cannot read or write" = illiterate',note:'Base vocabulary, frequently tested.'},
   {s:'"One who studies the stars and planets" = astronomer',note:'"Astro-" = star/stars.'},
   {s:'"A place where birds are kept" = aviary',note:'From Latin "avis" = bird.'}
 ],
 tricks:[{t:'When two options look close in meaning, check whether one describes a person and the other an abstract quality — the question phrase\'s grammar ("a person who..." vs "the quality of...") usually points to the right part of speech immediately.'}],
 mistakes:[{m:'Confusing near-synonym pairs like "hermit" (one who lives alone by choice) and "recluse" (one who avoids society, often due to distress) — the precise nuance, not just the general idea, is what NDA tests.'}],
 summary:'Learn one-word substitutions by category (people, places, legal terms) and by root, not as a random alphabetical list.',
 quiz:[
   {q:'"A person who is indifferent to pleasure or pain" is called:',opts:['Stoic','Cynic','Optimist','Sceptic'],ans:0,exp:'A "stoic" endures pleasure and pain with the same calm indifference.'},
   {q:'"A government by the few" is called:',opts:['Democracy','Oligarchy','Monarchy','Anarchy'],ans:1,exp:'"Oligarchy" = rule by a small, select group.'}
 ],
 meta:{difficulty:2,time:'9 min',prereq:['word-formation'],related:['Word Formation, Prefixes & Suffixes','Vocabulary']},
 didYouKnow:'Roughly a third of common one-word substitutions at this level are built from just six Greek/Latin roots: "phil-" (love), "phobia" (fear), "-cide" (kill), "auto-" (self), "poly-" (many), and "mono-" (one).',
 comparison:{headers:['Root','Meaning','Example Word'],
   rows:[
     ['Phil-','Love','Bibliophile (lover of books)'],
     ['Phobia','Fear','Claustrophobia (fear of confined spaces)'],
     ['-cide','Killing','Homicide (killing of a person)'],
     ['Poly-','Many','Polyglot (one who knows many languages)']
   ]},
 officerTip:'Precision vocabulary of this kind is directly useful for writing crisp reports — one accurate word ("reconnaissance," "attrition") often replaces an entire clumsy phrase in an operational report.',
 pyqNotes:[{q:'What is the most efficient way to prepare one-word substitution for NDA?',a:'Build a personal list of 150-200 high-frequency substitutions organised by category (people, places, government, law, behaviour) rather than trying to memorise an exhaustive dictionary-style list.'}],
 mnemonicChain:'Group new words into "6 root families" (phil, phobia, cide, auto, poly, mono) — each root unlocks 8-10 words at once.'},

{id:'jumbled-sentences',icon:'🧩',title:'Ordering of Words &amp; Sentences',desc:'Rearranging scrambled words or sentence-parts (P/Q/R/S) into logical, grammatical order.',
 learn:`<p>These questions give you a set of jumbled words or sentence fragments (usually labelled P, Q, R, S) and ask for the correct logical sequence. The skill is finding the one fragment that must come first (the "opener") and then following logical/grammatical links from there.</p>
 <ul>
 <li>Find the opener first: it introduces a subject or topic without a pronoun that would need something to refer back to.</li>
 <li>Then look for pronouns ("he," "it," "this") or connectors ("however," "therefore," "as a result") in the other fragments — they almost always point to which fragment comes immediately before them.</li>
 <li>Confirm your final order by reading it straight through once for sense before answering.</li>
 </ul>`,
 examples:[
   {s:'P: The general reviewed the plan. Q: He then approved it. R: Before that, the staff had revised it twice. S: Finally, the operation began.',note:'Correct order: P (or R, depending on chronology) → Q → S; "He" in Q refers back to "the general" in P, "Finally" in S signals the closing fragment.'}
 ],
 tricks:[{t:'A fragment starting with "This," "It," "He/She/They," or a conjunction like "However" or "Therefore" can never be the opener — eliminate those first to shortlist true candidates for the first sentence.'}],
 mistakes:[{m:'Choosing an opener purely because it "sounds" like a good introduction, without checking that no other fragment\'s pronoun or connector logically has to precede it.'}],
 summary:'Eliminate fragments that cannot open (pronoun/connector starts); find the true opener; then chain fragments using pronoun references and logical connectors.',
 quiz:[
   {q:'Which type of fragment can never be the correct opening sentence?',opts:['One that introduces a new subject by name','One that starts with "However" or "Therefore"','One with a simple past-tense verb','One that states a general fact'],ans:1,exp:'Connectors like "However" and "Therefore" signal a continuation of an idea already introduced — they cannot open a passage.'},
   {q:'A fragment beginning "He then decided to retreat" must be preceded by a fragment that:',opts:['Also uses "he"','Introduces who "he" is','Uses future tense','Is the last fragment'],ans:1,exp:'The pronoun "he" needs an antecedent — a fragment naming the person must come before it.'}
 ],
 meta:{difficulty:3,time:'8 min',prereq:['clauses'],related:['Clauses','Sentence Structure']},
 didYouKnow:'This question type deliberately avoids giving explicit numbering hints — the entire skill being tested is your sensitivity to how English signals sequence through pronouns, tense, and discourse connectors, not memorised rules.',
 comparison:{headers:['Signal','What It Tells You','Example'],
   rows:[
     ['Pronoun (he/it/this)','Something specific was named earlier','"It" needs an antecedent noun before it'],
     ['Connector (however/therefore)','A contrasting/consequent idea follows something','Cannot open the passage'],
     ['Time marker (finally/meanwhile)','Position in a sequence','"Finally" usually signals the closing fragment']
   ]},
 officerTip:'Logical sequencing under time pressure mirrors briefing/debriefing skills expected of officers — presenting events in the correct causal order is exactly what this question type trains.',
 pyqNotes:[{q:'What is the fastest way to attempt a P/Q/R/S ordering question under time pressure?',a:'Eliminate non-openers in the first 10 seconds (anything starting with a pronoun or connector), then just confirm the chain between the 1-2 remaining candidates rather than testing all 24 possible orderings.'}],
 mnemonicChain:'"OPEN": Openers first (eliminate pronoun/connector starts), Pronouns point back, Establish the chain, Nail it with a final read-through.'},

{id:'confused-words',icon:'🔀',title:'Commonly Confused Words',desc:'Homophones and near-synonyms that NDA papers test as pairs (affect/effect, its/it\'s, etc.)',
 learn:`<p>NDA papers frequently test pairs of words that are spelled or pronounced similarly but carry different meanings and grammatical roles. These trip up even strong candidates because both words in the pair "look right" on a fast read.</p>
 <ul>
 <li><b>Affect (verb, to influence)</b> vs <b>Effect (usually a noun, the result)</b></li>
 <li><b>Its (possessive)</b> vs <b>It's (contraction of "it is")</b></li>
 <li><b>Than (comparison)</b> vs <b>Then (time/sequence)</b></li>
 <li><b>Principal (head of an institution / main)</b> vs <b>Principle (a rule or belief)</b></li>
 <li><b>Stationary (not moving)</b> vs <b>Stationery (paper/writing materials)</b></li>
 <li><b>Complement (something that completes)</b> vs <b>Compliment (praise)</b></li>
 </ul>`,
 examples:[
   {s:'"The new policy will affect recruitment." vs "The effect of the policy was immediate."',note:'Affect = verb (to influence); effect = noun (the result).'},
   {s:'"The dog wagged its tail." vs "It\'s time to leave."',note:'"Its" = possessive, no apostrophe; "it\'s" = contraction of "it is."'}
 ],
 tricks:[{t:'For its/it\'s: mentally expand the sentence to "it is" — if that still makes sense, use "it\'s"; if not, use "its."'}],
 mistakes:[{m:'Using "principle" when referring to the head of a school or college — that role is a "principal," a common spelling confusion.'}],
 summary:'Learn confusable word pairs by contrasting example sentences, not isolated definitions — the confusion is always contextual.',
 quiz:[
   {q:'Correct usage: "The weather did not ___ our plans."',opts:['effect','affect','effected','affection'],ans:1,exp:'"Affect" (verb) means to influence; the sentence needs a verb here.'},
   {q:'Correct usage: "He always sticks to his ___."',opts:['principals','principles','principle\'s','principals\''],ans:1,exp:'"Principles" (rules/beliefs) is correct here, not "principals" (heads of institutions).'}
 ],
 meta:{difficulty:2,time:'7 min',prereq:[],related:['Vocabulary','Spotting Errors']},
 didYouKnow:'"Affect" can rarely also be a noun in psychology (meaning visible emotion), and "effect" can rarely be a verb (meaning to bring about) — but for NDA-level English, treat affect=verb and effect=noun as the reliable default.',
 comparison:{headers:['Pair','Word 1','Word 2'],
   rows:[
     ['affect / effect','affect = verb, to influence','effect = noun, the result'],
     ['its / it\'s','its = possessive','it\'s = it is'],
     ['stationary / stationery','stationary = not moving','stationery = paper goods'],
     ['complement / compliment','complement = completes something','compliment = praise']
   ]},
 officerTip:'Written orders and reports lose credibility fast when confusable words are swapped — proofreading specifically for this list is standard practice before any official document goes out.',
 pyqNotes:[{q:'Which confusable pair is tested most often at NDA level?',a:'Affect/effect and its/it\'s appear most frequently, since both pairs are common in everyday writing and the error is easy to overlook on a fast read.'}],
 mnemonicChain:'"Its is possessive, It\'s is It Is" — say the mnemonic aloud whenever the pair appears; the rhyme forces you to pause and check.'},

{id:'cloze-test-strategy',icon:'🧠',title:'Cloze Test Strategy',desc:'A systematic method for filling blanks in a passage using context, not guesswork.',
 learn:`<p>A <b>cloze test</b> is a passage with several blanks, each with four word options. The skill is using the surrounding sentence — not just the blank in isolation — to work out grammatical fit and meaning.</p>
 <ul>
 <li>Read the whole passage once before answering any blank — later sentences often clarify the topic and tone needed for earlier blanks.</li>
 <li>For each blank, first eliminate options that are the wrong part of speech for that slot.</li>
 <li>Among the remaining options, choose the one that fits the passage's established tone (formal/informal, positive/negative) and any earlier vocabulary choices.</li>
 <li>Watch for fixed collocations spanning the blank — "___ to" vs "___ with" often eliminates three of four options instantly.</li>
 </ul>`,
 examples:[
   {s:'"The commander was known ___ his fairness." (for/to/with/at)',note:'"Known for" is the fixed collocation — eliminates the other three immediately.'}
 ],
 tricks:[{t:'Never answer a cloze blank without reading at least one sentence before and one sentence after it — isolated-blank guessing is the single biggest source of avoidable errors here.'}],
 mistakes:[{m:'Picking the option that is grammatically possible but tonally wrong — e.g. an overly casual word in an otherwise formal passage about a military operation.'}],
 summary:'Read the full passage first, eliminate wrong parts of speech, then match tone and fixed collocations to choose the final answer.',
 quiz:[
   {q:'The best first step when attempting a cloze passage is to:',opts:['Answer blanks in order without reading ahead','Read the entire passage once for context first','Only read the sentence containing the blank','Guess based on option length'],ans:1,exp:'Reading the whole passage first establishes tone and topic, which resolves many blanks instantly.'},
   {q:'"The regiment was praised ___ its discipline." (for/of/with/to)',opts:['for','of','with','to'],ans:0,exp:'"Praised for" is the fixed collocation.'}
 ],
 meta:{difficulty:3,time:'10 min',prereq:['reading'],related:['Reading Comprehension','Idioms & Phrasal Verbs']},
 didYouKnow:'Cloze passages in NDA papers are frequently adapted from military history, biography, or discipline-themed writing — familiarity with formal, slightly old-fashioned register (common in such writing) speeds up tone-matching.',
 comparison:{headers:['Step','Action','Why'],
   rows:[
     ['1','Read full passage once','Establishes tone/topic before committing to any answer'],
     ['2','Eliminate wrong part of speech','Quick first cut, usually removes 1-2 options'],
     ['3','Check fixed collocations','Often eliminates all but one option instantly'],
     ['4','Match tone/register','Final tie-breaker between remaining options']
   ]},
 officerTip:'Reading an entire order or report before acting on any single line is a basic discipline taught early in officer training — the same patience applies directly to solving cloze passages well.',
 pyqNotes:[{q:'Why do strong candidates still lose marks on cloze tests?',a:'They answer blanks sequentially without reading ahead, missing context clues that later sentences provide — reading the full passage first is the single highest-leverage fix.'}],
 mnemonicChain:'"RECT": Read fully, Eliminate wrong part of speech, Check collocations, Tone match last.'},
];
