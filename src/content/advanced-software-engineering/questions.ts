/* Question bank for this course. Ids are permanent: review history is keyed by them.
   Format and rules: docs/exams.md. The scored "Lecture N Practice" quizzes read from here;
   the system and diagram questions stay inline in each practice lesson as <Quiz practice>. */

import type { Question } from "@/lib/questions";

export const questions: Question[] = [
  {
    id: "advanced-software-engineering/lecture-1-practice/q1",
    quiz: "lecture-1-practice",
    lesson: "engineering-in-the-age-of-ai",
    prompt: "The course's core paradigm says architecture is…",
    options: [
      {
        id: "a",
        text: "the high-level diagrams drawn before any code is written"
      },
      {
        id: "b",
        text: "the decisions that are hard to change later"
      },
      {
        id: "c",
        text: "the choice of programming language and framework"
      },
      {
        id: "d",
        text: "whatever the most senior engineer decides"
      }
    ],
    correctOptionId: "b",
    explanation: "Architecture is defined by cost of change, not by level or by who decides. A language choice can be architectural (it's hard to change), but it's an example, not the definition. Diagrams are only a picture of the decisions."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q2",
    quiz: "lecture-1-practice",
    lesson: "engineering-in-the-age-of-ai",
    prompt: "An AI agent marks a coding task 'done' as soon as the project compiles, but a logic bug remains. Which failure from the case study is this?",
    options: [
      {
        id: "a",
        text: "Context rot"
      },
      {
        id: "b",
        text: "Overwhelmed execution"
      },
      {
        id: "c",
        text: "Premature victory"
      },
      {
        id: "d",
        text: "The scaling myth"
      }
    ],
    correctOptionId: "c",
    explanation: "Premature victory is declaring success on a weak signal like compilation. Context rot is losing earlier constraints as the context fills; overwhelmed execution is wasting tokens on too many tools and details; the scaling myth is a belief about models, not an agent failure."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q3",
    quiz: "lecture-1-practice",
    lesson: "engineering-in-the-age-of-ai",
    prompt: "Which harness mechanism most directly prevents premature victory?",
    options: [
      {
        id: "a",
        text: "Hard verification gates: automated tests and exit codes decide completion"
      },
      {
        id: "b",
        text: "Progressive tooling: load tool schemas only when needed"
      },
      {
        id: "c",
        text: "A larger context window"
      },
      {
        id: "d",
        text: "Writing feature_list.json"
      }
    ],
    correctOptionId: "a",
    explanation: "If only a passing test suite can mark work complete, the model can't declare victory on compilation alone. Progressive tooling fights overwhelmed execution; the task list organizes work but doesn't check it; a bigger window is the 'wait for GPT-N' answer."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q4",
    quiz: "lecture-1-practice",
    lesson: "engineering-in-the-age-of-ai",
    prompt: "In the initializer/worker pattern, how do worker agents know what earlier workers did?",
    options: [
      {
        id: "a",
        text: "They share one long context window"
      },
      {
        id: "b",
        text: "Through git commits and progress files such as NOTES.md"
      },
      {
        id: "c",
        text: "The initializer agent tells each worker over a chat channel"
      },
      {
        id: "d",
        text: "They don't; each worker redoes the whole task"
      }
    ],
    correctOptionId: "b",
    explanation: "Each worker starts with a fresh, clean context. State lives outside the model, in commits and notes, which is what keeps context rot away."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q5",
    quiz: "lecture-1-practice",
    lesson: "engineering-in-the-age-of-ai",
    prompt: "Which statement is NOT a lesson of the harness case study?",
    options: [
      {
        id: "a",
        text: "An LLM is the engine; the harness is the vehicle"
      },
      {
        id: "b",
        text: "Automated quality gates are still essential"
      },
      {
        id: "c",
        text: "Bigger models make software architecture unnecessary"
      },
      {
        id: "d",
        text: "Classical system design turns non-deterministic output into reliable software"
      }
    ],
    correctOptionId: "c",
    explanation: "That's the scaling myth the lecture rejects. The other three are the lecture's own conclusions."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q6",
    quiz: "lecture-1-practice",
    lesson: "case-study-ai-generated-pid",
    prompt: "In a PID controller, which term grows while a small error persists over time?",
    options: [
      {
        id: "a",
        text: "P, proportional"
      },
      {
        id: "b",
        text: "I, integral"
      },
      {
        id: "c",
        text: "D, derivative"
      },
      {
        id: "d",
        text: "None; all three react only to the current error"
      }
    ],
    correctOptionId: "b",
    explanation: "The integral term adds up past errors (the 'past' voice). P reacts to the error now; D reacts to how fast the error changes, acting as brakes."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q7",
    quiz: "lecture-1-practice",
    lesson: "case-study-ai-generated-pid",
    prompt: "Why did the AI-written unit tests pass even though the controller lost altitude?",
    options: [
      {
        id: "a",
        text: "The tests were written in a different language"
      },
      {
        id: "b",
        text: "Python can't represent 0.0000001"
      },
      {
        id: "c",
        text: "The tests came from the same model and didn't exercise long runs where the integral sum grows huge"
      },
      {
        id: "d",
        text: "The hardware-in-the-loop simulator was misconfigured"
      }
    ],
    correctOptionId: "c",
    explanation: "The bug only appears when the sum is very large, after hours. Short tests written by the same model shared its blind spot. 0.0000001 is representable on its own; it's the addition to a huge float32 that loses it."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q8",
    quiz: "lecture-1-practice",
    lesson: "case-study-ai-generated-pid",
    prompt: "The import yaml_config_parser was a real but malicious package. Which control would most directly have stopped it?",
    options: [
      {
        id: "a",
        text: "Using 64-bit floats"
      },
      {
        id: "b",
        text: "A dependency allow-list / checking every new package before installing it"
      },
      {
        id: "c",
        text: "A longer simulation run"
      },
      {
        id: "d",
        text: "Adding a derivative term"
      }
    ],
    correctOptionId: "b",
    explanation: "This is a supply chain attack via typosquatting. Only checking dependencies stops it. The other options address the numeric bug, a separate failure."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q1",
    quiz: "lecture-2-practice",
    lesson: "complexity-architecture-and-design",
    prompt: "A billing system copies the same discount rule into five modules, so every rule change needs five edits. What kind of complexity is this?",
    options: [
      {
        id: "a",
        text: "Essential complexity"
      },
      {
        id: "b",
        text: "Accidental complexity"
      },
      {
        id: "c",
        text: "Conformity"
      },
      {
        id: "d",
        text: "Invisibility"
      }
    ],
    correctOptionId: "b",
    explanation: "The rule itself may be essential, but copying it five times is self-inflicted: accidental complexity, which good engineering removes. Conformity and invisibility are Brooks' properties of software in general."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q2",
    quiz: "lecture-2-practice",
    lesson: "complexity-architecture-and-design",
    prompt: "Which of Brooks' properties explains why software is under constant pressure to change, unlike a building?",
    options: [
      {
        id: "a",
        text: "Complexity"
      },
      {
        id: "b",
        text: "Conformity"
      },
      {
        id: "c",
        text: "Changeability"
      },
      {
        id: "d",
        text: "Invisibility"
      }
    ],
    correctOptionId: "c",
    explanation: "Because code is perceived as malleable, everyone expects it to change. Conformity is about having to fit arbitrary human interfaces and rules."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q3",
    quiz: "lecture-2-practice",
    lesson: "complexity-architecture-and-design",
    prompt: "According to the lecture's definition, which detail belongs in the architecture rather than only in the design?",
    options: [
      {
        id: "a",
        text: "The name of a loop counter variable"
      },
      {
        id: "b",
        text: "A rule that the UI layer may never import the database package"
      },
      {
        id: "c",
        text: "Whether a method uses a for-loop or a stream"
      },
      {
        id: "d",
        text: "The indentation style"
      }
    ],
    correctOptionId: "b",
    explanation: "You need the import rule to reason about the system's qualities (modifiability, layering). The others are needed to build the code but not to reason about failures or qualities, so they're design details. Note the rule is small but still architectural."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q4",
    quiz: "lecture-2-practice",
    lesson: "the-economics-of-architecture",
    prompt: "In a healthy system, the cost of a change should depend on…",
    options: [
      {
        id: "a",
        text: "its scope only"
      },
      {
        id: "b",
        text: "its shape only"
      },
      {
        id: "c",
        text: "both scope and shape equally"
      },
      {
        id: "d",
        text: "how urgent it is"
      }
    ],
    correctOptionId: "a",
    explanation: "The cost-friction principle: cost proportional only to scope (logical size), never to shape (how it fits the structure). When shape drives cost, the architecture is decaying."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q5",
    quiz: "lecture-2-practice",
    lesson: "the-economics-of-architecture",
    prompt: "Program A works perfectly but is rigid and tightly coupled. Program B has bugs but is modular. According to the lecture, which survives longer and why?",
    options: [
      {
        id: "a",
        text: "A, because working software earns revenue"
      },
      {
        id: "b",
        text: "B, because fixing it is cheap, while A freezes when requirements change"
      },
      {
        id: "c",
        text: "Both equally; behavior and structure are worth the same"
      },
      {
        id: "d",
        text: "Neither; both must be rewritten"
      }
    ],
    correctOptionId: "b",
    explanation: "Case A succeeds now but dies when requirements shift (refactoring cost → infinity). Case B is 'immortal': its defects are cheap to fix. Structure is the greater value."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q6",
    quiz: "lecture-2-practice",
    lesson: "the-economics-of-architecture",
    prompt: "In the Eisenhower matrix, where does architecture belong, and what is the failure mode?",
    options: [
      {
        id: "a",
        text: "Quadrant 1; ignoring production bugs"
      },
      {
        id: "b",
        text: "Quadrant 2; letting urgent-but-trivial features (Q3) win over it"
      },
      {
        id: "c",
        text: "Quadrant 3; spending too long on it"
      },
      {
        id: "d",
        text: "Quadrant 4; it's a nice-to-have"
      }
    ],
    correctOptionId: "b",
    explanation: "Architecture is important but not urgent (Q2). Elevating Q3 features above it is what the lecture says destroys companies."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q7",
    quiz: "lecture-2-practice",
    lesson: "the-architects-role",
    prompt: "'Prefer asynchronous messaging' belongs to which dimension of the 4D model?",
    options: [
      {
        id: "a",
        text: "Structure"
      },
      {
        id: "b",
        text: "Architecture characteristics"
      },
      {
        id: "c",
        text: "Architecture decisions"
      },
      {
        id: "d",
        text: "Design principles"
      }
    ],
    correctOptionId: "d",
    explanation: "'Prefer' signals a directional guideline: a design principle. A hard constraint like 'the UI cannot query the DB' would be an architecture decision."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q8",
    quiz: "lecture-2-practice",
    lesson: "the-architects-role",
    prompt: "A new architect can read the diagrams of a system but can't tell why it uses an event store instead of a relational database. Which law is being violated by the original team?",
    options: [
      {
        id: "a",
        text: "First Law: everything is a trade-off"
      },
      {
        id: "b",
        text: "Second Law: why is more important than how"
      },
      {
        id: "c",
        text: "Cost-friction principle"
      },
      {
        id: "d",
        text: "Brooks' changeability property"
      }
    ],
    correctOptionId: "b",
    explanation: "The team recorded how but not why. ADRs would preserve the reasoning, so future teams don't dismantle the design's strengths."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q9",
    quiz: "lecture-2-practice",
    lesson: "ml-systems-in-production",
    prompt: "Which is NOT a good reason to use machine learning?",
    options: [
      {
        id: "a",
        text: "The rules change constantly, so hand-written code rots"
      },
      {
        id: "b",
        text: "The problem operates at massive scale"
      },
      {
        id: "c",
        text: "The law requires a full trace of the exact logic behind every decision"
      },
      {
        id: "d",
        text: "Humans can't write the if-statements for the mapping"
      }
    ],
    correctOptionId: "c",
    explanation: "Mandatory full interpretability is a reason NOT to use ML. The other three are the lecture's reasons for using it."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q10",
    quiz: "lecture-2-practice",
    lesson: "ml-systems-in-production",
    prompt: "How do ML systems typically fail, compared with traditional software?",
    options: [
      {
        id: "a",
        text: "Loudly, with stack traces"
      },
      {
        id: "b",
        text: "Silently: valid-looking outputs that are wrong or biased"
      },
      {
        id: "c",
        text: "Only when their dependencies change"
      },
      {
        id: "d",
        text: "They don't fail once trained"
      }
    ],
    correctOptionId: "b",
    explanation: "Silent failures are the defining ML risk; traditional software tends to fail loudly. ML also decays as data drifts, not only when dependencies change."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q1",
    quiz: "lecture-3-practice",
    lesson: "design-principles-and-srp",
    prompt: "A class is changed by the perception team, the diagnostics team and the HMI team. What does SRP say?",
    options: [
      {
        id: "a",
        text: "It's fine as long as the class is small"
      },
      {
        id: "b",
        text: "It has three responsibilities, because three actors can ask for changes"
      },
      {
        id: "c",
        text: "It violates OCP, not SRP"
      },
      {
        id: "d",
        text: "It should be made abstract"
      }
    ],
    correctOptionId: "b",
    explanation: "Responsibility = reason to change = actor. Three actors means three responsibilities, however small the class is."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q2",
    quiz: "lecture-3-practice",
    lesson: "design-principles-and-srp",
    prompt: "Applying the 'itself' test, which method should move OUT of FrontCamera?",
    options: [
      {
        id: "a",
        text: "captureFrame()"
      },
      {
        id: "b",
        text: "adjustExposure()"
      },
      {
        id: "c",
        text: "runSelfTest()"
      },
      {
        id: "d",
        text: "renderOnHud(frame)"
      }
    ],
    correctOptionId: "d",
    explanation: "'The FrontCamera renders on the HUD itself' sounds wrong: HUD drawing is HMI work and moves to HudRenderer. The other three are the camera's own hardware functions."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q3",
    quiz: "lecture-3-practice",
    lesson: "design-principles-and-srp",
    prompt: "MediaLibrary.search() reads artist, genre, source and year from other objects to decide matches. Which smell is this, and where should the logic go?",
    options: [
      {
        id: "a",
        text: "God class; into a new SearchManager"
      },
      {
        id: "b",
        text: "Feature envy; into TrackFilter.matches(), the class that owns the criteria"
      },
      {
        id: "c",
        text: "Fat interface; split TrackMetadata"
      },
      {
        id: "d",
        text: "No smell; the loop is fine"
      }
    ],
    correctOptionId: "b",
    explanation: "Using another object's data more than your own is feature envy. Information Expert says the class with the information (TrackFilter) should make the decision."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q4",
    quiz: "lecture-3-practice",
    lesson: "open-closed-principle",
    prompt: "After the OCP refactoring, adding Blind Spot Detection requires…",
    options: [
      {
        id: "a",
        text: "a new case in AdasFeatureManager's switch"
      },
      {
        id: "b",
        text: "one new class implementing AdasFunction, registered at the composition root"
      },
      {
        id: "c",
        text: "editing every existing feature class"
      },
      {
        id: "d",
        text: "no code at all"
      }
    ],
    correctOptionId: "b",
    explanation: "New behavior = new code. The manager stays untouched; only the composition root changes, which is why OCP is 'never 100% absolute'."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q5",
    quiz: "lecture-3-practice",
    lesson: "open-closed-principle",
    prompt: "The driver switches navigation from Fastest to Eco while driving. Which approach to OCP fits best?",
    options: [
      {
        id: "a",
        text: "Inheritance: a new NavigationService subclass per mode"
      },
      {
        id: "b",
        text: "Delegation with the Strategy pattern: swap the RoutingStrategy object at runtime"
      },
      {
        id: "c",
        text: "A switch statement on a mode string"
      },
      {
        id: "d",
        text: "Template Method"
      }
    ],
    correctOptionId: "b",
    explanation: "Runtime swapping is delegation's strength (binding time: runtime). Inheritance binds at build/config time; a switch violates OCP."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q6",
    quiz: "lecture-3-practice",
    lesson: "liskov-substitution-principle",
    prompt: "OccupancyGrid3D extends OccupancyGrid compiles and passes unit tests. Why does it still violate LSP?",
    options: [
      {
        id: "a",
        text: "Java doesn't allow overloading"
      },
      {
        id: "b",
        text: "The inherited isFree(x, y) has no clear meaning in 3D, so code written for the base type gets wrong answers"
      },
      {
        id: "c",
        text: "3D grids use more memory"
      },
      {
        id: "d",
        text: "It should be an interface instead of a class"
      }
    ],
    correctOptionId: "b",
    explanation: "LSP is about behavior, not signatures. The subtype weakens the base contract: callers can't know which layer is checked, causing missed barriers or phantom braking."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q7",
    quiz: "lecture-3-practice",
    lesson: "liskov-substitution-principle",
    prompt: "Which change to a subtype breaks LSP's contract rule?",
    options: [
      {
        id: "a",
        text: "Accepting a wider range of inputs than the base type"
      },
      {
        id: "b",
        text: "Guaranteeing more precise results than the base type"
      },
      {
        id: "c",
        text: "Requiring callers to pass an extra condition the base type didn't need"
      },
      {
        id: "d",
        text: "Adding a new method"
      }
    ],
    correctOptionId: "c",
    explanation: "That strengthens a precondition, which is forbidden. Weakening preconditions (a) and strengthening postconditions (b) are allowed."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q8",
    quiz: "lecture-3-practice",
    lesson: "interface-segregation-principle",
    prompt: "AutomatedDrivingStack returns false from areHandsOnWheel() because the interface forces it to. Which principle is violated?",
    options: [
      {
        id: "a",
        text: "SRP"
      },
      {
        id: "b",
        text: "OCP"
      },
      {
        id: "c",
        text: "ISP"
      },
      {
        id: "d",
        text: "DIP"
      }
    ],
    correctOptionId: "c",
    explanation: "A fat interface forces implementers to fake methods they don't support. Splitting it into client-specific interfaces (AttentionMonitorable, etc.) removes the dummy."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q9",
    quiz: "lecture-3-practice",
    lesson: "dependency-inversion-principle",
    prompt: "In the DIP fix, which package should contain the ObjectSensor interface?",
    options: [
      {
        id: "a",
        text: "sensors.suppliera, next to the radar driver"
      },
      {
        id: "b",
        text: "adas.fusion, the high-level policy package"
      },
      {
        id: "c",
        text: "test.sil"
      },
      {
        id: "d",
        text: "A shared utils package"
      }
    ],
    correctOptionId: "b",
    explanation: "The high-level module owns the abstraction, written in its own terms. That's what makes the source dependency point from details toward policy (the 'inversion')."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q10",
    quiz: "lecture-3-practice",
    lesson: "dependency-inversion-principle",
    prompt: "Which statement about Dependency Inversion and Dependency Injection is correct?",
    options: [
      {
        id: "a",
        text: "They are two names for the same thing"
      },
      {
        id: "b",
        text: "Inversion is the principle (depend on abstractions); injection is a wiring technique"
      },
      {
        id: "c",
        text: "Injection is the principle; inversion is the technique"
      },
      {
        id: "d",
        text: "Using injection automatically satisfies DIP"
      }
    ],
    correctOptionId: "b",
    explanation: "The lecture's 'crucial distinction'. You can inject a concrete supplier driver and still violate DIP, so (d) is false."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q1",
    quiz: "lecture-4-practice",
    lesson: "views-and-structures",
    prompt: "What is the difference between a structure and a view?",
    options: [
      {
        id: "a",
        text: "They are the same thing"
      },
      {
        id: "b",
        text: "A structure is the set of elements itself; a view is a representation of one or more structures"
      },
      {
        id: "c",
        text: "A view is the code; a structure is the diagram"
      },
      {
        id: "d",
        text: "Structures are runtime; views are static"
      }
    ],
    correctOptionId: "b",
    explanation: "Structure = the territory; view = a map of it. Option (c) gets it backwards."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q2",
    quiz: "lecture-4-practice",
    lesson: "views-and-structures",
    prompt: "Why can't a single view represent an architecture?",
    options: [
      {
        id: "a",
        text: "Diagrams can't be large enough"
      },
      {
        id: "b",
        text: "Architecture is a set of structures, and different views expose different qualities and relations"
      },
      {
        id: "c",
        text: "UML forbids it"
      },
      {
        id: "d",
        text: "It can, if it's detailed enough"
      }
    ],
    correctOptionId: "b",
    explanation: "The definition says 'set of structures'. A module view shows modifiability but not runtime performance; a deployment view the reverse."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q3",
    quiz: "lecture-4-practice",
    lesson: "views-and-structures",
    prompt: "A config file and a parser grammar file are…",
    options: [
      {
        id: "a",
        text: "components"
      },
      {
        id: "b",
        text: "connectors"
      },
      {
        id: "c",
        text: "implementation artifacts, belonging to the module (static) world"
      },
      {
        id: "d",
        text: "environmental elements"
      }
    ],
    correctOptionId: "c",
    explanation: "They exist at build time, not as running entities. Modules are units of implementation."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q4",
    quiz: "lecture-4-practice",
    lesson: "views-and-structures",
    prompt: "'Every module becomes exactly one component at runtime.' Is this true?",
    options: [
      {
        id: "a",
        text: "Yes, always"
      },
      {
        id: "b",
        text: "No: one module can become many components, and many modules can become one component"
      },
      {
        id: "c",
        text: "Only in client-server systems"
      },
      {
        id: "d",
        text: "Only for executables"
      }
    ],
    correctOptionId: "b",
    explanation: "The lecture answers 'No!': one Client module may run as ten client processes; many packages may compile into one running program."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q5",
    quiz: "lecture-4-practice",
    lesson: "module-views",
    prompt: "Which two constraints does the decomposition style impose?",
    options: [
      {
        id: "a",
        text: "No loops; each module has exactly one parent"
      },
      {
        id: "b",
        text: "Every module uses every other; no parents"
      },
      {
        id: "c",
        text: "Modules must be classes; at most two children"
      },
      {
        id: "d",
        text: "Loops allowed; multiple parents allowed"
      }
    ],
    correctOptionId: "a",
    explanation: "Those two constraints make every decomposition a tree, with is-part-of as its relation."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q6",
    quiz: "lecture-4-practice",
    lesson: "module-views",
    prompt: "Module A uses module B when…",
    options: [
      {
        id: "a",
        text: "A is inside B"
      },
      {
        id: "b",
        text: "A's correctness depends on B's correctness"
      },
      {
        id: "c",
        text: "A inherits from B"
      },
      {
        id: "d",
        text: "A and B run on the same machine"
      }
    ],
    correctOptionId: "b",
    explanation: "That's the lecture's definition of 'uses'. Inside = decomposition; inherits = generalization; same machine = deployment."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q7",
    quiz: "lecture-4-practice",
    lesson: "module-views",
    prompt: "Which view is the best tool for planning incremental development?",
    options: [
      {
        id: "a",
        text: "Uses view"
      },
      {
        id: "b",
        text: "Deployment view"
      },
      {
        id: "c",
        text: "Install view"
      },
      {
        id: "d",
        text: "Concurrency view"
      }
    ],
    correctOptionId: "a",
    explanation: "The uses graph shows what must work before what, so it tells you the build order and which subsets can be delivered."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q8",
    quiz: "lecture-4-practice",
    lesson: "component-and-connector-views",
    prompt: "A team wants to know which parts of a system can run in parallel and where they compete for a shared lock. Which view?",
    options: [
      {
        id: "a",
        text: "Decomposition view"
      },
      {
        id: "b",
        text: "Concurrency view (a C&C view)"
      },
      {
        id: "c",
        text: "Work assignment view"
      },
      {
        id: "d",
        text: "Data model view"
      }
    ],
    correctOptionId: "b",
    explanation: "The concurrency view exists to find parallelism and resource contention. It's a runtime question, so it's a C&C view."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q9",
    quiz: "lecture-4-practice",
    lesson: "component-and-connector-views",
    prompt: "In UML component notation, a lollipop (line ending in a circle) is…",
    options: [
      {
        id: "a",
        text: "a required interface"
      },
      {
        id: "b",
        text: "a provided interface"
      },
      {
        id: "c",
        text: "a port"
      },
      {
        id: "d",
        text: "a connector"
      }
    ],
    correctOptionId: "b",
    explanation: "Lollipop = provided; socket (half-circle) = required; port = the small square on the component's edge."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q10",
    quiz: "lecture-4-practice",
    lesson: "allocation-views",
    prompt: "The work assignment style maps…",
    options: [
      {
        id: "a",
        text: "components to hardware"
      },
      {
        id: "b",
        text: "components to files and folders"
      },
      {
        id: "c",
        text: "modules to teams and people"
      },
      {
        id: "d",
        text: "modules to processes"
      }
    ],
    correctOptionId: "c",
    explanation: "Deployment = components→hardware; install = components→files; work assignment = modules→teams, because teams write code."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q1",
    quiz: "lecture-5-practice",
    lesson: "architecture-process-and-styles",
    prompt: "Which three things does every architectural style define?",
    options: [
      {
        id: "a",
        text: "A vocabulary of design elements, configuration (topological) rules, and a semantic interpretation"
      },
      {
        id: "b",
        text: "A language, a framework and a database"
      },
      {
        id: "c",
        text: "Requirements, design and validation"
      },
      {
        id: "d",
        text: "Modules, components and allocations"
      }
    ],
    correctOptionId: "a",
    explanation: "Those are the 'basic properties of styles'. (c) is the architecture process; (d) the three kinds of structures."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q2",
    quiz: "lecture-5-practice",
    lesson: "architecture-process-and-styles",
    prompt: "Architecturally significant requirements are essentially…",
    options: [
      {
        id: "a",
        text: "the list of screens"
      },
      {
        id: "b",
        text: "the quality and non-functional requirements"
      },
      {
        id: "c",
        text: "the project budget"
      },
      {
        id: "d",
        text: "the database schema"
      }
    ],
    correctOptionId: "b",
    explanation: "Step 1 of the process: they come from functional and stakeholder requirements, and they are the qualities (performance, availability…) that drive the design."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q3",
    quiz: "lecture-5-practice",
    lesson: "architecture-process-and-styles",
    prompt: "In Step 2, what is the difference between 2a and 2b?",
    options: [
      {
        id: "a",
        text: "2a chooses the overall framework from known styles; 2b specifies the components and gives them responsibilities"
      },
      {
        id: "b",
        text: "2a writes code; 2b tests it"
      },
      {
        id: "c",
        text: "2a validates; 2b gathers requirements"
      },
      {
        id: "d",
        text: "There is no difference"
      }
    ],
    correctOptionId: "a",
    explanation: "Choose the architecture framework, then allocate components. Outputs: architecture views and the architecture document."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q4",
    quiz: "lecture-5-practice",
    lesson: "architecture-process-and-styles",
    prompt: "Why does the architecture process loop back from validation?",
    options: [
      {
        id: "a",
        text: "Because it is iterative: validation can reveal problems in the design or requirements"
      },
      {
        id: "b",
        text: "Because validation always fails the first time"
      },
      {
        id: "c",
        text: "To add more features"
      },
      {
        id: "d",
        text: "It doesn't loop"
      }
    ],
    correctOptionId: "a",
    explanation: "The lecture's outline marks the process as iterative, with feedback from validation to design and requirements."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q5",
    quiz: "lecture-5-practice",
    lesson: "n-tier-client-server-and-peer-to-peer",
    prompt: "In n-tier client-server, how can availability be improved?",
    options: [
      {
        id: "a",
        text: "Put all tiers on one machine"
      },
      {
        id: "b",
        text: "Replicate the servers in each tier"
      },
      {
        id: "c",
        text: "Remove the business logic tier"
      },
      {
        id: "d",
        text: "Use a thicker client"
      }
    ],
    correctOptionId: "b",
    explanation: "The lecture: 'servers in each tier could be replicated.' One machine creates a single point of failure."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q6",
    quiz: "lecture-5-practice",
    lesson: "n-tier-client-server-and-peer-to-peer",
    prompt: "Which is the defining property of peer-to-peer?",
    options: [
      {
        id: "a",
        text: "A central server answers all requests"
      },
      {
        id: "b",
        text: "All processes play similar roles, acting as both client and server"
      },
      {
        id: "c",
        text: "Data flows through a chain of filters"
      },
      {
        id: "d",
        text: "Messages wait in a queue"
      }
    ],
    correctOptionId: "b",
    explanation: "Peers cooperate without a client/server distinction. Napster's central index server is a hybrid."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q7",
    quiz: "lecture-5-practice",
    lesson: "pipe-and-filter-and-messaging",
    prompt: "What is the style invariant of pipe-and-filter?",
    options: [
      {
        id: "a",
        text: "Filters share a common database"
      },
      {
        id: "b",
        text: "Filters are independent: no shared state"
      },
      {
        id: "c",
        text: "Each filter must finish before the next starts"
      },
      {
        id: "d",
        text: "There must be exactly three filters"
      }
    ],
    correctOptionId: "b",
    explanation: "Independence is what makes filters reusable and reorderable. (c) is false: filters can run concurrently."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q8",
    quiz: "lecture-5-practice",
    lesson: "pipe-and-filter-and-messaging",
    prompt: "After a client writes a message to a queue in the messaging style, it…",
    options: [
      {
        id: "a",
        text: "waits for the server's reply"
      },
      {
        id: "b",
        text: "continues without waiting for the message to be removed"
      },
      {
        id: "c",
        text: "deletes the message"
      },
      {
        id: "d",
        text: "blocks the queue"
      }
    ],
    correctOptionId: "b",
    explanation: "That is asynchronous communication, the key property of messaging."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q9",
    quiz: "lecture-5-practice",
    lesson: "ten-styles-at-a-glance",
    prompt: "A browser runs your handler automatically when a button is clicked, though your code never called it. Which style?",
    options: [
      {
        id: "a",
        text: "Client-server"
      },
      {
        id: "b",
        text: "Implicit invocation"
      },
      {
        id: "c",
        text: "Pipe-and-filter"
      },
      {
        id: "d",
        text: "Microservices"
      }
    ],
    correctOptionId: "b",
    explanation: "addEventListener registers interest; the event triggers the procedure: implicit invocation (the infographic's DOM example)."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q10",
    quiz: "lecture-5-practice",
    lesson: "ten-styles-at-a-glance",
    prompt: "Which is NOT a typical drawback of microservices?",
    options: [
      {
        id: "a",
        text: "Distributed-system complexity"
      },
      {
        id: "b",
        text: "Hard data consistency"
      },
      {
        id: "c",
        text: "High DevOps and monitoring effort"
      },
      {
        id: "d",
        text: "Services can't be deployed independently"
      }
    ],
    correctOptionId: "d",
    explanation: "Independent deployment is microservices' main advantage, not a drawback."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q9",
    quiz: "lecture-1-practice",
    lesson: "engineering-in-the-age-of-ai",
    prompt: "What does the lecture mean by 'architectural inversion' in the harness case study?",
    options: [
      {
        id: "a",
        text: "Workers call the initializer instead of the other way round"
      },
      {
        id: "b",
        text: "The intelligence lives not only in the model's weights but in the deterministic harness that constrains, coordinates and verifies it"
      },
      {
        id: "c",
        text: "Dependencies point from low-level code to high-level code"
      },
      {
        id: "d",
        text: "The model is trained on its own output"
      }
    ],
    correctOptionId: "b",
    explanation: "It inverts where we look for intelligence: from the model alone to the system around it. Option (c) describes Dependency Inversion from Lecture 3, a different idea with a similar name."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q10",
    quiz: "lecture-1-practice",
    lesson: "engineering-in-the-age-of-ai",
    prompt: "Compare the two questions the Anthropic team asked. Which shift led to the breakthrough?",
    options: [
      {
        id: "a",
        text: "From 'how do we build a harness?' to 'how do we make the model smarter?'"
      },
      {
        id: "b",
        text: "From 'how do we make the model smarter?' to 'how do we build a deterministic system to keep the model on track?'"
      },
      {
        id: "c",
        text: "From 'which benchmark?' to 'which programming language?'"
      },
      {
        id: "d",
        text: "From 'more tools' to 'more parameters'"
      }
    ],
    correctOptionId: "b",
    explanation: "The breakthrough came from engineering around the model, not from waiting for a smarter one. (a) is the shift in the wrong direction; 'more parameters' is the scaling myth."
  },
  {
    id: "advanced-software-engineering/lecture-1-practice/q11",
    quiz: "lecture-1-practice",
    lesson: "case-study-ai-generated-pid",
    prompt: "Which statement about the float32 integral bug is NOT correct?",
    options: [
      {
        id: "a",
        text: "Near 100000, float32 values are about 0.0078 apart"
      },
      {
        id: "b",
        text: "Adding 0.0000001 to 100000 in float32 leaves 100000"
      },
      {
        id: "c",
        text: "The bug raised an overflow exception that was ignored"
      },
      {
        id: "d",
        text: "Short unit tests didn't reach the large sums where the bug appears"
      }
    ],
    correctOptionId: "c",
    explanation: "Nothing was raised: the correction was silently rounded away, which is why the lecture calls it a silent logic bug. The other three statements are true."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q11",
    quiz: "lecture-2-practice",
    lesson: "the-architects-role",
    prompt: "Pets.com and the 2002 data center are two case studies. What do they teach together?",
    options: [
      {
        id: "a",
        text: "Microservices are always wrong"
      },
      {
        id: "b",
        text: "Scale must be designed in from the start, and which styles make sense depends on the era's costs"
      },
      {
        id: "c",
        text: "Marketing budgets should be cut"
      },
      {
        id: "d",
        text: "Databases should never be shared"
      }
    ],
    correctOptionId: "b",
    explanation: "Pets.com: elastic scale can't be added later. 2002: 50 isolated services cost millions in licences then, almost nothing with containers now. Both say architecture depends on context."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q12",
    quiz: "lecture-2-practice",
    lesson: "the-architects-role",
    prompt: "An architect writes a custom linter that fails the build when a UI module imports the database layer. Which expectation and which tool is this?",
    options: [
      {
        id: "a",
        text: "Keep current with trends; an ADR"
      },
      {
        id: "b",
        text: "Ensure compliance; a fitness function"
      },
      {
        id: "c",
        text: "Navigate politics; a POC"
      },
      {
        id: "d",
        text: "Diverse exposure; Scrum"
      }
    ],
    correctOptionId: "b",
    explanation: "Automated checks that the architecture is followed are fitness functions, the means to 'ensure compliance'. It is also one of the four hands-on strategies (developer tooling)."
  },
  {
    id: "advanced-software-engineering/lecture-2-practice/q13",
    quiz: "lecture-2-practice",
    lesson: "the-architects-role",
    prompt: "Which is the best way for an architect to stay hands-on, according to the lecture?",
    options: [
      {
        id: "a",
        text: "Take ownership of the core framework on the critical path"
      },
      {
        id: "b",
        text: "Build developer tooling, POCs and low-priority technical-debt stories"
      },
      {
        id: "c",
        text: "Stop coding to focus on diagrams"
      },
      {
        id: "d",
        text: "Review every pull request personally before merge"
      }
    ],
    correctOptionId: "b",
    explanation: "Hands-on work must stay off the critical path, or the architect becomes the bottleneck. Stopping coding makes an 'ivory tower' architect; reviewing every PR is another bottleneck."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q11",
    quiz: "lecture-3-practice",
    lesson: "open-closed-principle",
    prompt: "Compare inheritance and delegation as ways to satisfy OCP. Which pairing is correct?",
    options: [
      {
        id: "a",
        text: "Inheritance: binds at runtime; delegation: binds at compile time"
      },
      {
        id: "b",
        text: "Inheritance: binds at build/config time; delegation: can be swapped at runtime"
      },
      {
        id: "c",
        text: "Both require editing the existing service"
      },
      {
        id: "d",
        text: "Neither adds new classes"
      }
    ],
    correctOptionId: "b",
    explanation: "From the lecture's table: inheritance plugs in a subtype at build/config time; delegation (Strategy) swaps the object at runtime. In both, new behavior is new code and the service isn't edited."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q12",
    quiz: "lecture-3-practice",
    lesson: "interface-segregation-principle",
    prompt: "Which is NOT a benefit of splitting VehicleOperator into MotionControl, AttentionMonitorable, SelfDiagnosable and OtaUpdatable?",
    options: [
      {
        id: "a",
        text: "The OTA manager can no longer reach steer() or brake()"
      },
      {
        id: "b",
        text: "Dummy methods returning null or false disappear"
      },
      {
        id: "c",
        text: "DMS changes no longer force re-testing motion control"
      },
      {
        id: "d",
        text: "The vehicle needs fewer sensors"
      }
    ],
    correctOptionId: "d",
    explanation: "ISP changes the software's dependencies, not the hardware. The other three are the lecture's listed gains: smaller attack surface, no dummies, independent lifecycles."
  },
  {
    id: "advanced-software-engineering/lecture-3-practice/q13",
    quiz: "lecture-3-practice",
    lesson: "design-principles-and-srp",
    prompt: "A team merges perception (ASIL B) and flash logging (QM) into one class to save 3.5 ms. What is the main risk the lecture points to?",
    options: [
      {
        id: "a",
        text: "The class becomes too long to read"
      },
      {
        id: "b",
        text: "The non-safety logging can interfere with safety-critical perception, breaking Freedom From Interference"
      },
      {
        id: "c",
        text: "Java can't run two jobs in one class"
      },
      {
        id: "d",
        text: "Logging will become faster"
      }
    ],
    correctOptionId: "b",
    explanation: "Two actors in one class is an SRP violation, and sharing memory and execution context lets QM code disturb ASIL B code. That is why the 3.5 ms is worth paying."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q11",
    quiz: "lecture-4-practice",
    lesson: "allocation-views",
    prompt: "You need to check whether the servers have enough memory for the components placed on them. Which view helps, and what must it record?",
    options: [
      {
        id: "a",
        text: "Uses view; which modules depend on which"
      },
      {
        id: "b",
        text: "Deployment view; memory each machine provides and memory each component requires"
      },
      {
        id: "c",
        text: "Work assignment view; team sizes"
      },
      {
        id: "d",
        text: "Decomposition view; package names"
      }
    ],
    correctOptionId: "b",
    explanation: "The lecture asks whether a deployment view can help with memory capacity analysis: yes, with properties of the physical units (provided) and of the software elements (required)."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q12",
    quiz: "lecture-4-practice",
    lesson: "component-and-connector-views",
    prompt: "Which question is best answered by a C&C view rather than a module view?",
    options: [
      {
        id: "a",
        text: "Which package is part of which subsystem?"
      },
      {
        id: "b",
        text: "Which classes inherit from which?"
      },
      {
        id: "c",
        text: "Which parts of the system are replicated at runtime?"
      },
      {
        id: "d",
        text: "Which team owns which module?"
      }
    ],
    correctOptionId: "c",
    explanation: "Replication is a runtime property, so it shows in C&C views. Part-of and inheritance are module views; team ownership is work assignment (allocation)."
  },
  {
    id: "advanced-software-engineering/lecture-4-practice/q13",
    quiz: "lecture-4-practice",
    lesson: "views-and-structures",
    prompt: "Which statement is NOT correct?",
    options: [
      {
        id: "a",
        text: "A view is a representation of one or more structures"
      },
      {
        id: "b",
        text: "Module structures, C&C structures and allocation structures are the three kinds"
      },
      {
        id: "c",
        text: "A deployment view mainly helps reason about modifiability"
      },
      {
        id: "d",
        text: "Different views expose different quality attributes"
      }
    ],
    correctOptionId: "c",
    explanation: "Deployment views mainly help with performance and availability. Modifiability is the strength of module views."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q11",
    quiz: "lecture-5-practice",
    lesson: "ten-styles-at-a-glance",
    prompt: "Messaging and publish-subscribe both use a broker. What is the key difference?",
    options: [
      {
        id: "a",
        text: "Messaging is synchronous; pub/sub is asynchronous"
      },
      {
        id: "b",
        text: "In a queue each message goes to one receiver; in pub/sub every subscriber to a topic gets a copy"
      },
      {
        id: "c",
        text: "Pub/sub needs no network"
      },
      {
        id: "d",
        text: "Messaging can't buffer messages"
      }
    ],
    correctOptionId: "b",
    explanation: "One consumer per message vs one copy per subscriber. Both are asynchronous and both buffer through the broker."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q12",
    quiz: "lecture-5-practice",
    lesson: "n-tier-client-server-and-peer-to-peer",
    prompt: "Which is a typical drawback of peer-to-peer compared with client-server?",
    options: [
      {
        id: "a",
        text: "A single point of failure at the server"
      },
      {
        id: "b",
        text: "It is hard to secure and manage, because you must trust unknown peers"
      },
      {
        id: "c",
        text: "It can't scale beyond one machine"
      },
      {
        id: "d",
        text: "Clients can't share resources"
      }
    ],
    correctOptionId: "b",
    explanation: "P2P removes the central server (so no single point of failure) and scales well, but trust, security and management get harder. The single point of failure is client-server's drawback."
  },
  {
    id: "advanced-software-engineering/lecture-5-practice/q13",
    quiz: "lecture-5-practice",
    lesson: "ten-styles-at-a-glance",
    prompt: "In the SOA triangle for web services, what is the correct order of steps?",
    options: [
      {
        id: "a",
        text: "Bind, publish, find"
      },
      {
        id: "b",
        text: "Find, bind, publish"
      },
      {
        id: "c",
        text: "The provider publishes, the consumer finds it in the registry, then the consumer binds to and invokes the provider"
      },
      {
        id: "d",
        text: "The registry calls the consumer"
      }
    ],
    correctOptionId: "c",
    explanation: "1. publish (provider → registry), 2. find (consumer → registry), 3. bind/invoke (consumer → provider), over SOAP or REST."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q1",
    quiz: "lecture-6-practice",
    lesson: "requirements-and-quality-scenarios",
    prompt: "Which requirement is written as a testable quality-attribute scenario?",
    options: [
      {
        id: "a",
        text: "The system should be fast"
      },
      {
        id: "b",
        text: "Playback should be quick and reliable"
      },
      {
        id: "c",
        text: "On a cache miss under normal load, playback starts in ≤ 250 ms (median), ≤ 1 s (p99)"
      },
      {
        id: "d",
        text: "Users love the app"
      }
    ],
    correctOptionId: "c",
    explanation: "Only (c) has a response measure, so it can be tested and compared across designs. 'Fast' and 'quick and reliable' are exactly the unmeasurable wording the lecture warns against."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q2",
    quiz: "lecture-6-practice",
    lesson: "requirements-and-quality-scenarios",
    prompt: "In a quality-attribute scenario, which part is 'the track is not in the local cache; normal load'?",
    options: [
      {
        id: "a",
        text: "Stimulus"
      },
      {
        id: "b",
        text: "Artifact"
      },
      {
        id: "c",
        text: "Environment"
      },
      {
        id: "d",
        text: "Response measure"
      }
    ],
    correctOptionId: "c",
    explanation: "The environment is the condition the system is in when the stimulus arrives. The stimulus is pressing play; the artifact is the playback path; the response measure is ≤ 250 ms."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q3",
    quiz: "lecture-6-practice",
    lesson: "requirements-and-quality-scenarios",
    prompt: "Peak egress is about 2.4 Tbps. What kind of problem is this, and what does the lecture say about 'add more servers'?",
    options: [
      {
        id: "a",
        text: "A compute problem; more servers fix it"
      },
      {
        id: "b",
        text: "A bandwidth problem; more servers don't solve it, caching and a CDN (historically P2P) do"
      },
      {
        id: "c",
        text: "A storage problem; add disks"
      },
      {
        id: "d",
        text: "Not a problem at all"
      }
    ],
    correctOptionId: "b",
    explanation: "15 M streams × 160 kbps is a bandwidth problem. The lecture's common mistake: first ask which resource is the bottleneck before choosing a solution."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q4",
    quiz: "lecture-6-practice",
    lesson: "requirements-and-quality-scenarios",
    prompt: "Which is a constraint rather than a quality attribute?",
    options: [
      {
        id: "a",
        text: "Playback starts in ≤ 250 ms"
      },
      {
        id: "b",
        text: "Licensing contracts require DRM and per-country rules"
      },
      {
        id: "c",
        text: "Stutter in < 1 % of plays"
      },
      {
        id: "d",
        text: "Cost per stream-hour grows sub-linearly"
      }
    ],
    correctOptionId: "b",
    explanation: "Constraints are non-negotiable limits you design within (C1). The others are quality scenarios that can be traded off against each other."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q5",
    quiz: "lecture-6-practice",
    lesson: "requirements-and-quality-scenarios",
    prompt: "Why are QA1, QA3, QA5, QA6 and C1 Streamify's architecturally significant requirements?",
    options: [
      {
        id: "a",
        text: "They were written first"
      },
      {
        id: "b",
        text: "In the utility tree they rate High for business importance and High for technical difficulty"
      },
      {
        id: "c",
        text: "They are the easiest to implement"
      },
      {
        id: "d",
        text: "Every requirement is an ASR"
      }
    ],
    correctOptionId: "b",
    explanation: "(H, H) items are the hardest and most valuable, so they're designed first. Treating everything as top priority means nothing is prioritised."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q6",
    quiz: "lecture-6-practice",
    lesson: "decomposing-streamify",
    prompt: "Which split is NOT justified by any of the lecture's decomposition criteria?",
    options: [
      {
        id: "a",
        text: "Separating Playlists from Identity because each owns its own data"
      },
      {
        id: "b",
        text: "Hiding the DRM vendor behind a stable interface"
      },
      {
        id: "c",
        text: "Separating latency-critical audio delivery from throughput-oriented analytics"
      },
      {
        id: "d",
        text: "Putting all Java code in one box and all database code in another"
      }
    ],
    correctOptionId: "d",
    explanation: "Splitting by technology layer has no criterion behind it. The others use bounded context, information hiding and different quality profiles."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q7",
    quiz: "lecture-6-practice",
    lesson: "decomposing-streamify",
    prompt: "FR8 (record every play) involves S1, S9, S10 and S12. What does that show?",
    options: [
      {
        id: "a",
        text: "S1 is doing too little"
      },
      {
        id: "b",
        text: "Recording a play is a data flow across subsystems, not one feature in one box"
      },
      {
        id: "c",
        text: "The decomposition is wrong"
      },
      {
        id: "d",
        text: "FR8 should be removed"
      }
    ],
    correctOptionId: "b",
    explanation: "S1 logs → S9 carries → S10 analyses → S12 pays. The traceability matrix makes this visible."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q8",
    quiz: "lecture-6-practice",
    lesson: "elements-and-press-play",
    prompt: "In the press-play sequence, why does step ⑩ (log PlayStarted) go to the bus asynchronously?",
    options: [
      {
        id: "a",
        text: "Because the bus is slow"
      },
      {
        id: "b",
        text: "So telemetry never blocks playback and QA1's 250 ms budget holds (derived constraint 1)"
      },
      {
        id: "c",
        text: "Because events aren't important"
      },
      {
        id: "d",
        text: "To save storage"
      }
    ],
    correctOptionId: "b",
    explanation: "Asynchronous logging is a latency tactic. The events still matter for royalties, which is why the bus is durable (QA5)."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q9",
    quiz: "lecture-6-practice",
    lesson: "elements-and-press-play",
    prompt: "Which store fits user accounts and billing, according to the polyglot-persistence table?",
    options: [
      {
        id: "a",
        text: "Object storage + CDN"
      },
      {
        id: "b",
        text: "A relational database, for transactions"
      },
      {
        id: "c",
        text: "A search engine"
      },
      {
        id: "d",
        text: "An append-only event log"
      }
    ],
    correctOptionId: "b",
    explanation: "Money needs strong consistency and transactions. Audio goes to object storage, search to an inverted index, events to a distributed log."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q10",
    quiz: "lecture-6-practice",
    lesson: "choosing-styles-per-subsystem",
    prompt: "S7 audio delivery appears twice in the style fit matrix. Why?",
    options: [
      {
        id: "a",
        text: "A copy-paste error"
      },
      {
        id: "b",
        text: "The same subsystem and requirement (QA1) used hybrid P2P from 2008 and client-server via CDN from ~2014, because the context changed"
      },
      {
        id: "c",
        text: "Audio delivery needs two styles at once"
      },
      {
        id: "d",
        text: "One row is for premium users"
      }
    ],
    correctOptionId: "b",
    explanation: "Constraint C5 (expensive bandwidth) weakened and mobile became dominant, so ADR-004 superseded ADR-001."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q11",
    quiz: "lecture-6-practice",
    lesson: "choosing-styles-per-subsystem",
    prompt: "Which statement about layered vs. client-server is correct?",
    options: [
      {
        id: "a",
        text: "You must choose one of them"
      },
      {
        id: "b",
        text: "Layered answers how code is organised (module view); client-server answers how running parts interact (C&C view), so they are combined"
      },
      {
        id: "c",
        text: "Client-server is a kind of layering"
      },
      {
        id: "d",
        text: "Layered is only for frontends"
      }
    ],
    correctOptionId: "b",
    explanation: "Common mistake #4. Streamify uses layering inside the client and inside each service, and client-server between them."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q12",
    quiz: "lecture-6-practice",
    lesson: "choosing-styles-per-subsystem",
    prompt: "How does Streamify get 'effectively once' processing of play events from an at-least-once bus?",
    options: [
      {
        id: "a",
        text: "The bus never duplicates"
      },
      {
        id: "b",
        text: "Unique event IDs plus idempotent consumers that remove duplicates"
      },
      {
        id: "c",
        text: "By switching to synchronous REST"
      },
      {
        id: "d",
        text: "By deleting old events"
      }
    ],
    correctOptionId: "b",
    explanation: "At-least-once + dedupe = effectively once: the bus guarantees nothing is lost, and the royalty aggregator removes duplicates."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q13",
    quiz: "lecture-6-practice",
    lesson: "choosing-styles-per-subsystem",
    prompt: "Why was pure P2P never an option for Streamify?",
    options: [
      {
        id: "a",
        text: "Peers are too slow"
      },
      {
        id: "b",
        text: "Licensing, authentication and royalties need a central authority that untrusted peers can't provide"
      },
      {
        id: "c",
        text: "P2P can't send audio"
      },
      {
        id: "d",
        text: "It was too cheap"
      }
    ],
    correctOptionId: "b",
    explanation: "That's why the 2008 design was hybrid: servers kept authority, first chunks and fallback. Common mistake #7."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q14",
    quiz: "lecture-6-practice",
    lesson: "integrated-architecture-and-evaluation",
    prompt: "Which is a trade-off point rather than a sensitivity point?",
    options: [
      {
        id: "a",
        text: "Client cache size"
      },
      {
        id: "b",
        text: "The CDN cache-hit ratio"
      },
      {
        id: "c",
        text: "At-least-once messaging: improves reliability, but needs dedupe and adds complexity"
      },
      {
        id: "d",
        text: "The partitioning key of event topics"
      }
    ],
    correctOptionId: "c",
    explanation: "A trade-off point helps one quality and hurts another. The other three are single parameters with a strong effect: sensitivity points."
  },
  {
    id: "advanced-software-engineering/lecture-6-practice/q15",
    quiz: "lecture-6-practice",
    lesson: "integrated-architecture-and-evaluation",
    prompt: "What makes ADR-002 the 'strongest form' of ADR in the lecture?",
    options: [
      {
        id: "a",
        text: "It is the longest"
      },
      {
        id: "b",
        text: "It lists three rejected alternatives, each with a reason"
      },
      {
        id: "c",
        text: "It was written first"
      },
      {
        id: "d",
        text: "It has no consequences section"
      }
    ],
    correctOptionId: "b",
    explanation: "Rejected alternatives with reasons let reviewers see what was considered. Context → decision → consequences, plus the alternatives."
  }
];
