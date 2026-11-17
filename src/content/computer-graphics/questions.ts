/* Question bank for this course. Ids are permanent: review history is keyed by them.
   Format and rules: docs/exams.md. */

import type { Question } from "@/lib/questions";

export const questions: Question[] = [
  {
    id: "computer-graphics/images-quiz/q1",
    quiz: "images-quiz",
    prompt: "A program reads an image with the wrong row width. What do you see?",
    options: [
      { id: "a", text: "A blank image" },
      { id: "b", text: "The right pixels in the wrong places, so the picture leans sideways" },
      { id: "c", text: "The image in the wrong colors" },
      { id: "d", text: "A smaller copy of the image" },
    ],
    correctOptionId: "b",
    explanation:
      "Because images are stored in row-major order, every pixel value is read, but each line starts at the wrong horizontal offset, shearing the image diagonally. The image is not blank because the data is read, colors remain unchanged, and the overall pixel count does not shrink into a miniature copy.",
  },
  {
    id: "computer-graphics/images-quiz/q2",
    quiz: "images-quiz",
    prompt: "How many colors can a 4-bit pixel show?",
    options: [
      { id: "a", text: "4" },
      { id: "b", text: "8" },
      { id: "c", text: "16" },
      { id: "d", text: "256" },
    ],
    correctOptionId: "c",
    explanation:
      "A bit depth of n bits per pixel represents 2ⁿ distinct states. For 4 bits, 2⁴ = 16 colors. 4 is the bit count itself, 8 is 2³, and 256 requires 8 bits (2⁸).",
  },
  {
    id: "computer-graphics/images-quiz/q3",
    quiz: "images-quiz",
    prompt: "In an 8-bit grayscale image, what does the pixel value 0 mean?",
    options: [
      { id: "a", text: "White" },
      { id: "b", text: "Black" },
      { id: "c", text: "Transparent" },
      { id: "d", text: "The first color in the palette" },
    ],
    correctOptionId: "b",
    explanation:
      "In grayscale, 0 represents minimum light intensity (black) and 255 represents maximum intensity (white). Transparency requires a dedicated alpha channel, and palette lookup applies to indexed color rather than grayscale.",
  },
  {
    id: "computer-graphics/images-quiz/q4",
    quiz: "images-quiz",
    prompt: "Why does 16-bit high color give green 6 bits and red and blue 5?",
    options: [
      { id: "a", text: "Green needs more memory" },
      { id: "b", text: "Eyes are most sensitive to green, and 16 bits don't split evenly into three" },
      { id: "c", text: "Green is the brightest LED" },
      { id: "d", text: "It's a mistake kept for compatibility" },
    ],
    correctOptionId: "b",
    explanation:
      "16 bits cannot divide equally into three color channels. The 5-6-5 layout gives the extra bit to green because human eyes are most sensitive to green light, making steps in green brightness easiest to notice. Memory needs and LED brightness do not dictate channel bit counts.",
  },
  {
    id: "computer-graphics/images-quiz/q5",
    quiz: "images-quiz",
    prompt: "A pixel has alpha 255. How does it look when drawn over a background?",
    options: [
      { id: "a", text: "Invisible" },
      { id: "b", text: "Half see-through" },
      { id: "c", text: "Fully opaque: the background doesn't show through" },
      { id: "d", text: "It depends on the red channel" },
    ],
    correctOptionId: "c",
    explanation:
      "Alpha measures opacity from 0 (completely transparent) to 255 (completely opaque). At alpha 255, the foreground pixel completely replaces the background. Invisible corresponds to alpha 0, half see-through to alpha 128, and alpha is independent of the red channel.",
  },
  {
    id: "computer-graphics/images-quiz/q6",
    quiz: "images-quiz",
    prompt: "How big is an uncompressed 800 × 600 true color (24-bit) image?",
    options: [
      { id: "a", text: "468.75 KB" },
      { id: "b", text: "1406.25 KB" },
      { id: "c", text: "1875 KB" },
      { id: "d", text: "480,000 KB" },
    ],
    correctOptionId: "b",
    explanation:
      "800 × 600 = 480,000 pixels. At 24 bits (3 bytes) per pixel, total bytes = 480,000 × 3 = 1,440,000 bytes. Dividing by 1024 yields 1406.25 KB. 468.75 KB forgets to multiply by 3 bytes per pixel, 1875 KB multiplies by 4 bytes (32-bit), and 480,000 KB confuses pixels with kilobytes.",
  },
  {
    id: "computer-graphics/images-quiz/q7",
    quiz: "images-quiz",
    prompt: "The same image is stored at 8 bits per pixel and at 1 bit per pixel. How do the sizes compare?",
    options: [
      { id: "a", text: "The 8-bit file is 8 times bigger" },
      { id: "b", text: "The 8-bit file is 256 times bigger" },
      { id: "c", text: "They're the same size" },
      { id: "d", text: "The 8-bit file is 2 times bigger" },
    ],
    correctOptionId: "a",
    explanation:
      "Image storage scales in direct proportion to bits per pixel, not color count. An 8-bit image uses 8 bits per pixel, which is exactly 8 times the 1 bit per pixel used by binary images. 256 is the number of possible colors (2⁸), not the memory ratio.",
  },
  {
    id: "computer-graphics/images-quiz/q8",
    quiz: "images-quiz",
    prompt: "An 8-bit indexed image and an 8-bit grayscale image both have a pixel with value 200. What's true?",
    options: [
      { id: "a", text: "Both pixels are the same gray" },
      { id: "b", text: "The indexed pixel's color depends on its palette" },
      { id: "c", text: "The indexed pixel is brighter" },
      { id: "d", text: "Indexed images can't store 200" },
    ],
    correctOptionId: "b",
    explanation:
      "In indexed color, the byte value 200 is an index into a 256-entry palette that can store any 24-bit RGB color. In grayscale, 200 directly specifies a bright gray intensity. The pixels will differ unless palette slot 200 happens to store gray, and 8-bit indexed formats support indices from 0 to 255.",
  },
  {
    id: "computer-graphics/resolution-quiz/q1",
    quiz: "resolution-quiz",
    prompt: "A 1500 × 900 image is printed at 300 PPI. How big is the print?",
    options: [
      { id: "a", text: "5 × 3 inches" },
      { id: "b", text: "15 × 9 inches" },
      { id: "c", text: "4500 × 2700 inches" },
      { id: "d", text: "3 × 5 inches" },
    ],
    correctOptionId: "a",
    explanation:
      "Divide pixel dimensions by PPI: 1500 ÷ 300 = 5 inches wide and 900 ÷ 300 = 3 inches tall. 15 × 9 divides by 100 PPI instead of 300, 4500 × 2700 mistakenly multiplies by 300 instead of dividing, and 3 × 5 reverses width and height.",
  },
  {
    id: "computer-graphics/resolution-quiz/q2",
    quiz: "resolution-quiz",
    prompt: "You want an 8 × 10 inch print at 300 PPI. How many pixels does the image need?",
    options: [
      { id: "a", text: "800 × 1000" },
      { id: "b", text: "2400 × 3000" },
      { id: "c", text: "300 × 300" },
      { id: "d", text: "24 × 30" },
    ],
    correctOptionId: "b",
    explanation:
      "Multiply target physical dimensions by PPI: 8 × 300 = 2400 pixels wide and 10 × 300 = 3000 pixels tall. 800 × 1000 assumes 100 PPI, 300 × 300 confuses the PPI figure with resolution dimensions, and 24 × 30 uses a factor of 3 rather than 300.",
  },
  {
    id: "computer-graphics/resolution-quiz/q3",
    quiz: "resolution-quiz",
    prompt: "What does DPI measure?",
    options: [
      { id: "a", text: "Pixels in a digital image" },
      { id: "b", text: "Ink dots a printer places in an inch" },
      { id: "c", text: "The diagonal of a screen" },
      { id: "d", text: "Colors per pixel" },
    ],
    correctOptionId: "b",
    explanation:
      "DPI (dots per inch) specifically measures how many physical dots of ink a printer deposits per linear inch. Pixels in a digital file and screen densities are measured in PPI, screen diagonals are measured in inches, and colors per pixel are governed by bit depth.",
  },
  {
    id: "computer-graphics/resolution-quiz/q4",
    quiz: "resolution-quiz",
    prompt: "How many pixels does a 1280 × 720 screen have?",
    options: [
      { id: "a", text: "2,000" },
      { id: "b", text: "92,160" },
      { id: "c", text: "921,600" },
      { id: "d", text: "2,073,600" },
    ],
    correctOptionId: "c",
    explanation:
      "Multiply columns by rows: 1280 × 720 = 921,600 pixels (standard 720p HD). 2,000 approximates 1280 + 720, 92,160 is off by a factor of 10, and 2,073,600 corresponds to 1080p Full HD (1920 × 1080).",
  },
  {
    id: "computer-graphics/resolution-quiz/q5",
    quiz: "resolution-quiz",
    prompt: "What is the aspect ratio of a 1280 × 1024 screen?",
    options: [
      { id: "a", text: "16:9" },
      { id: "b", text: "4:3" },
      { id: "c", text: "5:4" },
      { id: "d", text: "16:10" },
    ],
    correctOptionId: "c",
    explanation:
      "Divide both dimensions by their greatest common divisor (256): 1280 ÷ 256 = 5 and 1024 ÷ 256 = 4, yielding 5:4. 16:9 and 16:10 are widescreen ratios, while 4:3 would require 1280 × 960 or 1024 × 768.",
  },
  {
    id: "computer-graphics/resolution-quiz/q6",
    quiz: "resolution-quiz",
    prompt: "Two screens are both 1920 × 1080. One is 24 inches, the other 15.6 inches. Which is true?",
    options: [
      { id: "a", text: "They have the same pixel density" },
      { id: "b", text: "The 15.6-inch screen has a higher pixel density" },
      { id: "c", text: "The 24-inch screen shows more pixels" },
      { id: "d", text: "The 24-inch screen is sharper" },
    ],
    correctOptionId: "b",
    explanation:
      "Both displays have the identical total pixel count (1920 × 1080 = 2,073,600 pixels). Distributing the same pixel count across a smaller physical diagonal (15.6 inches) packs more pixels per inch (~141 PPI versus ~92 PPI on 24 inches), giving the 15.6-inch screen higher pixel density. They do not have the same density because physical sizes differ, pixel counts are identical rather than larger on the 24-inch monitor, and lower pixel density yields larger, less sharp pixels.",
  },
  {
    id: "computer-graphics/displays-quiz/q1",
    quiz: "displays-quiz",
    prompt: "Why must a CRT keep redrawing the same picture?",
    options: [
      { id: "a", text: "The frame buffer forgets its contents" },
      { id: "b", text: "The phosphor stops glowing shortly after the beam leaves" },
      { id: "c", text: "The electron gun overheats" },
      { id: "d", text: "To change the resolution" },
    ],
    correctOptionId: "b",
    explanation:
      "Phosphor persistence is very brief, so the emitted light fades within milliseconds unless the electron beam redraws the frame repeatedly. The frame buffer retains its data in memory, the electron gun does not overheat from periodic scanning, and refreshing maintains visibility rather than altering resolution.",
  },
  {
    id: "computer-graphics/displays-quiz/q2",
    quiz: "displays-quiz",
    prompt: "What is the horizontal retrace?",
    options: [
      { id: "a", text: "The beam drawing a horizontal line" },
      { id: "b", text: "The beam returning to the top-left corner after a frame" },
      { id: "c", text: "The beam, switched off, returning to the left edge for the next row" },
      { id: "d", text: "Copying a row into the frame buffer" },
    ],
    correctOptionId: "c",
    explanation:
      "Horizontal retrace occurs when the electron beam turns off and returns to the left edge of the display to begin the next scan line. Drawing a line is the active sweep, returning to the top-left corner after completing the entire frame is the vertical retrace, and memory transfers to the frame buffer are handled by the graphics hardware rather than the beam.",
  },
  {
    id: "computer-graphics/displays-quiz/q3",
    quiz: "displays-quiz",
    prompt: "What does the frame buffer hold?",
    options: [
      { id: "a", text: "A list of line commands" },
      { id: "b", text: "One color value for every pixel on the screen" },
      { id: "c", text: "The previous frame only" },
      { id: "d", text: "The refresh rate" },
    ],
    correctOptionId: "b",
    explanation:
      "The frame buffer is a dedicated block of memory that holds the color or intensity value of every addressable pixel on the display. A list of geometric line commands is a display file used by vector displays, while refresh rate and frame history are managed separately.",
  },
  {
    id: "computer-graphics/displays-quiz/q4",
    quiz: "displays-quiz",
    prompt: "Which is a disadvantage of random-scan displays?",
    options: [
      { id: "a", text: "Diagonal lines look jagged" },
      { id: "b", text: "They can't show realistic shaded scenes" },
      { id: "c", text: "They need a huge frame buffer" },
      { id: "d", text: "The beam visits every pixel" },
    ],
    correctOptionId: "b",
    explanation:
      "Random-scan (vector) displays direct their beam only along line paths, making them incapable of filling solid areas or rendering realistic photographic scenes with continuous shading. Their lines are smooth rather than jagged, they do not require a massive frame buffer, and the beam visits only coordinates where lines exist.",
  },
  {
    id: "computer-graphics/displays-quiz/q5",
    quiz: "displays-quiz",
    prompt: "Why do blacks on an edge-lit LCD look gray?",
    options: [
      { id: "a", text: "The liquid crystals glow" },
      { id: "b", text: "The backlight is on behind the whole panel, and the crystals can't block all of it" },
      { id: "c", text: "The color filters are gray" },
      { id: "d", text: "The refresh rate is too low" },
    ],
    correctOptionId: "b",
    explanation:
      "An LCD panel relies on a continuous backlight. Because liquid crystal molecules cannot completely block light transmission, some backlight bleeds through even when pixels are set to black. The crystals themselves do not emit light, color filters do not cause light leakage, and refresh rate does not determine black levels.",
  },
  {
    id: "computer-graphics/displays-quiz/q6",
    quiz: "displays-quiz",
    prompt: "Which of these makes its own light at each pixel?",
    options: [
      { id: "a", text: "LCD" },
      { id: "b", text: "Edge-lit LED TV" },
      { id: "c", text: "Plasma" },
      { id: "d", text: "Direct-lit LED TV" },
    ],
    correctOptionId: "c",
    explanation:
      "Plasma displays are emissive: electrical current excites gas within each cell, creating ultraviolet light that excites phosphors to emit visible light directly at each subpixel. Standard LCDs, edge-lit LED displays, and direct-lit LED displays are transmissive, requiring a separate backlight behind the liquid crystal layer.",
  },
  {
    id: "computer-graphics/displays-quiz/q7",
    quiz: "displays-quiz",
    prompt: "A company logo has to print on both a pen and a billboard. Which format suits it?",
    options: [
      { id: "a", text: "A large JPEG" },
      { id: "b", text: "A vector file such as SVG" },
      { id: "c", text: "A 1-bit BMP" },
      { id: "d", text: "A GIF with 256 colors" },
    ],
    correctOptionId: "b",
    explanation:
      "Vector formats store geometric formulas (points, lines, and curves) rather than fixed pixel grids, allowing the logo to be rendered sharply at any physical size without loss of quality. Raster formats like JPEG, BMP, or GIF have fixed pixel dimensions and become blurry or pixelated when enlarged to billboard dimensions.",
  },
  {
    id: "computer-graphics/displays-quiz/q8",
    quiz: "displays-quiz",
    prompt: "Which conversion is hard to do well?",
    options: [
      { id: "a", text: "Vector to raster" },
      { id: "b", text: "Raster to vector" },
      { id: "c", text: "Both are equally easy" },
      { id: "d", text: "Neither is possible" },
    ],
    correctOptionId: "b",
    explanation:
      "Vector-to-raster conversion (rasterization) is mathematically straightforward and runs constantly in hardware. Raster-to-vector conversion (tracing) requires image analysis software to guess boundary contours from discrete pixel grids, which often produces inaccurate or distorted shapes on complex images.",
  },
  {
    id: "computer-graphics/lines-quiz/q1",
    quiz: "lines-quiz",
    prompt: "In a system with (0, 0) at the top-left, an image is 100 rows tall. A pixel is at y = 30. What is its y if the origin moves to the bottom-left?",
    options: [
      { id: "a", text: "30" },
      { id: "b", text: "70" },
      { id: "c", text: "69" },
      { id: "d", text: "-30" },
    ],
    correctOptionId: "c",
    explanation:
      "Converting vertical coordinates from top-left to bottom-left follows y_up = (H - 1) - y_down. In an image 100 rows tall, row indices range from 0 to 99, giving (100 - 1) - 30 = 99 - 30 = 69. 70 mistakenly computes 100 - 30 without accounting for 0-based indexing, 30 assumes the vertical index does not change, and -30 merely negates the coordinate.",
  },
  {
    id: "computer-graphics/lines-quiz/q2",
    quiz: "lines-quiz",
    prompt: "What causes jaggies?",
    options: [
      { id: "a", text: "A refresh rate that's too low" },
      { id: "b", text: "Coloring each pixel fully or not at all, so a diagonal edge steps a whole pixel at a time" },
      { id: "c", text: "Too many colors in the image" },
      { id: "d", text: "Vector images" },
    ],
    correctOptionId: "b",
    explanation:
      "Jaggies (aliasing) result from discrete binary sampling: evaluating pixels on an all-or-nothing basis forces non-horizontal edges to jump by whole row or column steps. Refresh rate affects flicker rather than geometric edges, color depth does not cause edge stepping, and vector files contain continuous mathematical formulas that produce jaggies only when rasterized.",
  },
  {
    id: "computer-graphics/lines-quiz/q3",
    quiz: "lines-quiz",
    prompt: "With antialiasing, a black line on a white background covers a quarter of a pixel. What color does the pixel get?",
    options: [
      { id: "a", text: "White" },
      { id: "b", text: "Black" },
      { id: "c", text: "A light gray, 25% of the way to black" },
      { id: "d", text: "A dark gray, 75% of the way to black" },
    ],
    correctOptionId: "c",
    explanation:
      "Antialiasing blends foreground and background shades in proportion to coverage. With 25% coverage of a black stroke on a white background, the pixel receives 25% black and 75% white, creating a light gray (brightness 255 × 0.75 ≈ 191). Solid white or black ignores partial coverage, while dark gray corresponds to 75% coverage rather than 25%.",
  },
  {
    id: "computer-graphics/lines-quiz/q4",
    quiz: "lines-quiz",
    prompt: "What is the slope of the line from (2, 3) to (6, 11)?",
    options: [
      { id: "a", text: "0.5" },
      { id: "b", text: "2" },
      { id: "c", text: "4" },
      { id: "d", text: "8" },
    ],
    correctOptionId: "b",
    explanation:
      "Slope is vertical change divided by horizontal change: m = (y2 - y1) / (x2 - x1) = (11 - 3) / (6 - 2) = 8 / 4 = 2. 0.5 inverts the ratio by computing run over rise (4 / 8), while 4 and 8 are the individual displacements Δx and Δy rather than their quotient.",
  },
  {
    id: "computer-graphics/lines-quiz/q5",
    quiz: "lines-quiz",
    prompt: "Why does the naive y = mx + c algorithm leave gaps in steep lines?",
    options: [
      { id: "a", text: "It rounds the slope" },
      { id: "b", text: "It lights one pixel per column, but a steep line climbs several rows per column" },
      { id: "c", text: "It can't handle negative numbers" },
      { id: "d", text: "It uses whole numbers only" },
    ],
    correctOptionId: "b",
    explanation:
      "Stepping sequentially along x lights exactly one pixel per column. When a line is steep (|m| > 1), the path rises multiple rows per column, leaving empty vertical rows between successive plotted points. Gaps stem from stepping along the wrong axis rather than rounding slope, negative coordinates, or integer arithmetic.",
  },
  {
    id: "computer-graphics/lines-quiz/q6",
    quiz: "lines-quiz",
    prompt: "DDA draws a line from (1, 1) to (5, 11). How many steps does it take, and what is x's increment?",
    options: [
      { id: "a", text: "4 steps, x increment 1" },
      { id: "b", text: "10 steps, x increment 0.4" },
      { id: "c", text: "10 steps, x increment 2.5" },
      { id: "d", text: "14 steps, x increment 0.4" },
    ],
    correctOptionId: "b",
    explanation:
      "Coordinate differences are Δx = 5 - 1 = 4 and Δy = 11 - 1 = 10. The number of steps is max(|Δx|, |Δy|) = max(4, 10) = 10. Because y is the dominant axis, y steps by 1 while x advances by Δx / steps = 4 / 10 = 0.4. 4 steps traverses only Δx, 2.5 inverts the increment by computing Δy / Δx, and 14 sums the coordinate spans instead of taking the maximum.",
  },
  {
    id: "computer-graphics/lines-quiz/q7",
    quiz: "lines-quiz",
    prompt: "In DDA, why is it a mistake to round m = 3/7 to 0.4 before starting?",
    options: [
      { id: "a", text: "It's slower" },
      { id: "b", text: "The error is added again at every step, so points drift off the line" },
      { id: "c", text: "DDA only accepts whole numbers" },
      { id: "d", text: "It isn't a mistake; the pixels come out the same" },
    ],
    correctOptionId: "b",
    explanation:
      "DDA is an incremental algorithm where the increment is added repeatedly on every step. Truncating 3/7 ≈ 0.4286 to 0.4 introduces a truncation error of nearly 0.029 per step that compounds across iterations, causing computed positions to drift away from the true line and miss terminating coordinates. Pre-rounding does not improve speed, DDA supports fractional numbers, and cumulative drift produces incorrect pixel selections.",
  },
  {
    id: "computer-graphics/lines-quiz/q8",
    quiz: "lines-quiz",
    prompt: "Bresenham draws from (0, 0) to (8, 3). What is p₀?",
    options: [
      { id: "a", text: "-2" },
      { id: "b", text: "2" },
      { id: "c", text: "-5" },
      { id: "d", text: "6" },
    ],
    correctOptionId: "a",
    explanation:
      "With Δx = 8 - 0 = 8 and Δy = 3 - 0 = 3, the initial decision parameter is p₀ = 2Δy - Δx = 2(3) - 8 = 6 - 8 = -2. 2 reverses the subtraction (8 - 6), -5 calculates Δy - Δx, and 6 computes 2Δy without subtracting Δx.",
  },
  {
    id: "computer-graphics/lines-quiz/q9",
    quiz: "lines-quiz",
    prompt: "In Bresenham's algorithm for a gentle line, p is 5. What happens next?",
    options: [
      { id: "a", text: "y stays the same, and p becomes p + 2Δy" },
      { id: "b", text: "y goes up by 1, and p becomes p + 2Δy − 2Δx" },
      { id: "c", text: "x stays the same" },
      { id: "d", text: "The algorithm stops" },
    ],
    correctOptionId: "b",
    explanation:
      "When p ≥ 0, the true line has reached or crossed the midpoint between the candidate pixels, indicating the upper pixel is closer. The algorithm moves up to row y + 1 and updates the decision parameter as p + 2Δy - 2Δx. Staying on the current row and adding 2Δy applies only when p < 0, x always advances by 1 on gentle lines, and the algorithm continues until the endpoint is reached.",
  },
  {
    id: "computer-graphics/lines-quiz/q10",
    quiz: "lines-quiz",
    prompt: "What is Bresenham's main advantage over DDA?",
    options: [
      { id: "a", text: "It draws thicker lines" },
      { id: "b", text: "It antialiases" },
      { id: "c", text: "It uses only whole-number arithmetic, so it's faster and doesn't accumulate rounding error" },
      { id: "d", text: "It can draw curves directly" },
    ],
    correctOptionId: "c",
    explanation:
      "Bresenham's algorithm operates entirely in integer arithmetic, using only additions, subtractions, and bit shifts. This eliminates floating-point calculation costs and avoids cumulative fractional rounding drift. It does not alter line stroke width, base Bresenham does not antialias, and it is tailored specifically for rasterizing straight line segments.",
  },
];
