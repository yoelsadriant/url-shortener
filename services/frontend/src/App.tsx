import Header from '@/components/Header';
import UrlShortenerForm from '@/components/UrlShortenerForm';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main>
        <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
              Shorten your links,{' '}
              <span className="text-blue-400">amplify your reach</span>
            </h1>
            <p className="text-slate-400 text-lg sm:text-xl mb-12 max-w-xl mx-auto">
              Transform long URLs into clean, shareable links in seconds.
            </p>
            <UrlShortenerForm />
          </div>
        </section>
      </main>
    </div>
  );
}
