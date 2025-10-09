'use client'
import type { JSX } from 'react'
import { useLayoutEffect, useState } from 'react'
import { highlight } from './shared'
import type { BundledLanguage } from 'shiki/bundle/web'

interface CodeBlockProps {
  code: string;
  language: string;
  initial?: JSX.Element;
}

export function CodeBlock({ code, language, initial }: CodeBlockProps) {
  const [nodes, setNodes] = useState(initial)

  useLayoutEffect(() => {
    if (!initial) {
      void highlight(code, language as BundledLanguage).then(setNodes)
    }
  }, [code, language, initial])

  const content = nodes ?? (
    <pre className="text-sm font-mono text-amber-200 --p-6">
      <code>{code}</code>
    </pre>
  )

  // Wrap the highlighted content in our styling
  return (
    <div className="bg-zinc-900 p-2 rounded-lg overflow-x-auto border-1 border-zinc-800">
      <div className="text-sm font-mono">
        {content}
      </div>
    </div>
  )
}
