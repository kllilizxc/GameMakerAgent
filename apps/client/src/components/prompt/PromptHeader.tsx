interface PromptHeaderProps {
  title?: string
  subtitle?: string
}

export function PromptHeader({
  title = "Game Agent",
  subtitle = "Describe your game idea"
}: PromptHeaderProps) {
  return (
    <div className="p-4 border-b border-border">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}
