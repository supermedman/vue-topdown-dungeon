/**
 * This function builds upon `typeof` allowing for more complex type checks made against class objects and arrays
 * @param t Tagged javascript entity
 * @returns String representation of given `t`
 */
export function getTypeOf(t: any): string {
    if (t === null) return "null";
    const baseType = typeof t;

    if (!["object", "function"].includes(baseType)) return baseType;
    
    const tag = t[Symbol.toStringTag];
    if (typeof tag === "string") return tag;

    if (
        baseType === "function" &&
        Function.prototype.toString.call(t).startsWith("class")
    ) return "class";

    const className = t.constructor.name;
    if (typeof className === "string" && className !== "") return className;

    return baseType;
}

/**
 * This function picks a random element from the given array and returns it.
 * @param arr Array of typed elements, unknown length, unknown type
 * @returns {A} Single typed element
 */
export function randArrPos<A>(arr: A[]): A {
    return arr[((arr?.length ?? 0) > 1) ? Math.floor(Math.random() * arr.length) : 0];
}

/**
 * This function rolls a random number between the given min/max values inclusively. 
 * @param min Minimum value for range
 * @param max Maximum value for range
 * @returns Number between min-max inclusively
 */
export function incRandNum(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * This function rolls `Math.random()` and checks if the given `chance >= Math.random()`
 * @param chance `0 < chance < 1`
 * @returns True if condition passes
 */
export function rollChanceGTE(chance: number): boolean {
    return Math.random() <= chance;
}

/**
 * This function rolls `Math.random()` and checks if the given `chance <= Math.random()`
 * @param chance `0 < chance < 1`
 * @returns True if condition passes
 */
export function rollChanceLTE(chance: number): boolean {
    return Math.random() >= chance;
}