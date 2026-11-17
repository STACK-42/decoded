/* Question bank for this course. Ids are permanent: review history is keyed by them.
   Format and rules: docs/exams.md. */

import type { Question } from "@/lib/questions";

export const questions: Question[] = [
  {
    id: "microprocessors/final-quiz/q1",
    quiz: "final-quiz",
    prompt: "Why does the 8086 have an instruction queue?",
    options: [
      { id: "a", text: "To store a program permanently in non-volatile memory" },
      { id: "b", text: "So the BIU can fetch ahead while the EU is busy, keeping the memory bus active" },
      { id: "c", text: "To hold intermediate mathematical results from the ALU" },
      { id: "d", text: "To expand physical address reach from 16 bits to 20 bits" },
    ],
    correctOptionId: "b",
    explanation:
      "The 6-byte instruction queue decouples memory access from instruction execution. Option b is correct because the Bus Interface Unit (BIU) prefetches upcoming instruction bytes across the bus whenever the queue has room, while the Execution Unit (EU) decodes and runs instructions internally. Option a is incorrect because the queue is a temporary volatile FIFO buffer, not permanent storage (ROM/disk). Option c is wrong because general registers and the accumulator hold ALU outputs. Option d is wrong because the segment-offset adder expands addresses, not the queue.",
  },
  {
    id: "microprocessors/final-quiz/q2",
    quiz: "final-quiz",
    prompt: "If register AX contains the value 1234h, what value is stored in AL?",
    options: [
      { id: "a", text: "12h" },
      { id: "b", text: "34h" },
      { id: "c", text: "1234h" },
      { id: "d", text: "0034h" },
    ],
    correctOptionId: "b",
    explanation:
      "AX is a 16-bit register split into two 8-bit halves: the high byte AH (bits 15 to 8) and the low byte AL (bits 7 to 0). In 1234h, the lower two hex digits (34h) form the low byte in AL, so option b is correct. Option a (12h) is AH. Option c (1234h) is the full 16-bit register AX. Option d is a 16-bit word rather than an 8-bit byte.",
  },
  {
    id: "microprocessors/final-quiz/q3",
    quiz: "final-quiz",
    prompt: "After adding 100 + 50 in 8-bit register AL, which flag is set to 1?",
    options: [
      { id: "a", text: "Carry Flag (CF), because 150 exceeds 8 bits" },
      { id: "b", text: "Overflow Flag (OF), because 150 exceeds the signed 8-bit limit" },
      { id: "c", text: "Zero Flag (ZF), because the result wrapped around" },
      { id: "d", text: "None, because both signed and unsigned math fit within a byte" },
    ],
    correctOptionId: "b",
    explanation:
      "100 + 50 = 150. In 8-bit unsigned arithmetic, values can range up to 255, so 150 fits easily without generating a carry out of bit 7 (CF = 0). But in 8-bit signed two's complement arithmetic, the valid range is -128 to +127. Because 150 exceeds +127, signed overflow occurs, and bit 7 flips to 1 (representing -106), setting OF = 1. Therefore option b is correct and option a is incorrect. Option c is incorrect because the result is non-zero (ZF = 0). Option d is wrong because signed limits were breached.",
  },
  {
    id: "microprocessors/final-quiz/q4",
    quiz: "final-quiz",
    prompt: "If DS = 2000h and BX = 0150h, what 20-bit physical address does the memory operand [BX] access?",
    options: [
      { id: "a", text: "2150h" },
      { id: "b", text: "20150h" },
      { id: "c", text: "21500h" },
      { id: "d", text: "03500h" },
    ],
    correctOptionId: "b",
    explanation:
      "The 8086 computes physical addresses using the formula: Base = Segment × 10h + Offset. Shifting segment 2000h left by 4 bits yields 20000h. Adding offset 0150h produces 20000h + 0150h = 20150h, making option b correct. Option a is wrong because it simply adds the 16-bit numbers without shifting the segment left by 4 bits. Option c is wrong because it shifts both numbers. Option d is an arbitrary arithmetic combination.",
  },
  {
    id: "microprocessors/final-quiz/q5",
    quiz: "final-quiz",
    prompt: "Which of the following is a valid 8086 assembly instruction?",
    options: [
      { id: "a", text: "MOV AX, [DX]" },
      { id: "b", text: "MOV [1000h], [2000h]" },
      { id: "c", text: "MOV AX, [BX+SI]" },
      { id: "d", text: "MOV AX, [SI+DI]" },
    ],
    correctOptionId: "c",
    explanation:
      "Option c is valid based-indexed addressing: it pairs one allowed base register (BX) with one allowed index register (SI). Option a is illegal because DX cannot serve as a base or index pointer in bracket notation (only BX, BP, SI, and DI can). Option b is illegal because 8086 machine instructions cannot perform memory-to-memory moves. Option d is illegal because memory operands can contain at most one index register, not two.",
  },
  {
    id: "microprocessors/final-quiz/q6",
    quiz: "final-quiz",
    prompt: "Which addressing mode best represents accessing a specific column in a row within a two-dimensional matrix (e.g., matrix[row][col])?",
    options: [
      { id: "a", text: "Immediate addressing" },
      { id: "b", text: "Register addressing" },
      { id: "c", text: "Direct addressing" },
      { id: "d", text: "Based-indexed with displacement addressing" },
    ],
    correctOptionId: "d",
    explanation:
      "In based-indexed with displacement addressing ([BX+SI+disp]), the base register (BX) holds the starting address of the matrix in memory, the index register (SI) selects the offset of the specific row, and the constant displacement (disp) selects the column offset within that row. This maps directly to 2D arrays, making option d correct. Option a uses literal constants encoded in the instruction. Option b operates strictly inside CPU registers without memory. Option c accesses a fixed single scalar variable at a static offset.",
  },
  {
    id: "microprocessors/final-quiz/q7",
    quiz: "final-quiz",
    prompt: "Register AL contains 200 (0C8h). The CPU executes CMP AL, 100. Which conditional branch is taken?",
    options: [
      { id: "a", text: "JA, but not JG" },
      { id: "b", text: "JG, but not JA" },
      { id: "c", text: "Both JA and JG" },
      { id: "d", text: "Neither JA nor JG" },
    ],
    correctOptionId: "a",
    explanation:
      "CMP performs the subtraction 200 - 100 = 100. In unsigned arithmetic, 200 is greater than 100, requiring no borrow (CF = 0, ZF = 0), so the unsigned jump JA (Jump if Above) is taken. In signed two's complement, 0C8h represents -56 because bit 7 is set. Because -56 is not greater than 100, the signed jump JG (Jump if Greater) is not taken. Therefore, option a is correct, and options b, c, and d are incorrect.",
  },
  {
    id: "microprocessors/final-quiz/q8",
    quiz: "final-quiz",
    prompt: "If the stack pointer SP contains FFFEh, what is the value of SP immediately after executing PUSH AX?",
    options: [
      { id: "a", text: "FFFFh" },
      { id: "b", text: "FFFDh" },
      { id: "c", text: "FFFCh" },
      { id: "d", text: "0000h" },
    ],
    correctOptionId: "c",
    explanation:
      "The 8086 stack grows downward in memory, toward lower addresses. PUSH first decrements SP by 2 bytes (the size of a 16-bit word) and then writes the data: FFFEh - 2 = FFFCh. Thus option c is correct. Option a represents an increment. Option b represents decrementing by only 1 byte, but the 8086 stack operates strictly in 16-bit words. Option d represents a zeroed pointer.",
  },
  {
    id: "microprocessors/final-quiz/q9",
    quiz: "final-quiz",
    prompt: "What does the CALL instruction do that a standard JMP instruction does not do?",
    options: [
      { id: "a", text: "It pushes the return address onto the stack before branching" },
      { id: "b", text: "It sets the Zero Flag to indicate subroutine entry" },
      { id: "c", text: "It clears all general-purpose registers to zero" },
      { id: "d", text: "It disables maskable hardware interrupts" },
    ],
    correctOptionId: "a",
    explanation:
      "A JMP instruction simply overwrites the instruction pointer (IP). A CALL instruction first decrements SP and pushes the address of the next instruction (the return address) onto the stack before updating IP with the target procedure address. When the procedure finishes, RET pops this return address back into IP to resume execution, making option a correct. Option b is incorrect because CALL does not modify flags. Option c is incorrect because registers retain their caller values. Option d is incorrect because CLI disables interrupts, not CALL.",
  },
  {
    id: "microprocessors/final-quiz/q10",
    quiz: "final-quiz",
    prompt: "A catastrophic power failure requires immediate CPU attention, even if software has executed CLI. Which input line must be asserted?",
    options: [
      { id: "a", text: "INTR" },
      { id: "b", text: "NMI" },
      { id: "c", text: "RD" },
      { id: "d", text: "ALE" },
    ],
    correctOptionId: "b",
    explanation:
      "NMI (Non-Maskable Interrupt) is an edge-triggered pin that the processor cannot ignore; it is hardwired to have higher priority than INTR and ignores the Interrupt Flag (IF). Running CLI clears IF and masks only the INTR pin. Therefore, emergency hardware events like power loss or parity errors use NMI, making option b correct and option a incorrect. Option c (RD) is an output read strobe, not an interrupt input. Option d (ALE) is an output strobe for address latching.",
  },
];
