import Link from "next/link";

export default function Cancel() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Checkout canceled</h1>
        <p className="text-white/60 mb-6">No worries! You can continue using the demo.</p>
        <Link className="inline-block rounded-full bg-white text-black px-6 py-3 hover:bg-gray-200 transition-colors" href="/">
          Go back
        </Link>
      </div>
    </main>
  );
}