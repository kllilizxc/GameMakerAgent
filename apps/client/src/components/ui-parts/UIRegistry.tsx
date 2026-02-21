import { ReactNode, ComponentType } from "react"
import { SelectorPart } from "./SelectorPart"

export interface UIPartProps {
    props: Record<string, any>
}

const REGISTRY: Record<string, ComponentType<any>> = {
    selector: SelectorPart,
}

export function renderUIPart(name: string, props: Record<string, any>): ReactNode {
    const Component = REGISTRY[name]
    if (!Component) {
        return (
            <div className="p-2 border border-dashed border-red-500 rounded text-red-500 text-xs">
                Unknown UI component: {name}
            </div>
        )
    }
    return <Component props={props} />
}
