import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLesson } from "@/content/registry";

interface QuoteItem {
  quote: string;
  author: string;
  source: string;
  imageUrl?: string;
  /** "course/lesson" when the quote opens a lesson on the site. */
  lesson?: string;
}

const quotes: QuoteItem[] = [
  {
    quote:
      "The best programs are written so that computing machines can perform them quickly and so that human beings can understand them clearly. A programmer is ideally an essayist who works with traditional aesthetic and literary forms as well as mathematical concepts, to communicate the way that an algorithm works and to convince a reader that the results will be correct.",
    author: "Donald E. Knuth",
    source: "Selected Papers on Computer Science",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Donald_Ervin_Knuth_%28cropped%29.jpg/330px-Donald_Ervin_Knuth_%28cropped%29.jpg",
  },
  {
    quote:
      "Perhaps the central problem we face in all of computer science is how we are to get to the situation where we build on top of the work of others rather than redoing so much of it in a trivially different way.",
    author: "Richard Hamming",
    source: "One Man's View of Computer Science, 1968",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/08/Richard_Hamming.jpg",
  },
  {
    quote:
      "An algorithm is a finite answer to an infinite number of questions.",
    author: "Stephen Cole Kleene",
    source: "Introduction to Metamathematics",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Stephen_Cole_Kleene_circa_1963.tif/lossy-page1-330px-Stephen_Cole_Kleene_circa_1963.tif.jpg",
  },
  {
    quote:
      "The most important property of a program is whether it accomplishes the intention of its user.",
    author: "C.A.R. Hoare",
    source: "Essays in Computing Science",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Sir_Tony_Hoare_IMG_5125.jpg/330px-Sir_Tony_Hoare_IMG_5125.jpg",
  },
  {
    quote:
      "An understanding of every language-technical detail of a language feature or library component is neither necessary nor sufficient for writing good programs. In fact, an obsession with understanding every little detail is a prescription for awful, overelaborate and overly clever code.",
    author: "Bjarne Stroustrup",
    source: "The C++ Programming Language",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Bjarne_Stroustrup_%282013%29.jpg/330px-Bjarne_Stroustrup_%282013%29.jpg",
  },
  {
    quote:
      "The key to understanding complicated things is knowing what not to look at.",
    author: "Gerald Jay Sussman",
    source: "Structure and Interpretation of Computer Programs",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0e/Jerry_Sussman.jpg",
  },
  {
    quote:
      "Coding is to programming what typing is to writing. If you learn to program by learning to code, you essentially only know how to type.",
    author: "Leslie Lamport",
    source: "On Programming and Thinking",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Leslie_Lamport.jpg/330px-Leslie_Lamport.jpg",
  },
  {
    quote:
      "C is quirky, flawed, and an enormous success.",
    author: "Dennis M. Ritchie",
    source: "The Development of the C Language, 1993",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/Dennis_Ritchie_2011.jpg/330px-Dennis_Ritchie_2011.jpg",
  },
  {
    quote:
      "What's in your hands I think and hope is intelligence: the ability to see the machine as more than when you were first led up to it that you can make it more.",
    author: "Alan J. Perlis",
    source: "SICP Foreword, 1984",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/59/Alan_Perlis.jpg",
  },
  {
    quote:
      "I think it's not an accident that we often use the imagery of magic to describe programming. We speak of computing wizards and we think of things happening by magic or automagically. And I think that's because being able to get a machine to do what you want is the closest thing we've got in technology to adolescent wish-fulfillment.",
    author: "Guy Steele",
    source: "Growing a Language",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Guy_Steele.jpg/330px-Guy_Steele.jpg",
  },
  {
    quote:
      "Being a young programmer today must be awful: you can choose 20 different programming languages, dozens of frameworks and operating systems and you're paralyzed by choice. There was no paralysis of choice then. You just start doing it because the decision as to which language and things is just made. There's no thinking about what you should do, you just go and do it.",
    author: "Joe Armstrong",
    source: "Coders at Work",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/An_erlang_expert_and_some_guy_named_Joe_%284133214882%29.jpg/330px-An_erlang_expert_and_some_guy_named_Joe_%284133214882%29.jpg",
  },
  {
    quote:
      "The most depressing thing about life as a programmer, I think, is if you're faced with a chunk of code that either someone else wrote or, worse still, you wrote yourself but you no longer dare to modify. That's depressing.",
    author: "Simon Peyton Jones",
    source: "On Software Architecture and Purity",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Professor_Simon_Peyton_Jones_FRS_%28cropped%29.jpg/330px-Professor_Simon_Peyton_Jones_FRS_%28cropped%29.jpg",
  },
  {
    quote:
      "Building for scale that you don't need is a waste of effort and may lock you into an inflexible design.",
    author: "Martin Kleppmann",
    source: "Designing Data-Intensive Applications",
  },
  {
    quote:
      "If you aren't, at any given time, scandalized by code you wrote five or even three years ago, you're not learning anywhere near enough.",
    author: "Nick Black",
    source: "Axioms & Reflections",
  },
  {
    quote:
      "All we have to do is to place a series of bytes in RAM that represent a series of things that we want to do, one after another.",
    author: "J. Clark Scott",
    source: "But How Do It Know? The Basic Principles of Computers for Everyone",
  },
  {
    quote:
      "You don't train a neural network. You let it struggle, fail, adapt, and repeat: until its failures look like intelligence.",
    author: "Emmimal P. Alexander",
    source: "Neural Networks and Deep Learning with Python",
  },
  {
    quote:
      "Computer science is like learning to speak a new language, but instead of talking to people, you're talking to computers.",
    author: "Enamul Haque",
    source: "The Ultimate Modern Guide to Artificial Intelligence",
  },
  {
    quote:
      "The next world war is not gonna be a cold war, it's gonna be a code war.",
    author: "Abhijit Naskar",
    source: "Visvavatan: 100 Demilitarization Sonnets",
  },
  /* The epigraphs that open lessons, each linking back to its lesson. Keep in step with the <Epigraph> lines. */
  {
    quote:
      "While the first binary search was published in 1946, the first published binary search without bugs did not appear until 1962.",
    author: "Jon Bentley",
    source: "Programming Pearls, 1986",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/12/Jon_Bentley_informaticien.jpg",
    lesson: "algorithm-design-and-analysis/linear-and-binary-search",
  },
  {
    quote:
      "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%.",
    author: "Donald E. Knuth",
    source: "Structured Programming with go to Statements, 1974",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Donald_Ervin_Knuth_%28cropped%29.jpg/330px-Donald_Ervin_Knuth_%28cropped%29.jpg",
    lesson: "algorithm-design-and-analysis/counting-steps",
  },
  {
    quote:
      "I conclude that there are two ways of constructing a software design: One way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies. The first method is far more difficult.",
    author: "C.A.R. Hoare",
    source: "The Emperor's Old Clothes (ACM Turing Award Lecture), 1980",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Sir_Tony_Hoare_IMG_5125.jpg/330px-Sir_Tony_Hoare_IMG_5125.jpg",
    lesson: "algorithm-design-and-analysis/quick-sort",
  },
  {
    quote:
      "[The Euclidean algorithm] is the granddaddy of all algorithms, because it is the oldest nontrivial algorithm that has survived to the present day.",
    author: "Donald E. Knuth",
    source: "The Art of Computer Programming, Vol. 2, 1969",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Donald_Ervin_Knuth_%28cropped%29.jpg/330px-Donald_Ervin_Knuth_%28cropped%29.jpg",
    lesson: "algorithm-design-and-analysis/euclid-gcd",
  },
  {
    quote:
      "An algorithm must be seen to be believed, and the best way to learn what an algorithm is all about is to try it.",
    author: "Donald E. Knuth",
    source: "The Art of Computer Programming, Vol. 1, 1968",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Donald_Ervin_Knuth_%28cropped%29.jpg/330px-Donald_Ervin_Knuth_%28cropped%29.jpg",
    lesson: "algorithm-design-and-analysis/what-is-an-algorithm",
  },
  {
    quote:
      "Those who cannot remember the past are condemned to repeat it.",
    author: "George Santayana",
    source: "The Life of Reason, 1905",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/George_Santayana_at_Santo_Stefano_Rotondo_Convent_1947.png/330px-George_Santayana_at_Santo_Stefano_Rotondo_Convent_1947.png",
    lesson: "algorithm-design-and-analysis/dynamic-programming",
  },
  {
    quote:
      "The only way to go fast, is to go well.",
    author: "Robert C. Martin",
    source: "Clean Architecture, 2017",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Robert_C._Martin_surrounded_by_computers_%28cropped%29.jpg/330px-Robert_C._Martin_surrounded_by_computers_%28cropped%29.jpg",
    lesson: "advanced-software-engineering/engineering-in-the-age-of-ai",
  },
  {
    quote:
      "The purpose of computing is insight, not numbers.",
    author: "Richard Hamming",
    source: "Numerical Methods for Scientists and Engineers, 1962",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/08/Richard_Hamming.jpg",
    lesson: "computational-mathematics/matrices-and-matlab",
  },
  {
    quote:
      "A display connected to a digital computer gives us a chance to gain familiarity with concepts not realizable in the physical world. It is a looking glass into a mathematical wonderland.",
    author: "Ivan E. Sutherland",
    source: "The Ultimate Display, Proceedings of IFIP Congress, 1965",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Ivan_Sutherland_at_CHM.jpg/330px-Ivan_Sutherland_at_CHM.jpg",
    lesson: "computer-graphics/what-is-computer-graphics",
  },
  {
    quote:
      "Computer literacy is a contact with the activity of computing deep enough to make the computational equivalent of reading and writing fluent and enjoyable.",
    author: "Alan Kay",
    source: "Computer Software, Scientific American, 1984",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Alan_Kay_and_the_prototype_of_the_Dynabook_%283009206205%29.jpg/330px-Alan_Kay_and_the_prototype_of_the_Dynabook_%283009206205%29.jpg",
    lesson: "computer-literacy/physical-layer",
  },
  {
    quote:
      "The art of being wise is the art of knowing what to overlook.",
    author: "William James",
    source: "The Principles of Psychology, 1890",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/William_James_b1842c.jpg/330px-William_James_b1842c.jpg",
    lesson: "the-exam-mind/the-problem-with-how-you-study",
  },
  {
    quote:
      "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    author: "Alan Turing",
    source: "Computing Machinery and Intelligence (Mind), 1950",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/Alan_turing_header.jpg/330px-Alan_turing_header.jpg",
    lesson: "theory-of-computation/intro",
  },
  {
    quote:
      "The microprocessor is the old idea of computer recast in a single silicon chip.",
    author: "Federico Faggin",
    source: "Silicon, 2019",
    imageUrl:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Federico_Faggin_%28cropped%29.jpg/330px-Federico_Faggin_%28cropped%29.jpg",
    lesson: "microprocessors/inside-the-8086",
  },
];

function QuoteLessonLink({ path, visible }: { path: string; visible: boolean }) {
  const [course, slug] = path.split("/");
  const found = getLesson(course, slug);
  if (!found) return null;
  return (
    <Link
      to={`/courses/${path}`}
      className={`group mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      Opens the lesson <span className="text-foreground normal-case tracking-normal font-body italic text-sm">{found.lesson.title}</span>
      <span className="transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}

export function ProfoundQuotes() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % quotes.length);
        setFade(true);
      }, 600);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const current = quotes[index];

  return (
    <section className="relative z-10 border-t border-border bg-black/20">
      <div className="container py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Quote side */}
          <div>
            <div className="eyebrow mb-6 inline-block bg-neon px-2 py-1 text-[hsl(240_24%_5%)]">In their words</div>
            <div className="min-h-[220px] md:min-h-[260px] flex items-center">
              <blockquote
                className={`font-body text-xl md:text-2xl lg:text-[1.65rem] italic leading-relaxed text-foreground/90 transition-opacity duration-700 ease-in-out ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              >
                &ldquo;{current.quote}&rdquo;
              </blockquote>
            </div>
            {current.lesson && <QuoteLessonLink path={current.lesson} visible={fade} />}
          </div>

          {/* Square box side: Portrait or Typographic Attribution */}
          <div className="relative aspect-square border border-border bg-muted/5 flex items-center justify-center overflow-hidden group">
            <div className="absolute inset-0 grid-noise opacity-20 pointer-events-none z-10" aria-hidden />

            {current.imageUrl ? (
              <div
                className={`relative w-full h-full transition-opacity duration-700 ease-in-out ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={current.imageUrl}
                  alt={current.author}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover object-top grayscale contrast-125 brightness-90 transition duration-700 group-hover:grayscale-0"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-6 text-left z-20">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon mb-1">
                    Attribution
                  </div>
                  <div className="font-display text-xl md:text-2xl font-bold text-white tracking-tight">
                    {current.author}
                  </div>
                  <div className="font-body text-xs md:text-sm italic text-neutral-300 mt-1 line-clamp-1">
                    {current.source}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`relative z-10 text-center p-8 max-w-sm transition-opacity duration-700 ease-in-out ${
                  fade ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                  Attribution
                </div>
                <div className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {current.author}
                </div>
                <div className="font-body text-sm md:text-base italic text-muted-foreground mt-3 leading-snug">
                  {current.source}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
