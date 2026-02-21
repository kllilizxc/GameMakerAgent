import { Dropdown as HeroDropdown, Label } from "@heroui/react"
import { ReactNode } from "react"

export interface DropdownOption<T = string> {
    id: T
    label: string
    icon?: ReactNode
    endIcon?: ReactNode
}

interface DropdownProps<T = string> {
    options: DropdownOption<T>[]
    value?: T
    onChange: (value: T) => void
    trigger: ReactNode
    placement?: "top" | "bottom" | "left" | "right"
    className?: string
    dark?: boolean
}

export function Dropdown<T extends string = string>({
    options,
    value,
    onChange,
    trigger,
    placement = "bottom",
    className = "",
}: DropdownProps<T>) {
    const handleSelectionChange = (keys: "all" | Set<React.Key>) => {
        if (keys !== "all" && keys.size > 0) {
            const selectedId = Array.from(keys)[0] as T
            onChange(selectedId)
        }
    }

    const popoverClassName = [
        className,
    ]
        .filter(Boolean)
        .join(" ")

    return (
        <HeroDropdown>
            <HeroDropdown.Trigger>{trigger}</HeroDropdown.Trigger>
            <HeroDropdown.Popover className={popoverClassName} placement={placement}>
                <HeroDropdown.Menu
                    aria-label="Options"
                    selectionMode="single"
                    selectedKeys={value ? new Set([value]) : new Set()}
                    onSelectionChange={handleSelectionChange}
                >
                    {options.map((option) => (
                        <HeroDropdown.Item key={option.id} id={option.id} textValue={option.label}>
                            <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-2">
                                    {option.icon && option.icon}
                                    <Label>{option.label}</Label>
                                </div>
                                {option.endIcon && option.endIcon}
                            </div>
                            <HeroDropdown.ItemIndicator style={{ color: "var(--muted-foreground)" }} />
                        </HeroDropdown.Item>
                    ))}
                </HeroDropdown.Menu>
            </HeroDropdown.Popover>
        </HeroDropdown>
    )
}
