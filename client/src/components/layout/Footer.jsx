const Footer = () => {
  const footerGroups = [
    {
      title: "Explore",
      links: [
        { label: "Watch Spaces", href: "/watch-spaces" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "AI Co-Pilot", href: "#ai-copilot" },
        { label: "Features", href: "#features" },
      ],
    },
    {
      title: "Your Account",
      links: [
        { label: "Sign In", href: "/login" },
        { label: "Create Account", href: "/register" },
        { label: "My Profile", href: "/profile" },
        { label: "Join a WatchSpace", href: "/watch-spaces" },
      ],
    },
    {
      title: "Experience",
      links: [
        { label: "Live Chat", href: "#live-chat" },
        { label: "Synchronized Playback", href: "#watch-together" },
        { label: "Trivia & Voting", href: "#trivia-voting" },
        { label: "AI Assistance", href: "#ai-copilot" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "About Watch Spaces", href: "#about" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
        { label: "Contact", href: "mailto:" },
      ],
    },
  ];

  return (
    <footer className="w-full border-t border-white/10 bg-[#0b0b0d] text-white">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
        {/* Call to action */}
        <div className="mx-auto mb-12 flex max-w-xl flex-col items-center text-center">
          <a
            href="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#e50914] px-8 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(229,9,20,0.22)] transition duration-200 hover:bg-[#f6121d] hover:shadow-[0_0_32px_rgba(229,9,20,0.35)] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0b0b0d]"
          >
            Get started
          </a>
          <p className="mt-3 text-sm text-zinc-400">
            Create your space. Invite your people. Watch together.
          </p>
        </div>

        {/* Support prompt */}
        <p className="mb-8 text-sm text-zinc-400">
          Questions?{" "}
          <a
            href="mailto:"
            className="text-zinc-300 underline underline-offset-4 transition hover:text-white"
          >
            Contact us
          </a>
        </p>

        {/* Footer navigation */}
        <nav
          aria-label="Footer navigation"
          className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4 sm:gap-x-8"
        >
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-4 text-sm font-semibold tracking-wide text-white">
                {group.title}
              </h2>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs leading-5 text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-white hover:decoration-white sm:text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Language / brand footer */}
        <div className="mt-10 flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-zinc-600 bg-transparent px-3 py-2 text-xs text-zinc-200">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
            </svg>
            English
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3 w-3"
              fill="currentColor"
            >
              <path d="m3 6 5 5 5-5H3Z" />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-[0.12em] text-[#e50914]">
              NETFLIX AI WATCH SPACE
            </p>
            <p className="text-xs text-zinc-500">
              Watch together. Chat live. Let AI make it better.
            </p>
            <p className="pt-2 text-xs text-zinc-600">
              © {new Date().getFullYear()} Netflix AI Watch Space. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
