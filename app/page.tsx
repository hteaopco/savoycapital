export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col px-6 py-8 z-10">
        <h1
          className="text-xl font-bold tracking-tight mb-10"
          style={{ color: "var(--accent-navy)" }}
        >
          Savoy Capital Fund
        </h1>
        <nav>
          <a
            href="#portfolio"
            className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
          >
            Portfolio
          </a>
          <a
            href="#debt"
            className="text-sm font-medium text-gray-700 hover:text-black transition-colors mt-4 block"
          >
            Debt
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        {/* Hero Section */}
        <section className="flex flex-col justify-center min-h-screen px-16 py-24">
          <h2 className="text-5xl font-bold tracking-tight text-black mb-4">
            Savoy Capital Fund
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-xl">
            Backing Exceptional SaaS Founders
          </p>
          <a
            href="#portfolio"
            className="inline-block w-fit px-6 py-3 text-sm font-medium text-white rounded transition-colors hover:opacity-90"
            style={{ backgroundColor: "var(--accent-navy)" }}
          >
            Learn More
          </a>
        </section>

        {/* Portfolio Section */}
        <section id="portfolio" className="px-16 py-24">
          <h2 className="text-3xl font-bold tracking-tight text-black mb-12">
            Our Portfolio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-8 flex items-center justify-center min-h-[200px] bg-gray-50"
              >
                <p className="text-gray-400 text-sm font-medium">
                  Portfolio Company
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
