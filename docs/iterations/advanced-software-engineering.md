# Advanced Software Engineering: iteration rounds

Tracks the Advanced Software Engineering course through the rounds in [Build in iterations](../building-a-course.md#build-in-iterations), adapted for a course with no past exams: there is no exam-integration round, and the practice rounds write their own questions from the lectures, split into a multiple-choice round and a system/diagram round. Each round is committed on its own (commit messages say "Part of this issue"), ticks its box here, and adds its report below.

The course follows the lectures, not chapters. Each module is one lecture, labelled **Lecture N** in the registry, and ends with a **Lecture N Practice** lesson holding a scored multiple-choice quiz and a separate set of system and diagram questions.

Lectures: **L1** Foundations of Modern Engineering: The AI-Augmented SDLC · **L2** Foundations of Modern Engineering · **L3** SOLID Principles · **L4** Architectural Views · **L5** Building Software Architecture (with the ten-styles infographic) · **L6** Architecting a Global Music Streaming Platform (added after round 12)

- [x] 1. Skeleton (whole course)
- [x] 2. Source fidelity
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [x] 3. Depth
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [x] 4. Plain language
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [x] 5. Terminology (highlight + definition popup)
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [x] 6. Visualizations
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [x] 7. MCQ practice
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [x] 8. System and diagram questions
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [x] 9. Connections (whole course)
- [x] 10. Student read-through
  - [x] L1
  - [x] L2
  - [x] L3
  - [x] L4
  - [x] L5
- [ ] 11. Real readers (whole course): waiting for student feedback; can't be done by an agent
- [x] 12. Final quality review (whole course)

## Reading the slides cheaply

Text copies of all six slide decks are in `_sources/advanced-software-engineering/*.md` (git-ignored, never committed). Five were made with [markitdown](https://github.com/microsoft/markitdown) (`markitdown deck.pdf > deck.md`). The week 5 "Building Software Architecture" deck has broken font encoding, so its copy was made with OCR (`pdftoppm -r 150` then `tesseract`, one `## Slide N` heading per page). Read these first; open a slide image only to check a diagram.

## What each round must deliver

| # | Round | Done when |
| --- | --- | --- |
| 1 | Skeleton | Every lecture has lessons and a practice lesson, the course is registered, the term popup and diagram components exist, every hard idea has one visualization, and lint, tests and build pass. |
| 2 | Source fidelity | Every topic, definition, example, diagram, table and dilemma on the lecture's slides is in a lesson, with the slide's name for it. Source errors are listed. Nothing invented is presented as coming from the slides. |
| 3 | Depth | Every term is explained before it's used, every example is walked through, and each lesson names the mistake students usually make. |
| 4 | Plain language | Short sentences, the simplest accurate word, no jargon a non-native speaker would have to look up twice. |
| 5 | Terminology | Every genuinely difficult term is a `<Term>` at its first use in each lesson, with one consistent glossary definition; easy words are not highlighted; each content lesson ends with `<KeyTerms>`. |
| 6 | Visualizations | Every idea still only in text has been judged; architecture, UML, sequence and process diagrams added where they teach something; every diagram works at phone width and in both themes. |
| 7 | MCQ practice | Each lecture's quiz covers every lesson, mixes conceptual, terminology, scenario, comparison, "which is NOT" and design-decision questions, has plausible distractors, and explains every answer. |
| 8 | System and diagram questions | Each lecture has system interpretation, diagram interpretation, missing component, error detection, sequence, relationship, design decision and diagram construction questions where the material allows, each with a figure and an explanation. |
| 9 | Connections | Ideas used in one lecture link to the lecture that teaches them; commonly confused pairs are contrasted; paths and prerequisites are set. |
| 10 | Student read-through | A fresh read as a first-time student lists every confusing, unclear or boring place; a separate pass fixes it. |
| 11 | Real readers | Students use the course and report problems. |
| 12 | Final review | All of the above re-checked against the final-quality list in the original request. |

## Analysis done before round 1

Read all six source PDFs (lectures 1 to 5 and the week 5 styles infographic), the repository's course conventions (`CLAUDE.md`, `docs/building-a-course.md`, the Advanced Algorithms tracker, the registry, the MDX components and the advanced-algorithms test), and checked the upstream repository. **No Advanced Software Engineering course existed** in this fork or upstream, so round 1 built it from the slides rather than improving an existing one.

### Concepts, hard terms and planned visuals per lecture

| Lecture | Concepts | Difficult terminology | Visualizations | Good for MCQ | Good for system/diagram questions |
| --- | --- | --- | --- | --- | --- |
| L1 | course goals, scaling myth, "wait for GPT-N", black-box fallacy, SWE-bench case study (premature victory, context rot, overwhelmed execution), the harness (initializer/worker, compaction, progressive tooling, verification gates, architectural inversion), PID case study, float32 absorption, typosquatting supply-chain attack | SDLC, LLM, context window, context rot, agent harness, deterministic, verification gate, PID, feedback loop, float32, absorption, HIL, supply chain attack, typosquatting, hallucination | harness diagram, feedback loop, the slide's sequence diagram, float32 accumulator demo, attack path | failures ↔ harness mechanisms, PID terms, why tests passed | next message in the sequence, missing verification gate, flawed review process |
| L2 | software crisis, essential vs accidental complexity, Brooks' four properties, architecture/design continuum, definition of architecture, architectural vs design details, house analogy, economic goal, clean-up-later fallacy, behavior vs structure, cost-friction (scope/shape), Eisenhower matrix, extreme trade-offs table, 4D model, eight expectations, Pets.com, 2002 data center, depth vs breadth and knowledge pyramid, process vs practices, two laws, circle of life, hands-on strategies, ML paradigm shift, when (not) to use ML, four pillars, SWE vs ML table, three dilemmas | essential/accidental complexity, software architecture, architectural decision, coupling, decoupling, behavior/structure value, scope/shape of change, architecture characteristics, fitness function, elastic scale, technical depth/breadth, unknown unknowns, trade-off, ADR, POC, critical path, data drift, silent failure, stationarity, interpretability, latency, throughput, QPS | architect/developer diagram, cost-per-feature curve, Eisenhower matrix, knowledge pyramid, rules vs ML pipeline, ML decision path | complexity types, scope vs shape, 4D dimensions, laws, when not to use ML | knowledge-pyramid direction, rules-vs-ML design decision, process-vs-practice error |
| L3 | design principle, automotive challenges, OO recap, SOLID table; SRP (actor model, itself test, FrontCamera, FFI, MediaLibrary feature envy → delegation); OCP (feature manager, composition root, routing strategy, inheritance vs delegation table); LSP (contracts, OccupancyGrid3D, path planner, ambiguity tables, two-step fix, inheritance vs delegation, composition/aggregation); ISP (VehicleOperator, dummy implementations, client table, segregated interfaces); DIP (sensor fusion, adapters, composition root, inversion vs injection); three dilemmas | design principle, SOLID, each principle, actor, god class, feature envy, code smell, Information Expert, refactoring, delegation, polymorphism, abstraction, composition root, Strategy, Template Method, behavioral contract, pre/postcondition, composition, aggregation, fat interface, attack surface, least privilege, high-level policy, low-level detail, adapter, dependency injection, FFI, ASIL, OTA, ADAS, IVI, SIL/HIL | itself-test interactive, before/after class diagrams, change-impact explorer (OCP, DIP), LSP height scene, dependency-direction flip, ISP dependency diagrams | which principle is violated, contract rule, inversion vs injection, inheritance vs delegation | spot the violated principle in a diagram, missing interface, composition vs aggregation, choose the right interface |
| L4 | views and documentation, quality attributes per view, structure vs view, one system many views, three kinds of structures, module vs component, module structures (decomposition, uses, generalization, data model), ATIA-M examples, C&C views and questions, concurrency, UML component notation, allocation views (deployment, install, work assignment) | view, structure, module, component, connector, module/C&C/allocation view, decomposition, uses, generalization, data model, provided/required interface, port, concurrency view, resource contention, deployment/install/work-assignment style, artifact | climate-control system in three views, decomposition vs client-server, A/B/C/D/E package, ATIA-M decomposition and uses, UML component notation, lollipop redraw, deployment diagram, install view, work-assignment table | structure vs view, module vs component, which view answers which question, notation | identify the view type, decomposition with two parents, why the arrows should be lollipops, which view to draw |
| L5 | views recap, styles vs views, properties of styles, topologies, role of the architect, process (requirements → design → validation, iterative), step 2a/2b, style list, n-tier, client-server, P2P (+ Napster), pipe-and-filter (two views, UNIX example), messaging, the infographic's ten styles with examples, pros and cons | architectural style, topology, architecturally significant requirements, non-functional requirement, n-tier, client-server, thin client, separation of concerns, synchronous/asynchronous, P2P, pipe-and-filter, filter, pipe, messaging, message queue/broker, implicit invocation, publish-subscribe, event-based, web services, microservices, single point of failure, eventual consistency, API gateway, replication | topologies, process flow, step-2 input/output, n-tier tiers and machines, client-server, P2P, pipeline runner, filter C&C and module views, message-queue stepper, implicit invocation / pub-sub / event-based tabs, SOA triangle, microservices | properties of styles, process steps, quality attributes per style, matching examples to styles | which tier holds business rules, missing pub/sub broker, next step after a queue write, choose a style, shared-database microservices error |

## Reports

Newest last.

### Round 1, skeleton: whole course

**Built:**
- `src/content/advanced-software-engineering/`: 24 lessons, `m1-01` to `m5-05`, five lectures (2 + 4 + 5 + 4 + 4 content lessons, plus one practice lesson per lecture). Registered in `src/content/registry.ts` with module labels `Lecture 1` to `Lecture 5`, accent `sky`, authored by Asmaa Farouq.
- `glossary.ts`: 129 terms with one short definition each and the lecture that teaches it.
- `src/components/mdx/SoftwareEngineeringVisualizers.tsx`:
  - `Term`: the highlighted word with a definition popup. It opens on hover (with a delay) or on tap/click, closes on Escape or outside click, sits above the text (`side="top"`, collision padding) and uses the sky accent bar like the lesson-link previews.
  - `KeyTerms`: the "Key terms" recap at the end of every content lesson.
  - `BoxDiagram`: an SVG diagram for architecture, UML and system pictures: boxes, components, lollipop interfaces, cylinders (stores), packages, 3-D nodes, notes, "?" missing slots, arrows, inheritance/realization triangles, dashed dependencies and curved edges.
  - `SequenceDiagram`: UML sequence diagrams, with a hidden-message mode for "what happens next?" questions.
  - `DiagramTabs` (before/after and multi-view tabs) and `ChangeImpact` (pick a change request and see what each design edits or adds).
  - `FloatAccumulator`, `FeatureCostChart`, `EisenhowerMatrix`, `ItselfTest`, `OccupancyGridLsp`, `PipelineRunner`, `MessageQueueStepper`.
- `src/lib/softwareEngineering.ts`: float32 accumulation (via `Math.fround`), float32 spacing, the illustrative cost curve, the itself-test data, the pipeline run and the queue frames.
- `Quiz` questions can now carry a `figure` (a diagram shown under the prompt). Nothing else in `Quiz` changed.
- Course icon (three stacked layers), prerequisites (Data Structures, Operating Systems, Computer Networks), README row.
- `src/test/advanced-software-engineering.test.tsx`: renders all 24 lessons; checks the lecture labels, that every lecture ends with a practice lesson with both question sections and the "no past exams" note, that every `<Term>`/`<KeyTerms>` id exists, that every question has an explanation, that every content lesson highlights terms and lists key terms, that no names, institutions or course codes appear, and the helper functions (float32 loss at 100000, the itself-test table, the pipeline, FIFO queue).

**Decisions:**
- **Lessons per lecture, practice at the end of each lecture.** The request's structure (content → key terms → visuals → MCQ → system/diagram questions → solutions) is met by: content lessons with highlighted terms, inline diagrams and a "Key terms" recap, then a practice lesson. Solutions are the per-question explanations (shown on answering), plus `ModelAnswer` for the written dilemmas.
- **Practice is marked as practice.** Every practice lesson starts with a callout saying the course has no past exams and that the questions were written from the lecture. The MCQ section is a scored `Quiz` (completes the lesson); the system/diagram section is a `practice` quiz (no score), under its own heading.
- **One glossary, many lessons.** Definitions live in one file so a term means the same everywhere, as the request asks.
- **Additions marked as additions.** Where the slides only ask a question ("Disadvantages? Cautions? Qualities?", "Using loops?", "Does the tier type matter?"), the lessons give an answer and say the lecture left it as a question. The climate-control allocation tab and the lollipop redraw say they are our own drawings.
- **Week 5's infographic** became its own lesson, "Ten Architecture Styles at a Glance", since it covers five styles the week 5 slides only list.

**Source errors and notes found so far:**
- Lecture 1: the PID incident is called "catastrophic cancellation (type truncation)". The effect described (a small number vanishing when added to a large one) is absorption/swamping; catastrophic cancellation is precision loss when subtracting nearly equal numbers. The lesson gives both names and explains.
- Lecture 1 and 2 headers carry two different course codes (CS325 and CS352). Neither appears in the lessons.
- Lecture 4: the ATIA-M decomposition slide labels an app "TDDT", the uses slide "TDDC". Kept as on each slide; to confirm in round 2.
- Lecture 4: the slide's own C&C example uses plain arrows and notes they should be lollipops; the lesson shows the corrected drawing.

**Found but not fixed:**
- Diagrams wider than the phone column scroll sideways inside their frame (the page itself doesn't overflow). Round 6 should lower the minimum width or simplify the widest diagrams.
- The topology diagram in m5-01 is built from tiny boxes; a dedicated small SVG would read better (round 6).
- The ATIA-M decomposition is drawn as a tree from the slide's nested packages; the full server-side Java module list (14 packages) is summarized in one box (round 2).
- No cross-course links yet (e.g. client-server to Operating Systems' "Communication in client-server systems", pipes to the Linux lab). Round 9.

**Checked:** `npm run lint` (0 errors; the 12 warnings are all pre-existing in `src/components/ui`), `npm run test` (all pass after the file rename below), `npm run build` (OG images and pages generated for every new lesson). In a browser at 390 px wide: eight lessons opened with no horizontal page overflow; a term popup opened on tap and stayed clear of the text; the DIP before/after tabs rendered.

**Not checked:** dark theme and reduced motion in the browser; keyboard-only use of the popups; every interactive demo by hand (only the popup and tabs were exercised).

**Note on file names:** lesson files must start `m<N>-<NN>-`; the lesson-link and preview tooling reads lesson slugs from that pattern. The first draft used `l<N>-` and failed the link test, so the files were renamed.

**Next:** round 2, source fidelity, one lecture at a time starting with L1.

### Round 2, source fidelity: L1 and L2

Checked Lecture 1 (13 slides) against m1-01 to m1-03, and Lecture 2 (37 slides) against m2-01 to m2-05, slide by slide from the text copies, with the diagram slides (L1 slide 10, L2 slides 7 and 28) checked as images.

**Already covered:** L1: course objectives and the prime directive; the scaling myth, "wait for GPT-N" and black-box fallacy; the SWE-bench case study with all three failures and the short-term-memory analogy; the harness's four mechanisms and architectural inversion; the moral (engine vs vehicle, three points, takeaway); the PID setting, the three voices, the setup slide's sequence diagram, the incident with its 12-hour run and 0.0000001 delta, and the typosquatting attack. L2: every slide, including the software crisis and Brooks, both complexities, the four properties, the continuum and Axiom I, the definition and architectural vs design details, the architect/developer figure, the three open questions, the house analogy, the economic goal, the clean-up-later fallacy, the two values, cost-friction, the Eisenhower matrix, Table 1, the 4D model, all eight expectations and the compliance imperative, Pets.com and the 2002 data center, depth vs breadth and the knowledge pyramid, process vs practices, both laws with corollaries and examples, the circle of life, the four hands-on strategies, the ML paradigm shift, the definition, when to use and the five reasons not to, the four pillars, Table 2, the three dilemmas with their numbers, and the summary.

**Changed:**
- m1-01: SWE-bench described as on the slide ("500 complex engineering tasks"), dropping a detail the slide doesn't give; the slide's terms *context garbage collection* and *bounded contexts* now appear, each explained; added the lecture's readings.
- m2-01: the answers to the three open questions are labelled as ours, not the slides'.
- m2-04: the dilemma model answers are labelled as written for this course; added the lecture's readings.

**Source errors:** none new beyond round 1's (the "catastrophic cancellation" name, and the two course codes in the headers).

**Left out on purpose:** the bibliography slide (a reference list); the lessons cite the per-lecture readings instead. L1 slide 13 is blank.

**Not checked:** no browser check (text-only changes).

### Round 2, source fidelity: L3

Checked Lecture 3 (61 slides, SOLID applied to automotive software) against m3-01 to m3-06.

**Already covered:** the definition of a design principle, the four automotive challenges, the OO recap table and the SOLID table; SRP's two quotes, the super-ECU metaphor, the actor table and refined definition, the itself test with all seven FrontCamera methods and the "context matters" notes, the refactored classes, methods with parameters, the FFI benefit, the MediaLibrary before/smells/after/gains and the refactoring axiom; OCP's feature manager, impact table, refactoring, gains table, pragmatic reality, routing strategies and the inheritance-vs-delegation table; LSP's two statements, contracts table, contract rule, OccupancyGrid3D, the path planner, both "what went wrong" tables, the axiom, both fix steps, the gains table, the conservative default, the three relationships and decision matrix with the golden rule; ISP's fat-vs-segregated table, VehicleOperator, the forced dummies, the client table and hazards, the four interfaces, the focused operators and clients, the gains table and the Level 3 handover; DIP's statement, the traditional-vs-inverted table, the supplier-coupled fusion code and impact table, the three fix steps, the inverted-dependency diagram, the inversion-vs-injection distinction; all three dilemmas and the summary.

**Changed:**
- m3-05: added the slide's "what we gained" table as a static table (the interactive change-impact explorer stays, but revision needs the table too); added the lecture's readings.
- Dilemma 1 (SRP vs. latency) moved from m3-05 to the end of m3-01, so each dilemma sits with the principle it tests (SRP, LSP, ISP+DIP).
- m3-01, m3-03, m3-05: each dilemma is labelled as one of the lecture's "Think & Defend" questions, with the model answer marked as written for this course.

**Source errors:** none found in the code or tables. Two names are simplified on purpose: the slide's DIP diagram stereotypes («Core Policy», «SIL Benchmark», «Radar», «Camera») appear as «core policy» and «SIL»; the radar/camera stereotypes are left off to fit phone width.

**Left out on purpose:** the credits line naming the authors of the original slides (no people's names in lessons).

**Not checked:** no browser check (text and table changes only).

### Round 2, source fidelity: L4 and L5

Checked Lecture 4 (41 slides) against m4-01 to m4-05, Lecture 5 (29 slides, from the OCR copy) and the ten-styles infographic (11 pages) against m5-01 to m5-05. Diagram slides were checked as images (L4 decomposition, ATIA-M, uses, C&C, deployment, install and work-assignment figures; L5 process, step 2, n-tier, client-server, P2P, pipe-and-filter and messaging figures).

**Already covered:** L4: the documentation equation, how views relate to quality attributes and goals, "can one view represent an architecture?", structures vs views, the GEB image, the three kinds of structures, every module-vs-component question and the "No!" with its figure, the module-structure questions, the four module styles, decomposition (relation, elements, both constraints, the A–E figure, ATIA-M), uses (definition, relation, purpose, the loop question, the ATIA-M uses figure), C&C components, connectors and questions, the concurrency view, UML component notation with the order-system example, the climate-control module and C&C views with the lecture's own lollipop warning, and all three allocation styles with their definitions, questions and figures. L5: the terminology review, styles vs views, the three properties of styles, the seven topologies, the architect's role, the iterative process, steps 1, 2, 2a and 2b with their figures, the style list, n-tier (both figures, key properties, quality attributes), client-server, P2P with the Napster hybrid, pipe-and-filter (properties, invariant, UNIX example, both views, the three open questions), messaging (figure, key property, quality attributes). Infographic: all ten styles with definition, example, pros and cons.

**Changed:**
- m4-02: the ATIA-M server-side Java module list is now complete in the caption (it was summarized); the estore uses example is described as the slide draws it, replacing an interpretation of its circles; added the lecture's readings.
- m4-04: the second UML deployment example (device → OS → Tomcat → shopping.war nesting) is now described.
- m5-02: client-server examples and pros/cons table taken from the infographic, replacing examples of our own.
- m5-03: the infographic's messaging examples (Amazon SQS orders, LinkedIn Kafka) and pros/cons table; added the lecture's readings.

**Source errors:** L4's decomposition slide names an app "TDDT", the uses slide names it "TDDC"; the lessons keep each slide's spelling. L4's C&C example uses plain arrows that the lecture itself says should be lollipops (redrawn in m4-03).

**Left out on purpose:** image credits on L4's slides (a previous course offering) and the infographic's navigation hints.

**Round 2 is complete for all five lectures.**

### Round 3, depth: L1 to L5

Read each content lesson looking for terms used before they're explained, examples with skipped steps, and missing "what students get wrong."

**Changed:**
- **A "Common mistake" callout in all 19 content lessons**, each naming a specific confusion from that lesson's material, e.g. SRP read as "one method", DI mistaken for DIP, the interface placed in the supplier's package, a decomposition view drawn with two parents, deployment vs install, tiers vs machines, messaging vs publish-subscribe, big scope mistaken for bad architecture. The course test now requires one in every content lesson.
- **Abbreviations explained at first use:** tokens (m1-01); ECU, HUD, DTC, GNSS (m3-01); SOME/IP and DDS (m3-04); CAN bus (m3-05); EJB and .ear/.jar/.war (m4-04); SOAP/WSDL vs REST/JSON, OSGi, gRPC (m5-04). Terms that matter more get glossary popups in round 5.

**Already deep enough:** the worked examples were walked through in round 1 (float32 absorption in four steps with the 2⁻⁷ spacing, the itself test per method, the scope-vs-shape example, both LSP fix steps, the three DIP steps, the pipeline and the queue steppers).

**Found but not fixed:** the m3-02 common-mistake note mentions over-abstraction as "a related trap"; the slides don't name it, and the note says the lecture's abstractions all wrap something that varies. Kept because it stops readers over-applying OCP.

**Not checked:** no browser check (text only).

### Round 4, plain language: L1 to L5

Scanned the prose of every lesson (code, tables and diagram data excluded) for sentences over 32 words and for a list of hard words (leverage, facilitate, paradigm, agnostic, pristine, catastrophic, inherently and similar), then read each hit.

**Changed:**
- Split ten long sentences into short ones: the tokens aside (m1-01), the "hack deliberately" answer (m2-04), the super-ECU and FFI sentences (m3-01), the SOA point (m3-04), both uses-view sentences (m4-02), the nested deployment example (now a four-step arrow chain, m4-04), and the Amazon/LinkedIn examples (m5-03).
- Hard words: "facilitate" → "run discussions" (m2-03); the slide's "catastrophic anti-pattern" kept but explained; "paradigm shift" (a slide heading) explained in one sentence (m2-04).
- Kept on purpose: slide terms that are the right names (catastrophic cancellation, deterministic, probabilistic), each explained where it's used.

**Not changed:** most scanner hits were bulleted lists the script joined into one "sentence"; the lists themselves are short items.

**Not checked:** the repository's humanizer pass (not available in this environment); no browser check.

### Round 5, terminology: L1 to L5

Audited every `<Term>` and `<KeyTerms>` with a script: glossary entries never highlighted, terms highlighted twice in one lesson, key terms not highlighted in their lesson, and glossary terms that appear in a lesson's prose without a highlight.

**Found:** six glossary entries were never highlighted (srp, cohesion, artifact, web-services, microservices, api-gateway); m3-03 highlighted "delegation" twice; four lessons listed key terms they never highlighted.

**Changed:**
- Fixed all of the above. "Single Responsibility Principle" is now highlighted where it's named in m3-01; cohesion is introduced alongside coupling; the artifact and API-gateway definitions got a sentence each in m4-04 and m5-04.
- **Highlighted terms taught in another lesson** at their first plain-prose use, where a reader may have forgotten them: trade-off (m1-01, m2-04), technical debt (m2-03, m2-04), microservices and latency (m2-03), ADAS (m3-02, m3-05), abstraction (m3-03, m3-05), coupling and ASIL (m3-04), attack surface (m3-05), replication and architectural style (m4-03), module view (m4-04), quality attribute and component (m5-01), synchronous (m5-03), web services and microservices (m5-04). Popups show where the term is taught ("Lecture N").
- **Left plain on purpose:** everyday words that are also glossary entries (behavior, structure, module, view) where the lesson uses them in their everyday sense, and the style names in m5-01's overview list, which the next three lessons highlight properly.
- The course test now enforces: one highlight per term per lesson, every key term highlighted in its lesson, and every glossary entry used somewhere. 153 highlights in total.

**Not checked:** dark theme and keyboard use of the popups (round 6).

### Merge with main (between rounds 5 and 6)

Merged `main` (481 new commits) into the branch, then into `main`. The merge had no text conflicts, but `main` had added three rules the course had to follow:
- **Question bank:** scored quizzes now read from `src/content/advanced-software-engineering/questions.ts` (48 questions, ids `advanced-software-engineering/lecture-N-practice/qK`). The system and diagram questions stay inline as `<Quiz practice>`, which the bank rule allows.
- **Track groups:** the course is in the "Systems" group on the home page.
- **Moved components:** `FocusPanel` now comes from `vizKit.tsx` and `Diagram` from `Diagram.tsx`.

Lint, the full test suite and the build pass after the merge.

### Round 6, visualizations: L1 to L5

Opened the diagram-heavy lessons in Chromium at 390 px wide, in dark and light themes with reduced motion, and judged every idea still only in text.

**Found:**
- Wide diagrams (decomposition vs client-server, the 4-participant sequence diagram, several before/after tabs) were cut off at the right edge with no sign they scroll.
- The topology picture in m5-01 lost its "Line" and "Bus" panels on phones.
- The LSP height scene's labels were too small to read at phone width (about 7 px).
- Scope vs shape of change (m2-02) was explained only in words.

**Changed:**
- `ScrollFrame` wraps every `BoxDiagram` and `SequenceDiagram`: wide diagrams keep readable text and scroll inside their frame, and a "swipe to see the whole diagram →" hint appears only when the diagram is actually wider than the screen. The minimum drawing width dropped from 440 to 420.
- New `Topologies` component: the lecture's seven topologies (ring, mesh, star, fully connected, line, tree, bus; mesh was missing before) as small pictures in a grid that wraps on narrow screens.
- The LSP scene was redrawn on a narrower canvas with 13–15 px labels.
- New scope-vs-shape tabs in m2-02: the same small request in a healthy system (one module changes) and in a decaying one (it ripples through all five).

**Checked:** both themes, reduced motion (none of the course's components animate), no page overflow on the checked lessons, a term popup opens from the keyboard (focus + Enter), lint, the course tests and the build.

**Judged and left as text or tables:** the 4D model, the eight expectations, and the SWE-vs-ML table: they are lists to revise from, and a picture would add nothing.

### Round 7, MCQ practice: L1 to L5

Checked each lecture's scored quiz (now in `questions.ts`) for coverage of every lesson, a mix of question types, plausible distractors and explanations that say why the wrong options are wrong.

**Found:** every lesson already had at least one question, but some topics were untested (architectural inversion, Pets.com and the 2002 data center, fitness functions as compliance, hands-on strategies, inheritance-vs-delegation binding time, deployment views for capacity, P2P drawbacks, messaging vs pub/sub, the SOA triangle), and comparison and "which is NOT" questions were rare. No question linked back to the lesson that teaches it.

**Changed:**
- 15 new questions, 3 per lecture (48 → 63): comparison questions (the harness's two questions, inheritance vs delegation, messaging vs pub/sub, P2P vs client-server), "which is NOT correct" (float32 bug, ISP benefits, views), scenario/design-decision (fitness-function linter, memory capacity, the mixed-criticality merge) and application (SOA order, C&C vs module question).
- Every question now has a `lesson` field, so the site's review and exam features can say which lesson to re-read.
- The course test now requires at least 10 questions per lecture, a valid `lesson` on each, and at least one question on every content lesson.

**Mix per lecture (approx.):** conceptual 3, terminology 2, scenario/application 3, comparison 1–2, "which is NOT" 1–2, design decision 1.

**Not checked:** whether the site's course exam picks these up as expected (it reads the same bank; no browser check this round).

### Round 8, system and diagram questions: L1 to L5

Checked each lecture's "System and diagram questions" against the eight question types in the request.

**Found:** 19 questions in total, each lecture using only three or four types. No lecture had a diagram-construction question except L4, L2 and L4 had no missing-component question, and L1–L3 had no system-interpretation question.

**Changed:** 14 new questions (19 → 33), each labelled with its type at the start of the prompt:

| Lecture | Types now present |
| --- | --- |
| L1 | sequence, missing component, error detection, system interpretation, design decision, diagram construction |
| L2 | relationship, design decision, error detection, diagram interpretation, missing component, diagram construction |
| L3 | error detection, missing component, relationship, design decision, sequence, diagram construction, system interpretation |
| L4 | diagram interpretation, error detection, diagram construction, missing component, relationship, system interpretation |
| L5 | system interpretation, missing component, sequence, design decision, error detection, relationship, diagram construction |

New figures include the harness state store, a 64-bit sequence with the missing actuator message, the Eisenhower matrix with a blank quadrant, the DIP runtime call through the interface, an install view with a missing .jar, a deployment with a single point of failure, and a pipeline with an unlabelled connector. Diagram-construction questions give a short scenario and ask which components and relationships belong in the diagram.

**Test:** the course test now requires every system/diagram question to start with one of the eight type labels, and at least five different types per lecture.

**Checked:** all five practice lessons at 390 px (4–5 figures each, no page overflow, no page errors), the build.

### Round 9, connections: whole course

Listed every cross-lesson link already in the course (25, all inside the course), looked for ideas that one lecture uses and another teaches, pairs students confuse, and other courses that teach the same mechanisms.

**Changed, inside the course:**
- L1 → L2: verification gates linked to fitness functions.
- L3 → L2: SOLID introduced as the cost-friction principle at class level.
- L4 → L2: a "same word, different meaning" callout separating Lecture 2's *structure* (a value: ease of change) from Lecture 4's *structure* (a set of elements).
- L4 → L3: required interfaces in C&C views linked to Dependency Inversion.
- L5 → L4: n-tier's flexible deployment linked to the deployment view.
- L5 → L3: microservices' "one capability per service" linked to SRP.
- Already present from earlier rounds: ML silent failures ↔ the float32 bug, ISP vs SRP, DI vs DIP, messaging vs pub/sub, client-server vs messaging, module vs component, the First Law and 2002 data center from the microservices section, and every "next lesson" link.

**Changed, across courses:**
- Client-server (m5-02) → Operating Systems' communication in client-server systems.
- Pipe-and-filter (m5-03) → the Operating Systems Linux lab's redirection and pipes.
- Messaging (m5-03) → Data Structures' queues, and Operating Systems' indirect communication (mailboxes).
- Back-links: Data Structures' queues lesson links "messages between services" to messaging; Operating Systems' IPC lesson links its microservices card to the microservices section.

**Paths and tools:**
- New learning path "Building real software": Data Structures → Operating Systems → Computer Networks → Advanced Software Engineering. Prerequisites were set in round 1.
- Three new entries on the tools page: Kafka, RabbitMQ and message queues; Docker, Kubernetes and microservices; AI coding assistants. Each points at lessons whose text contains the claimed word (checked by the tools test).

**Checked:** links and previews tests (every new link resolves to a real heading and has a preview), paths and tools tests, the Data Structures and Operating Systems course tests, lint, the build.

### Round 10, student read-through: L1 to L5

Read each lesson in order as a first-time student who has only the earlier lessons, listing every place it confused, stalled or bored, then fixed the list. (Done in the same session as the earlier rounds, not a fresh one: see "not checked".)

**The list, with fixes:**
1. m1-01: "SWE-bench Verified: a benchmark" assumes the reader knows what a benchmark is. → glossed.
2. m2-01: Lecture 2 has four lessons and the first one doesn't say where the lecture is going. → a short "Lecture 2 in four lessons" roadmap with links.
3. m2-04: "feature stores", "MLOps" and "hyperparameters" appear with no explanation. → each glossed in a few words.
4. m3-01: the opening lists ISO 26262, ISO/SAE 21434 and "UN R155/R156" as bare names. → each says what it covers.
5. m3-02: "battery SOC" in the EV routing strategy. → "state of charge (SOC)".
6. m3-05: "ISO 8855" in the ObjectSensor contract. → "the standard coordinate system for vehicles".
7. m4-03: the UML notation figure faked the socket with a "⊂" character and had invisible ports, so lollipop vs socket was hard to see, the very thing it teaches. → a dedicated `UmlComponentNotation` drawing with a real circle, a real half-circle, labelled ports, readable at phone width.

**Read and found clear:** the flow from the AI case studies into Lecture 2's economics, the SOLID sequence (each principle ends by pointing at the next), the views lessons (each opens by naming its kind of structure), the Lecture 5 process → styles flow, and every practice lesson's "about these questions" note.

**Not checked:** a truly fresh read. The guide asks for a separate session that didn't build the course; this round was done by the same one, so round 11 (real readers) matters even more.

### Round 12, final quality review: whole course

Checked the course against the final-quality list in the original request, and ran the full checks: lint (0 errors; the 12 warnings are pre-existing in `src/components/ui`), all 3451 tests in 67 files, and the build (35 OG images, 294 pages).

| Requirement | Status | Evidence |
| --- | --- | --- |
| Faithful to the slides | ✓ | Round 2 checked all five lectures and the infographic slide by slide; additions are labelled as ours. |
| Lecture structure kept | ✓ | Five modules labelled Lecture 1 to Lecture 5, in slide order; the test checks the labels. |
| Difficult terms highlighted | ✓ | 153 highlights over 129 glossary terms; once per lesson, every key term highlighted, every entry used (tested). |
| Short definition popups | ✓ | Hover or tap; one shared glossary; each entry under 260 characters and names its lecture (tested); opens from the keyboard. |
| Student-friendly English | ✓ | Rounds 3, 4 and 10: common-mistake callouts in all 19 content lessons, long sentences split, jargon glossed. |
| Meaningful visualizations | ✓ | 69 diagrams and demos, each tied to a slide idea; phone width, both themes checked (round 6). |
| System and architecture diagrams used widely | ✓ | Architecture, UML class/component/package/deployment, sequence, process and topology diagrams in every lecture. |
| MCQ quizzes after each lecture | ✓ | 63 scored questions in the question bank, 11–13 per lecture, every content lesson covered (tested). |
| System and diagram questions | ✓ | 33 labelled questions, at least five of the eight types per lecture (tested). |
| Questions test understanding | ✓ | Mostly scenario, comparison, "which is NOT", design-decision and diagram questions; recall is the minority. |
| Every question explained | ✓ | Every question has an explanation (tested); the dilemmas have model answers labelled as written for the course. |

**What remains:**
- **Round 11, real readers.** Students need to use the course and report what didn't work: confusing terms, unclear diagrams, questions too easy or ambiguous. Its findings should start a new round of fixes here.
- **A fresh-session read-through.** Round 10 was done by the session that built the course; a separate reviewer would catch different things.
- **Upstream.** The course is on this fork's branch (and on `main` up to the merge after round 5). It reaches decoded.stack42.tech only through a pull request to STACK-42/decoded.

### Lecture 6 added: Architecting a Global Music Streaming Platform

The Week 6 slides (55 pages, a Spotify-style case study called "Streamify") arrived after round 12. Converted to text with markitdown (`_sources/advanced-software-engineering/Week_6_-_Architecting_a_Global_Music_Streaming_Platform.md`, clean text, no OCR needed); the diagram slides (process, C4 context and containers, client runtime, press-play sequence, layered client, both pipelines, the event bus, the integrated view, the traceability matrix) were read as images.

Built to the bar the other lectures reached after rounds 1 to 10, not as a thin skeleton:

**Lessons (m6-01 to m6-06):** Stage 1 requirements and quality scenarios; Stage 2 decomposition; Stage 3 elements, connectors, data stores and the press-play sequence; Stage 4 a style per subsystem (client-server, layered, historic P2P and its retirement, pipe-and-filter, messaging); the integrated architecture, four ADRs, ATAM-lite, the seven common mistakes, the five discussion questions with model answers (labelled as ours), and a summary of the activities and assignment; then Lecture 6 Practice.

**Source fidelity:** every slide is covered: drivers, stakeholders, FR1–FR10, the six-part scenario, QA1–QA8, C1–C5, the estimates and "numbers to decisions", the utility tree, C4 L1/L2, the five criteria, S1–S12, the traceability matrix (checked cell by cell against the slide image), both catalogs, polyglot persistence, the ten-step sequence, latency tactics, four derived constraints, the method and fit matrix, all five styles with justifications, trade-offs and rejected alternatives, the integrated view and ASR traceability, ADR-001 to ADR-004, sensitivity/trade-off points, risks.

**Terminology:** 30 new glossary entries (lecture 6), e.g. quality-attribute scenario, response measure, p99, utility tree, ATAM, C4 model, bounded context, information hiding, Conway's Law, CDN, BFF, DRM, polyglot persistence, at-least-once, idempotent, temporal coupling, sensitivity point, trade-off point, superseded. Each content lesson highlights its terms, lists key terms and has a common-mistake callout.

**Visualizations:** the four-stage process, the C4 context, the 12-subsystem container view, the ten-step press-play sequence diagram, layered client and service (tabs), P2P 2008 vs CDN 2014 (tabs), both pipe-and-filter pipelines (tabs), the event bus with topics, the integrated architecture; plus a new `EstimationCalculator` (sliders for users, peak share, bitrate and events; logic in `streamifyEstimate`, tested against the slide's 15 M, 2.4 Tbps, 2 PB and ~230 K/s).

**Practice:** 15 scored questions in the bank (every content lesson covered) and 7 labelled system/diagram questions covering all seven types except diagram interpretation (sequence, missing component, error detection, system interpretation, relationship, design decision, diagram construction).

**Connections:** links back to Lecture 2 (ADRs, Second Law), Lecture 3 (encapsulate what varies), Lecture 4 (C&C, module views) and Lecture 5 (process, client-server, P2P, layered, pipe-and-filter, messaging).

**Also changed:** the course's first lesson now opens with the epigraph the writing guide requires ("The only way to go fast, is to go well." Robert C. Martin, *Clean Architecture*, 2017), which was also the slides' prime directive.

**Source notes:**
- The deck's headers and footers say "Week 5" though the file is Week 6; the lessons call it Lecture 6, after Lecture 5's styles.
- Small slips on the slides: "FR6 The system could recommends", "FR8 shall be able to records", "F5" for FR5, "descreased". The lessons use corrected wording.

**Found but not fixed:**
- (Fixed in the follow-up below.) Several earlier lessons used `tone="sky"` for cross-reference notes, which the guide reserves for the formal view.
- (Fixed in the follow-up below.) Lecture 6 hadn't had its own plain-language and read-through rounds.

**Checked:** lint (0 errors), the course, question-bank, link, preview and paths/tools tests, the build (300 pages), and all six new pages at 390 px in dark theme (no overflow, no page errors; the calculator updates live).

### Lecture 6 review rounds, callout tones and epigraph check

**Lecture 6, plain language and student read-through:** scanned m6-01 to m6-06 for long sentences, hard words and em-dashes (none), then read them as a first-time student.
- Glossed jargon used without explanation: gapless playback, HSM (m6-03); circuit breakers, points of presence, CRUD, NAT, Avro/Protobuf (m6-04).
- Split five long sentences (m6-01 guiding question kept; m6-03 control path, m6-04 pipe vs topic, two in m6-05) and turned the activities paragraph into a list.
- Rounds 2 (source fidelity), 5 (terminology), 6 (visualizations), 7–8 (practice) and 9 (connections) were met when the lecture was written; the course tests enforce the terminology, coverage and question-type rules for it like every other lecture.

**Callout tones across the course** (writing guide: orange = trap, violet = why it exists, sky = formal view, mint = recap, neon = the one key insight): 14 callouts moved off `sky`. Cross-reference and roadmap notes → mint; "ISP vs SRP" and "messaging vs publish-subscribe" → orange (common confusions); "why this matters / who cares / why work assignment is architecture / connectors are first-class" → violet; "the surprising conclusion" (structure beats behavior) → neon. No `sky` callouts remain, since the course has no formal-notation views.

**Epigraph:** "The only way to go fast, is to go well." confirmed as Robert C. Martin's wording in chapter 1 of *Clean Architecture* (2017).

**Checked:** lint (0 errors), all 3504 tests, the build (300 pages).

**Still open:** round 11, real readers, for all six lectures.
