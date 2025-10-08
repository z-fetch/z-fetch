"use client";
import {
  Star,
  Package,
  Globe,
  Archive,
  CheckCircle,
  Zap,
  GithubIcon,
  CirclePlay,
  CircleMinus,
  Sparkles,
  ShieldPlus,
  Upload,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Feature = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const features: Feature[] = [
  {
    title: "Zero Dependencies",
    description:
      "Built on the native fetch API with no extra libraries needed.",
    icon: Package,
  },
  {
    title: "Upload/Download Progress",
    description: "Track upload and download progress with simple callbacks.",
    icon: Upload,
  },
  {
    title: "Streaming Utilities",
    description: "Stream JSON, text, and NDJSON with helper utilities.",
    icon: Waves,
  },
  {
    title: "Framework Agnostic",
    description: "Works with any JavaScript project, no matter the framework.",
    icon: Globe,
  },
  {
    title: "Built-in Caching",
    description:
      "Automatically caches responses with auto revalidation for optimized performance.",
    icon: Archive,
  },
  {
    title: "Auto JSON Parsing",
    description:
      "Automatically parses JSON responses with minimal boilerplate.",
    icon: CheckCircle,
  },
  {
    title: "Retries & Polling",
    description:
      "Supports configurable request retries and polling mechanisms.",
    icon: CirclePlay,
  },
  {
    title: "Builtin Helpers",
    description: "Has builtin helpers for most common use cases.",
    icon: ShieldPlus,
  },
  {
    title: "Request Cancellation",
    description:
      "Cancel requests on demand with built‑in cancellation support.",
    icon: CircleMinus,
  },
  {
    title: "Extended HTTP Methods",
    description:
      "Supports OPTIONS, TRACE, HEAD, and custom HTTP verbs without extra setup.",
    icon: Zap,
  },
  {
    title: "Hooks - Interceptors",
    description:
      "You can use hooks to intercept and transform requests and responses.",
    icon: Sparkles,
  },
];

type FeatureCardProps = {
  feature: Feature;
};

function FeatureCard({ feature }: FeatureCardProps) {
  const { title, description, icon: Icon } = feature;
  return (
    <div className="bg-zinc-900 cursor-pointer p-6 rounded-lg text-center shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
      <div className="mb-4">
        <Icon className="w-10 h-10 text-amber-400 mx-auto" />
      </div>
      <h3 className="text-xl font-bold text-amber-200 mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-start py-12 px-4 sm:px-8 space-y-12">
      <header className="flex items-center justify-between top-2 sticky w-full px-4 py-4 bg-zinc-900 text-zinc-200 z-10">
        <h1 className="font-bold">Z‑Fetch</h1>
        <div className="flex items-center gap-2">
          <button
            className="flex --bg-zinc-50 text-zinc-100 hover:text-zinc-500 rounded-xl text-sm mr-2 px-4 py-2"
            onClick={() => router.push("/docs")}
          >
            Documentation
          </button>
          <Link href="https://github.com/z-fetch/z-fetch">
            <GithubIcon className="text-amber-300" />
          </Link>
        </div>
      </header>
      {/* Header with Brand */}
      <header className="text-center mb-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-amber-400 cursor-pointer hover:drop-shadow-sm hover:drop-shadow-amber-300 mb-4">
          Z‑Fetch
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 mb-8">
          A pragmatic native fetch API wrapper for JavaScript.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/docs">
            <span className="bg-amber-600 hover:bg-amber-500 text-gray-900 py-3 px-8 rounded-full transition">
              Get Started
            </span>
          </Link>
          <a
            href="https://github.com/z-fetch/z-fetch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-2 items-center border border-amber-600 hover:border-amber-500 text-amber-400 py-3 px-8 rounded-full transition"
          >
            <Star className="w-5 h-5" />
            <span>Star on GitHub</span>
          </a>
        </div>
      </header>

      {/* Installation Command */}
      <section className="mb-12 w-full max-w-4xl">
        <div className="bg-zinc-900 p-4 rounded-lg overflow-x-auto  border-1 border-zinc-800">
          <pre className="text-sm font-mono text-amber-200">
            <code>{`npm install @z-fetch/fetch`}</code>
          </pre>
        </div>
      </section>

      {/* Sample Usage Snippet */}
      <section className="mb-12 w-full max-w-4xl">
        <div className="bg-zinc-900 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm font-mono text-amber-200">
            <code>{`import { GET } from '@z-fetch/fetch';

async function getPosts() {
  const { data, error } = await GET('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    console.log('Posts:', data);
  } else {
    console.error('Error fetching posts:', error);
  }
}

getPosts();`}</code>
          </pre>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} />
        ))}
      </section>

      {/* Footer */}
      <footer className="text-gray-600 text-sm w-full flex items-center justify-center">
        Made With 🧡 By
        <a href="mailto:hssnkizz@gmail.com" className="flex px-1">
          Hussein Kizz
        </a>
      </footer>
    </div>
  );
}
