/**
 * Performance Timing Utility
 * 
 * Provides comprehensive timing instrumentation with:
 * - Hierarchical operation tracking
 * - Aggregate statistics (min/max/avg/count)
 * - Easy instrumentation via `using` syntax or manual start/stop
 * 
 * @example
 * ```ts
 * // Auto-stop with `using` (recommended)
 * using timer = Perf.time("llm", "stream")
 * // ... operation ...
 * // timer auto-stops when scope exits
 * 
 * // Manual control
 * const timer = Perf.time("file", "read")
 * try { ... } finally { timer.stop() }
 * 
 * // Get statistics
 * console.log(Perf.getStats())
 * 
 * // Log a formatted report
 * Perf.report()
 * ```
 */

export interface TimingEntry {
    category: string
    operation: string
    startTime: number
    endTime?: number
    duration?: number
    metadata?: Record<string, unknown>
}

export interface CategoryStats {
    count: number
    totalMs: number
    minMs: number
    maxMs: number
    avgMs: number
    operations: Map<string, OperationStats>
}

export interface OperationStats {
    count: number
    totalMs: number
    minMs: number
    maxMs: number
    avgMs: number
    last10: number[]
}

export interface Timer {
    stop(metadata?: Record<string, unknown>): TimingEntry
    [Symbol.dispose](): void
}

// Storage for completed timings and aggregated stats
const stats = new Map<string, CategoryStats>()
const recentEntries: TimingEntry[] = []
const MAX_RECENT_ENTRIES = 1000

// Custom log function - can be overridden
let logFn: (message: string, data?: Record<string, unknown>) => void = (message, data) => {
    if (data) {
        console.log(`[perf] ${message}`, data)
    } else {
        console.log(`[perf] ${message}`)
    }
}

export namespace Perf {
    /**
     * Set a custom logging function
     */
    export function setLogger(fn: (message: string, data?: Record<string, unknown>) => void): void {
        logFn = fn
    }

    /**
     * Start timing an operation
     */
    export function time(category: string, operation: string): Timer {
        const startTime = performance.now()
        let stopped = false

        const stop = (metadata?: Record<string, unknown>): TimingEntry => {
            if (stopped) {
                return { category, operation, startTime, endTime: startTime, duration: 0, metadata }
            }
            stopped = true

            const endTime = performance.now()
            const duration = endTime - startTime

            const entry: TimingEntry = {
                category,
                operation,
                startTime,
                endTime,
                duration,
                metadata
            }

            // Record the entry
            recordEntry(entry)

            // Log the timing
            logFn(`${category}/${operation}`, {
                duration: `${duration.toFixed(2)}ms`,
                ...metadata
            })

            return entry
        }

        return {
            stop,
            [Symbol.dispose]() {
                stop()
            }
        }
    }

    /**
     * Wrap an async function with timing
     */
    export async function timeAsync<T>(
        category: string,
        operation: string,
        fn: () => Promise<T>,
        metadata?: Record<string, unknown>
    ): Promise<T> {
        const timer = time(category, operation)
        try {
            return await fn()
        } finally {
            timer.stop(metadata)
        }
    }

    /**
     * Wrap a sync function with timing
     */
    export function timeSync<T>(
        category: string,
        operation: string,
        fn: () => T,
        metadata?: Record<string, unknown>
    ): T {
        const timer = time(category, operation)
        try {
            return fn()
        } finally {
            timer.stop(metadata)
        }
    }

    /**
     * Get aggregated statistics for all categories
     */
    export function getStats(): Map<string, CategoryStats> {
        return new Map(stats)
    }

    /**
     * Get statistics for a specific category
     */
    export function getCategoryStats(category: string): CategoryStats | undefined {
        return stats.get(category)
    }

    /**
     * Get recent timing entries
     */
    export function getRecentEntries(limit?: number): TimingEntry[] {
        return recentEntries.slice(-(limit ?? 100))
    }

    /**
     * Reset all statistics
     */
    export function reset(): void {
        stats.clear()
        recentEntries.length = 0
    }

    /**
     * Log a formatted report of all statistics
     */
    export function report(): void {
        if (stats.size === 0) {
            logFn("No timing data collected")
            return
        }

        logFn("=== Performance Report ===")

        for (const [category, catStats] of stats) {
            logFn(`\n[${category}] total=${catStats.count} calls, ${catStats.totalMs.toFixed(2)}ms total, avg=${catStats.avgMs.toFixed(2)}ms`)

            for (const [op, opStats] of catStats.operations) {
                logFn(`  ${op}: count=${opStats.count}, avg=${opStats.avgMs.toFixed(2)}ms, min=${opStats.minMs.toFixed(2)}ms, max=${opStats.maxMs.toFixed(2)}ms`)
            }
        }

        logFn("\n=========================")
    }

    /**
     * Get a summary object suitable for JSON serialization
     */
    export function getSummary(): Record<string, unknown> {
        const summary: Record<string, unknown> = {}

        for (const [category, catStats] of stats) {
            const ops: Record<string, unknown> = {}
            for (const [op, opStats] of catStats.operations) {
                ops[op] = {
                    count: opStats.count,
                    totalMs: opStats.totalMs,
                    avgMs: opStats.avgMs,
                    minMs: opStats.minMs,
                    maxMs: opStats.maxMs
                }
            }
            summary[category] = {
                count: catStats.count,
                totalMs: catStats.totalMs,
                avgMs: catStats.avgMs,
                minMs: catStats.minMs,
                maxMs: catStats.maxMs,
                operations: ops
            }
        }

        return summary
    }
}

function recordEntry(entry: TimingEntry): void {
    const { category, operation, duration } = entry
    if (duration === undefined) return

    // Add to recent entries (circular buffer)
    recentEntries.push(entry)
    if (recentEntries.length > MAX_RECENT_ENTRIES) {
        recentEntries.shift()
    }

    // Update category stats
    let catStats = stats.get(category)
    if (!catStats) {
        catStats = {
            count: 0,
            totalMs: 0,
            minMs: Infinity,
            maxMs: 0,
            avgMs: 0,
            operations: new Map()
        }
        stats.set(category, catStats)
    }

    catStats.count++
    catStats.totalMs += duration
    catStats.minMs = Math.min(catStats.minMs, duration)
    catStats.maxMs = Math.max(catStats.maxMs, duration)
    catStats.avgMs = catStats.totalMs / catStats.count

    // Update operation stats
    let opStats = catStats.operations.get(operation)
    if (!opStats) {
        opStats = {
            count: 0,
            totalMs: 0,
            minMs: Infinity,
            maxMs: 0,
            avgMs: 0,
            last10: []
        }
        catStats.operations.set(operation, opStats)
    }

    opStats.count++
    opStats.totalMs += duration
    opStats.minMs = Math.min(opStats.minMs, duration)
    opStats.maxMs = Math.max(opStats.maxMs, duration)
    opStats.avgMs = opStats.totalMs / opStats.count
    opStats.last10.push(duration)
    if (opStats.last10.length > 10) {
        opStats.last10.shift()
    }
}

export default Perf
