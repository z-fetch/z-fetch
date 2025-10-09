import {
  Star,
  Package,
  Globe,
  Archive,
  CheckCircle,
  Zap,
  GithubIcon,
  ShieldPlus,
  Waves,
  Loader2,
  Recycle,
} from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "./components/CodeBlock";
import { highlight } from "./components/shared";

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
    title: "Framework Agnostic",
    description: "Works with any JavaScript project, no matter the framework.",
    icon: Globe,
  },
  {
    title: "Built-in Caching",
    description:
      "Automatic caching with auto revalidation and configurable options.",
    icon: Archive,
  },
  {
    title: "Auto JSON Parsing",
    description:
      "Automatic JSON parsing of responses and request payload.",
    icon: CheckCircle,
  },
  {
    title: "Streaming Support",
    description:
      "Built-in streaming utilities for stream responses handling.",
    icon: Waves,
  },
  {
    title: "Progress Tracking",
    description:
      "Real-time progress tracking for file uploads and downloads.",
    icon: Loader2,
  },
  {
    title: "Powerful Hooks System",
    description:
      "Hooks are interceptors for the request lifecycle.",
    icon: Recycle,
  },
  {
    title: "Error Mapping",
    description:
      "Catch common errors nicely with customizable error message mapping.",
    icon: ShieldPlus,
  },
  {
    title: "More than just fetching",
    description:
      "You can cancel requests, set timeout, custom HTTP methods and more.",
    icon: Zap,
  }
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

export default async function Home() {
  // Pre-render code blocks on server
  const bashHighlighted = await highlight("npm install @z-fetch/fetch", "bash");
  const jsHighlighted = await highlight(`import { GET } from '@z-fetch/fetch';

async function getPosts() {
  const { data, error } = await GET('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    console.log('Posts:', data);
  } else {
    console.error('Error fetching posts:', error);
  }
}

getPosts();`, "javascript");

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-start py-12 px-4 sm:px-8 space-y-12">
      <header className="flex items-center justify-between top-2 sticky w-full px-4 py-4 bg-zinc-900 text-zinc-200 z-10">
        <h1 className="font-bold">⚡Z‑Fetch</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/docs"
            className="flex --bg-zinc-50 text-zinc-100 hover:text-zinc-500 rounded-xl text-sm mr-2 px-4 py-2"
          >
            Documentation
          </Link>
          <Link href="https://github.com/z-fetch/z-fetch">
            <GithubIcon className="text-amber-300" />
          </Link>
        </div>
      </header>
      {/* Header with Brand */}
      <header className="text-center mb-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-amber-400 cursor-pointer hover:drop-shadow-sm hover:drop-shadow-amber-300 mb-4">
          ⚡Z‑Fetch
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 mb-8">
          The pragmatic native fetch API wrapper for JavaScript.
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
        <CodeBlock 
          code="npm install @z-fetch/fetch" 
          language="bash" 
          initial={bashHighlighted}
        />
      </section>

      {/* Sample Usage Snippet */}
      <section className="mb-12 w-full max-w-4xl">
        <CodeBlock 
          code={`import { GET } from '@z-fetch/fetch';

async function getPosts() {
  const { data, error } = await GET('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    console.log('Posts:', data);
  } else {
    console.error('Error fetching posts:', error);
  }
}

getPosts();`} 
          language="javascript" 
          initial={jsHighlighted}
        />
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
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
