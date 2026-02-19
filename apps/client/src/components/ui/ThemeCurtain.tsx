import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

interface ThemeCurtainProps {
    show: boolean
    /** The mode BEFORE the switch (current) */
    fromMode: "light" | "dark"
    /** The mode AFTER the switch (target) */
    toMode: "light" | "dark"
}

const COLORS = {
    light: "#ffffff",
    dark: "#09090b",
}

const TEXT_COLORS = {
    light: "#000000",
    dark: "#ffffff",
}

const MESSAGES = {
    light: "Bringing the Light",
    dark: "Entering Darkness",
}

export function ThemeCurtain({ show, fromMode, toMode }: ThemeCurtainProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (show) {
            setIsVisible(true)
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300)
            return () => clearTimeout(timer)
        }
    }, [show])

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Layer 1: Current mode color — slides in first */}
                    <motion.div
                        key="curtain-from"
                        initial={{ x: "-100%" }}
                        animate={{ x: "0%" }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        className="fixed inset-0 z-[110]"
                        style={{ backgroundColor: COLORS[fromMode] }}
                    />

                    {/* Layer 2: Target mode color — slides in with a slight delay */}
                    <motion.div
                        key="curtain-to"
                        initial={{ x: "-100%" }}
                        animate={{ x: "0%" }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
                        className="fixed inset-0 z-[111] flex items-center justify-center"
                        style={{ backgroundColor: COLORS[toMode] }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 0.5, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col items-center gap-6"
                            style={{ color: TEXT_COLORS[toMode] }}
                        >
                            {toMode === "dark" ? <Moon className="w-20 h-20" /> : <Sun className="w-20 h-20" />}
                            <span className="text-xl font-medium tracking-[0.2em] uppercase">
                                {MESSAGES[toMode]}
                            </span>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
