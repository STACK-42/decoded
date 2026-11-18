export type Author = {
  name: string;
  image: string;
  href: string;
  /** A csdecod.ing address that forwards to a private inbox, so nobody has to publish a personal one. */
  email?: string;
};

export const ahmedAlghali: Author = {
  name: "Ahmed Alghali",
  image: "https://github.com/a7med7x7.png?size=160",
  href: "https://github.com/a7med7x7",
  email: "ahmed@csdecod.ing",
};

export const asmaaFarouq: Author = {
  name: "Asmaa Farouq",
  image: "https://github.com/Asmaa6777.png?size=160",
  href: "https://github.com/Asmaa6777",
  email: "asmaa@csdecod.ing",
};
