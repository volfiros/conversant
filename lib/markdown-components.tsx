import type { Components } from "react-markdown"

export const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  code: ({ children }) => (
    <code className="bg-white/10 px-1.5 py-0.5 rounded text-accent text-xs font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-black/40 rounded-md p-3 overflow-x-auto text-xs font-mono my-2">
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
  h3: ({ children }) => <h3 className="font-semibold text-white mt-3 mb-1">{children}</h3>,
  h4: ({ children }) => <h4 className="font-semibold text-white mt-3 mb-1">{children}</h4>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 -mx-1 max-w-full">
      <table className="min-w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-white/10 px-2 py-1 text-left text-white/70 whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-white/10 px-2 py-1 whitespace-nowrap">{children}</td>
  ),
  tr: ({ children }) => <tr className="even:bg-white/[0.02]">{children}</tr>,
}
