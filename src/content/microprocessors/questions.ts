/* Question bank for this course. Ids are permanent: review history is keyed by them.
   Format and rules: docs/exams.md. */

import type { Question } from "@/lib/questions";

export const questions: Question[] = [
  {
    id: "microprocessors/final-quiz/q1",
    quiz: "final-quiz",
    prompt: "Why does the 8086 have an instruction queue?",
    options: [
      { id: "a", text: "To store a program permanently" },
      { id: "b", text: "So the BIU can fetch ahead while the EU is busy, instead of leaving the bus idle" },
      { id: "c", text: "To hold the results of the ALU" },
      { id: "d", text: "To extend the address bus" },
    ],
    correctOptionId: "b",
    explanation: "That overlap between fetching and executing is the 8086's two-stage pipeline.",
  },
  {
    id: "microprocessors/final-quiz/q2",
    quiz: "final-quiz",
    prompt: "AX = 1234h. What is in AL?",
    options: [
      { id: "a", text: "12h" },
      { id: "b", text: "34h" },
      { id: "c", text: "1234h" },
      { id: "d", text: "0034h" },
    ],
    correctOptionId: "b",
    explanation: "AL is the low byte, which is 34h. AH is the high byte, 12h.",
  },
  {
    id: "microprocessors/final-quiz/q3",
    quiz: "final-quiz",
    prompt: "After adding 100 + 50 in AL, which flag is set?",
    options: [
      { id: "a", text: "CF, because 150 doesn't fit in 8 bits" },
      { id: "b", text: "OF, because 150 is too big for a signed byte" },
      { id: "c", text: "ZF" },
      { id: "d", text: "None" },
    ],
    correctOptionId: "b",
    explanation: "150 fits in an unsigned byte, so CF is 0. As signed, the maximum is 127, so it overflows and OF is 1.",
  },
  {
    id: "microprocessors/final-quiz/q4",
    quiz: "final-quiz",
    prompt: "DS = 2000h and BX = 0150h. What physical address does [BX] use?",
    options: [
      { id: "a", text: "2150h" },
      { id: "b", text: "20150h" },
      { id: "c", text: "21500h" },
      { id: "d", text: "03500h" },
    ],
    correctOptionId: "b",
    explanation: "20000h + 0150h = 20150h. Shift the segment one hex digit left, then add.",
  },
  {
    id: "microprocessors/final-quiz/q5",
    quiz: "final-quiz",
    prompt: "Which of these is valid 8086 assembly?",
    options: [
      { id: "a", text: "MOV AX, [DX]" },
      { id: "b", text: "MOV [1000h], [2000h]" },
      { id: "c", text: "MOV AX, [BX+SI]" },
      { id: "d", text: "MOV AX, [SI+DI]" },
    ],
    correctOptionId: "c",
    explanation: "DX can't hold an address, memory-to-memory moves aren't allowed, and only one index register is permitted.",
  },
  {
    id: "microprocessors/final-quiz/q6",
    quiz: "final-quiz",
    prompt: "Which addressing mode fits a 2D table best?",
    options: [
      { id: "a", text: "Immediate" },
      { id: "b", text: "Register" },
      { id: "c", text: "Direct" },
      { id: "d", text: "Based-indexed with displacement" },
    ],
    correctOptionId: "d",
    explanation: "The base locates the table, the index selects the row and the displacement selects the column.",
  },
  {
    id: "microprocessors/final-quiz/q7",
    quiz: "final-quiz",
    prompt: "AL = 200 and you run CMP AL, 100. Which jump will be taken?",
    options: [
      { id: "a", text: "JA, but not JG" },
      { id: "b", text: "JG, but not JA" },
      { id: "c", text: "Both" },
      { id: "d", text: "Neither" },
    ],
    correctOptionId: "a",
    explanation: "As unsigned, 200 is above 100. As signed, those bits are -56, which isn't greater than 100.",
  },
  {
    id: "microprocessors/final-quiz/q8",
    quiz: "final-quiz",
    prompt: "SP = FFFEh. What is SP after PUSH AX?",
    options: [
      { id: "a", text: "FFFFh" },
      { id: "b", text: "FFFDh" },
      { id: "c", text: "FFFCh" },
      { id: "d", text: "0000h" },
    ],
    correctOptionId: "c",
    explanation: "The stack grows downward, and each entry takes 2 bytes.",
  },
  {
    id: "microprocessors/final-quiz/q9",
    quiz: "final-quiz",
    prompt: "What does CALL do that JMP doesn't?",
    options: [
      { id: "a", text: "It saves the return address on the stack" },
      { id: "b", text: "It sets the zero flag" },
      { id: "c", text: "It clears all the registers" },
      { id: "d", text: "It disables interrupts" },
    ],
    correctOptionId: "a",
    explanation: "RET later pops that address, which brings the program back to just after the CALL.",
  },
  {
    id: "microprocessors/final-quiz/q10",
    quiz: "final-quiz",
    prompt: "A hardware failure needs attention, even when a program has run CLI. Which input should it use?",
    options: [
      { id: "a", text: "INTR" },
      { id: "b", text: "NMI" },
      { id: "c", text: "RD" },
      { id: "d", text: "ALE" },
    ],
    correctOptionId: "b",
    explanation: "CLI only masks INTR. NMI can't be turned off by software.",
  },
];
