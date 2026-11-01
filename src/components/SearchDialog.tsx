import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildDocs, searchLessons, type IndexEntry } from "@/lib/search";

let indexRequest: Promise<IndexEntry[]> | null = null;

/** Fetched once, the first time search opens, so other visitors never download it. */
function loadIndex() {
  indexRequest ??= fetch("/search-index.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<IndexEntry[]>;
    })
    .catch(() => {
      indexRequest = null;
      return [];
    });
  return indexRequest;
}

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<IndexEntry[]>([]);

  useEffect(() => {
    if (open) void loadIndex().then(setIndex);
    else setQuery("");
  }, [open]);

  const docs = useMemo(() => buildDocs(index), [index]);
  const results = useMemo(() => searchLessons(query, docs), [query, docs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search lessons</DialogTitle>
        <DialogDescription className="sr-only">Search every lesson by title, heading or text.</DialogDescription>
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search lessons, like regex or paging…" />
          <CommandList className="max-h-[60vh]">
            {query.trim() !== "" && <CommandEmpty>No lessons match that.</CommandEmpty>}
            {results.map(({ doc, snippet }) => (
              <CommandItem
                key={`${doc.course}/${doc.lesson}`}
                value={`${doc.course}/${doc.lesson}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate(`/courses/${doc.course}/${doc.lesson}`);
                }}
                className="flex-col items-start gap-1 rounded-none border-b border-border px-4 py-3"
              >
                <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{doc.courseTitle}</span>
                <span className="font-display text-base font-semibold">{doc.title}</span>
                {snippet && <span className="line-clamp-2 font-body text-sm opacity-70">{snippet}</span>}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function SearchButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Search lessons"
        title="Search lessons (⌘K)"
        onClick={() => setOpen(true)}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search className="h-4 w-4" aria-hidden />
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
