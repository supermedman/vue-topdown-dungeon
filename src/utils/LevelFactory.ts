
import { Con, RawTile } from "../typing/Tiles";
import { randArrPos } from "./LogicHelpers";

interface LevelArgs {
    dim?: number;
    width?: number;
    height?: number;
};

type MU = (LevelArgs | undefined)

class MakerMap implements LevelArgs {
    dim?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
    constructor(args: MU) {
        if (!args) { this.dim = 4; return; }
        this.dim = args.dim;
        this.height = args.height;
        this.width = args.width;
    }
}

// Tile
//   . N .
//   W   E
//   . S .

// Open 
//   . ^ .
//   <   >
//   . v .

// Closed "Dead-End" (Can be orriented: "Up", "Left", "Right", "Down")
//   . ^ .
//   |   |
//   .___.

// T "Junction" (Can be orriented: "Up", ect..)
//   . ^ .
//   <   >
//   .___.

// L "Junction" (All orrients)
//   . ^ .
//   |   >
//   .___.

// I "Hallway" (Can orrient: "Vert", "Horz")
//   . ^ .
//   |   |
//   . v .

// Base Tile footprint/layout, as shown above
enum TileStyle {
    Open    = 1 << 0, // 1
    Closed  = 1 << 1, // 2
    T       = 1 << 2, // 4
    L       = 1 << 3, // 8
    I       = 1 << 4, // 16
};


// TileDirection: (Alias) TileDir
enum TileDir {
    North   = 1 << 0, // 1
    East    = 1 << 1, // 2
    South   = 1 << 2, // 4
    West    = 1 << 3, // 8
};

// enum CellState {
// }

/**
 * Example usage?
 * 
 * ```js
 * TileMock = {
 *      style: TileStyle.T,
 *      dir: TileDir.South,
 * };
 * ```
 * 
 * This would indicate the tile layout to be:
 * ```
 *   .___.
 *   <   >
 *   . v .
 * ```
 * This would also indicate the connections data as:
 * 
 * `connections: [["W", id], ["E", id], ["S", id]]`
 * 
 */
const connectionTable = {
    [TileStyle.Open]: {
        [TileDir.North]: [["N"], ["E"], ["S"], ["W"]],
        [TileDir.East]: [["N"], ["E"], ["S"], ["W"]],
        [TileDir.South]: [["N"], ["E"], ["S"], ["W"]],
        [TileDir.West]: [["N"], ["E"], ["S"], ["W"]]
    },
    [TileStyle.Closed]: {
        [TileDir.North]: [["N"]],
        [TileDir.East]: [["E"]],
        [TileDir.South]: [["S"]],
        [TileDir.West]: [["W"]]
    },
    [TileStyle.T]: {
        [TileDir.North]: [["N"], ["E"], ["W"]],
        [TileDir.East]: [["E"], ["N"], ["S"]],
        [TileDir.South]: [["S"], ["E"], ["W"]],
        [TileDir.West]: [["W"], ["N"], ["S"]]
    },
    [TileStyle.L]: {
        [TileDir.North]: [["N"], ["E"]],
        [TileDir.East]: [["E"], ["S"]],
        [TileDir.South]: [["S"], ["W"]],
        [TileDir.West]: [["W"], ["N"]]
    },
    [TileStyle.I]: {
        [TileDir.North]: [["N"], ["S"]],
        [TileDir.East]: [["E"], ["W"]],
        [TileDir.South]: [["N"], ["S"]],
        [TileDir.West]: [["E"], ["W"]]
    },
};

// function enumValue<EValue extends (string | number), EType extends { [key: string]: EValue}>(e: EType) {
//     const values: EValue[] = Object.values(e);
//     const isNumEnum = e[e[values[0]]] === values[0];
//     return isNumEnum ? values.slice(values.length / 2) : values;
// }



const connectionMatches = {
    grabAllOptions(filterArgs: Array<string> | undefined) {
        const fullOptionList: Array<Array<string>> = [];

        for (const style in TileStyle){
            //if (useSymbol && !isNaN(Number(style))) continue;
            if (isNaN(Number(style))) continue;
            for (const direct in TileDir){
                //if (useSymbol && !isNaN(Number(direct))) continue;
                if (isNaN(Number(direct))) continue;

                // If no filter has been given, assume all options are valid
                if (!filterArgs) {
                    fullOptionList.push([style, direct]);
                    continue;
                }


                const styleMatch = connectionTable[style as unknown as TileStyle];
                const dirStyleMatch = styleMatch[direct as unknown as TileDir];

                // For each directionStyle, compare against the given filter directions
                // only adding those that have no matching connections 
                let filterCounter = 0;
                for (const dir of filterArgs){
                    if (![...dirStyleMatch.map(arr => arr[0])].includes(dir)){
                        filterCounter++;
                    }
                }

                if (filterCounter === filterArgs.length) fullOptionList.push([style, direct]);
            }
        }

        return fullOptionList;
    },
    grabFinalConnections(s: string, d: string) {
        const styleMatch = connectionTable[s as unknown as TileStyle];
        const dirStyleMatch = styleMatch[d as unknown as TileDir];

        return [...dirStyleMatch.map(arr => [...arr, 0])];
    },
    staticLooper(dir: string, inverse=false) {
        const validConnectors: Array<Array<string>> = [];

        for (const style in TileStyle){
            if (isNaN(Number(style))) continue;
            const styleMatch = connectionTable[style as unknown as TileStyle];
            
            //console.log('=== STYLE MATCH DATA ===');
            //console.table(styleMatch);

            for (const direct in TileDir){
                if (isNaN(Number(direct))) continue;
                const dirStyleMatch = styleMatch[direct as unknown as TileDir];
                
                //console.log('ENUM MEMBER: ', direct);
                // console.log('MATCHED MEMBER TABLE DATA: ', dirStyleMatch);
                // if (dirStyleMatch.length) console.log(dirStyleMatch);

                const hasMatch = (inverse) 
                ? ![...dirStyleMatch.map(arr => arr[0])].includes(dir)
                : [...dirStyleMatch.map(arr => arr[0])].includes(dir);

                if (hasMatch) validConnectors.push([style, direct]);
            }
        }

        return validConnectors;
    },
    /**
     * This method handles searching the connection table for valid options given the value of `dir`
     * if `dir` exists check for all connection data that has a "S" point of connection
     * if `dir` does not exist, check for all connection data that has no "S" point of connection
     * @param dir "N" or undefined
     * @returns Array of Style,Direction string pair arrays for valid options
     */
    checkAbove(dir: string | undefined) {
        // If `dir` is provided, search for all "S" to "N" connections
        // EX. Checking all "S" to "N" connections
        // Compile list of `connectionTable` entries containing "N"
        // If no `dir` provided, search inversely to this ^^
        return (dir) ? this.staticLooper(dir) : this.staticLooper("N", true);
    },
    /**
     * This method handles searching the connection table for valid options given the value of `dir`
     * if `dir` exists check for all connection data that has a "W" point of connection
     * if `dir` does not exist, check for all connection data that has no "W" point of connection
     * @param dir "E" or undefined
     * @returns Array of Style,Direction string pair arrays for valid options
     */
    checkRight(dir: string | undefined) {
        return (dir) ? this.staticLooper(dir) : this.staticLooper("E", true);
    },
    /**
     * This method handles searching the connection table for valid options given the value of `dir`
     * if `dir` exists check for all connection data that has a "N" point of connection
     * if `dir` does not exist, check for all connection data that has no "N" point of connection
     * @param dir "S" or undefined
     * @returns Array of Style,Direction string pair arrays for valid options
     */
    checkBelow(dir: string | undefined) {
        return (dir) ? this.staticLooper(dir) : this.staticLooper("S", true);
    },
    /**
     * This method handles searching the connection table for valid options given the value of `dir`
     * if `dir` exists check for all connection data that has a "E" point of connection
     * if `dir` does not exist, check for all connection data that has no "E" point of connection
     * @param dir "W" or undefined
     * @returns Array of Style,Direction string pair arrays for valid options
     */
    checkLeft(dir: string | undefined) {
        return (dir) ? this.staticLooper(dir) : this.staticLooper("W", true);
    },
    checkAnon(dir: string, useInverse=false) {
        return this.staticLooper(dir, useInverse);
    },
    checkForDirFromOptions(dir: string, options: Array<Array<string>>) {

        // dir should be inverse of check being made. 
        // if looking for "N" to "S" con as checked from below `this.checkAbove()`,
        // Looking for matches of "S"
        let dirMatchFound = false;

        for (const [s, d] of options){
            const styleMatch = connectionTable[s as unknown as TileStyle];
            const dirStyleMatch = styleMatch[d as unknown as TileDir];

            if ([...dirStyleMatch.map(arr => arr[0])].includes(dir)){
                // Direction match found
                dirMatchFound = true;
                break;
            } else continue; // Direction match not found, keep trying
        }

        return dirMatchFound;
    },
    validateConnectionOptions(dirList: Array<string>) {
        const staticDirections = ["N", "E", "S", "W"];

        const validConnectors: Array<Array<string>> = [];

        for (const style in TileStyle){
            if (isNaN(Number(style))) continue;
            const styleMatch = connectionTable[style as unknown as TileStyle];
            for (const direct in TileDir){
                if (isNaN(Number(direct))) continue;
                const dirStyleMatch = styleMatch[direct as unknown as TileDir];

                let matchCountCollector = 0;
                for (const staticDir of staticDirections){
                    const checkInverse = !dirList.includes(staticDir);

                    // console.log(`Checking ${(checkInverse) ? 'Inverse of ': ''}direction matching ${staticDir}`);

                    const hasMatch = (checkInverse)
                    ? ![...dirStyleMatch.map(arr => arr[0])].includes(staticDir)
                    : [...dirStyleMatch.map(arr => arr[0])].includes(staticDir);

                    matchCountCollector += +hasMatch;
                }

                if (matchCountCollector === 4) validConnectors.push([style, direct]);
            }
        }

        return validConnectors;
        
        for (const staticDir of staticDirections){
            const checkInverse = !dirList.includes(staticDir);
            
            switch(staticDir){
                case "N":
                    validConnectors.push(...this.checkAbove((checkInverse) ? undefined : staticDir));
                break;
                case "E":
                    validConnectors.push(...this.checkRight((checkInverse) ? undefined : staticDir));
                break;
                case "S":
                    validConnectors.push(...this.checkBelow((checkInverse) ? undefined : staticDir));
                break;
                case "W":
                    validConnectors.push(...this.checkLeft((checkInverse) ? undefined : staticDir));
                break;
            }
        }

        const filteredCollector: Array<Array<string>> = [];

        const isDupe = (dirStyle: Array<string>) => {
            const [s1, d1] = dirStyle;
            return filteredCollector.some(([s2, d2]) => s2 === s1 && d2 === d1);
        };

        for (const ds of validConnectors){
            if (!filteredCollector.length) {
                filteredCollector.push(ds);
                continue;
            }

            if (!isDupe(ds)) filteredCollector.push(ds);
        }

        return filteredCollector;
    }
};


// function blankMock(): void {
//     return;
// }

type CellLoader = {
    id: number;
    collapsed: boolean;
    options: Array<Array<string>>;
    connections?: Array<Array<Con>>;
};

export function createLevel(footPrint: LevelArgs): RawTile[] {
    let cells: Array<CellLoader> = [];

    interface RulesetMap extends Map<string, Map<string, Map<string, Array<Array<string>>>>> {

    };

    // Dynamically load the ruleset from the static lookup table.
    function generateRuleset(): RulesetMap {
        const finalRules: RulesetMap = new Map();

        for (const style in TileStyle) {
            if (isNaN(Number(style))) continue;

            const directConnectMap = new Map();

            for (const direct in TileDir) {
                if (isNaN(Number(direct))) continue;

                const styleMatch = connectionTable[style as unknown as TileStyle];
                const dirStyleMatch = styleMatch[direct as unknown as TileDir];

                // This needs to be built as the valid [style, direction] option pairs,
                // ordered as "N", "E", "S", "W"

                // EX: 1st Itter ["1", "1"]: valid connections are "N", "E", "S", "W"
                // EX: This Cell checks below and finds that Cell has ["1", "1"] as a valid option
                // Therefore: VVV these [style, direction] option pairs are valid choices
                /**
                 *  [
                 *      ["1", "1"],
                 *      ["1", "2"],
                 *      ["1", "4"],
                 *      ["1", "8"],
                 *      ["2", "4"],
                 *      ["4", "2"],
                 *      ["4", "4"],
                 *      ["4", "8"],
                 *      ["8", "2"],
                 *      ["8", "4"],
                 *      ["16", "1"],
                 *      ["16", 4]
                 *  ]
                 */
                const validDirConnectors: Map<string, Array<Array<string>>> = new Map();

                for (const d of ["N", "E", "S", "W"]) {
                    const useInverse = !dirStyleMatch.map(arr => arr[0]).includes(d);
                    // const checkFor = (useInverse) ? undefined : d;
                    // console.log(`Checking ${d}, using inverse?: ${useInverse}`);
                    switch(d){
                        case "N":
                            validDirConnectors.set(d, connectionMatches.checkAnon("S", useInverse));
                        break;
                        case "E":
                            validDirConnectors.set(d, connectionMatches.checkAnon("W", useInverse));
                        break;
                        case "S":
                            validDirConnectors.set(d, connectionMatches.checkAnon("N", useInverse));
                        break;
                        case "W":
                            validDirConnectors.set(d, connectionMatches.checkAnon("E", useInverse));
                        break;
                        
                    }
                }

                directConnectMap.set(direct, validDirConnectors);
            }

            finalRules.set(style, directConnectMap);
        }

        return finalRules;
    }



    const ruleset = generateRuleset();

    // console.table(ruleset);

    let DIM = 2;

    if (!footPrint.dim && footPrint.height && footPrint.width) {
        DIM = footPrint.height * footPrint.width;
    } else if (footPrint.dim) {
        DIM = footPrint.dim;
    }

    // Create 1D array that simulates 2D "grid"
    for (let i = 0; i < DIM * DIM; i++) {

        // DIM = length of 1 side. EX: DIM = 4; width = 4, height = 4;
        // Therefore while i < 4 modify initial "N" connection options 
        const isTopBorder = i < DIM;
        // If (i + 1) % DIM = 0 modify initial "E" connection options
        const isRightBorder = ((i + 1) % DIM) === 0;
        // If DIM - i < 4 modify initial "S" connection options
        const isBottomBorder = ((DIM * DIM) - i) < DIM;
         // If i % DIM = 0 modify initial "W" connection options 
        const isLeftBorder = (i % DIM) === 0;

        const useOptionMods = () => {
            return isTopBorder || isRightBorder || isBottomBorder || isLeftBorder;
        };

        let optionMods: Array<string> | undefined = (useOptionMods()) 
        ? []
        : undefined;

        if (optionMods) {
            if (isTopBorder){
                optionMods.push("N");
            }

            if (isRightBorder){
                optionMods.push("E");
            }

            if (isBottomBorder){
                optionMods.push("S");
            }

            if (isLeftBorder){
                optionMods.push("W");
            }
        }

        // Each cell starts with all options it should ever see!!
        cells[i] = {
            id: i + 1,
            collapsed: false,
            options: connectionMatches.grabAllOptions(optionMods)
        };
    }

    // Handle collapsing one cell at a time
    let finished = false, failSafe = 0;
    do {
        cells = collapseCycle();
        // console.table(cells);
        if (cells.filter(c => !c.collapsed).length === 0) finished = true;
        
        if (failSafe >= 2 + (DIM * DIM)) break;
        failSafe++;
    } while (!finished);


    /**
     * This function handles all entropic evaluations, as well as validating valid options given each 
     * collapse cycle that passes, updating tiles when/where needed
     * 
     * Also handles assigning ID values to directions, this is done **ONLY** to the cell collapsed for the given cycle.
     * This evaluation is contained to happen only once per cycle
     * @returns Updated cellData array after one collapse cycle
     */
    function collapseCycle() {
        const shallowCellsCopy = cells.slice().filter(cell => !cell.collapsed);
        shallowCellsCopy.sort((a, b) => {
            return a.options.length - b.options.length;
        });

        console.table(shallowCellsCopy);

        // Pulling all cells with matching entropy, picking one to be collapsed
        const collapseChoices = shallowCellsCopy.filter(cell => cell.options.length === shallowCellsCopy[0].options.length);
        const cellPicked = randArrPos(collapseChoices);

        function debugCellOptions(c: CellLoader) {
            if (!c.options.length) {
                console.warn('Cell (ID: %d) has no available options!', c.id);
                return;
            }

            type DebugCell = {
                style: string;
                direction: string;
                connections: Array<Array<string>>;
            };

            const displayReadyData: Array<DebugCell> = [];
            for (const [s, d] of c.options){
                const styleMatch = connectionTable[s as unknown as TileStyle];
                const dirStyleMatch = styleMatch[d as unknown as TileDir];
                
                displayReadyData.push({style: s, direction: d, connections: dirStyleMatch});
            }

            console.log('Cell (ID: %d) is being collapsed', c.id);
            console.table(displayReadyData);

            // for (const conDataArr of displayReadyData){

            //     console.table(conDataArr);
            // }
        }

        debugCellOptions(cellPicked);

        cellPicked.collapsed = true;
        cellPicked.options = [randArrPos(cellPicked.options)];
        cellPicked.connections = connectionMatches.grabFinalConnections(cellPicked.options[0][0], cellPicked.options[0][1]);

        console.log('Cell (ID: %d) was collapsed into (Style: %d, Direction: %d)', cellPicked.id, cellPicked.options[0][0], cellPicked.options[0][1]);

        // ===================
        // Implement id filler 
        // ===================
        // - Assign ID's given connection data
        // - Locate neigbours using connection directions

        // Concept works at updating cell ids, needs some slight logic checks for OOB id attempts
        // Cell collapsing needs extra checks as well, OOB, issues.

        for (const con of cellPicked.connections){
            // j = row
            // i = col
            let j = Math.floor(cellPicked.id / DIM);
            let i = cellPicked.id - DIM * j;
            switch(con[0]){
                case "N":
                    // Look at tile above, push id
                    // i + (j - 1) * DIM
                    // j = Math.floor(cellPicked.id / DIM)
                    // i = cellPicked.id - DIM * j
                    con[1] = (i + (j - 1) * DIM);
                break;
                case "E":
                    // Look at tile to the right, push id
                    // i + 1 + j * DIM
                    con[1] = (i + 1 + j * DIM);
                break;
                case "S":
                    // Look at tile below, push id
                    // i + (j + 1) * DIM
                    con[1] = (i + (j + 1) * DIM);
                break;
                case "W":
                    // Look at tile to the left, push id
                    // i - 1 + j * DIM
                    con[1] = (i - 1 + j * DIM);
                break;
            }
        }


        const nextCells: Array<CellLoader> = [];
        for (let j = 0; j < DIM; j++){
            for (let i = 0; i < DIM; i++){
                let idx = i + j * DIM;
                // Cell is completed, shift contents and continue
                if (cells[idx].collapsed){
                    nextCells[idx] = cells[idx];
                    
                } else {
                    // Retain initial option list as reference.
                    const initialOptions = cells[idx].options;
                    let optionCollection = initialOptions;

                    // if (initialOptions.length < 20) {
                    //     nextCells[idx] = {
                    //         id: cells[idx].id,
                    //         collapsed: false,
                    //         options: initialOptions
                    //     };

                    //     continue;
                    // }


                    // =================
                    //    Check North
                    // =================
                    if (j > 0){
                        const NORTH = cells[i + (j - 1) * DIM];
                        let validOptions: Array<Array<string>> = [];
                        for (const [s, d] of NORTH.options){
                            const optionList = ruleset.get(s)?.get(d)?.get("N");
                            if (optionList) validOptions.push(...optionList);
                        }

                        let filteredOptions: Array<Array<string>> = [];
                        for (const [s, d] of validOptions){
                            if (!filteredOptions.length) filteredOptions.push([s, d]);

                            let isDupe = false;
                            for (const [s1, d2] of filteredOptions){
                                if (s === s1 && d === d2) {
                                    isDupe = true;
                                    break;
                                }
                            }

                            if (!isDupe) filteredOptions.push([s, d]);
                        }

                        validOptions = filteredOptions;

                        console.log('=== NORTH CELL OPTIONS ===');
                        console.table(validOptions);

                        optionCollection = optionCollection.concat(validOptions);
                    }

                    // =================
                    //    Check East
                    // =================
                    if (i < DIM - 1){
                        const EAST = cells[i + 1 + j * DIM];
                        let validOptions: Array<Array<string>> = [];
                        for (const [s, d] of EAST.options){
                            const optionList = ruleset.get(s)?.get(d)?.get("E");
                            if (optionList) validOptions.push(...optionList);
                        }

                        let filteredOptions: Array<Array<string>> = [];
                        for (const [s, d] of validOptions){
                            if (!filteredOptions.length) filteredOptions.push([s, d]);

                            let isDupe = false;
                            for (const [s1, d2] of filteredOptions){
                                if (s === s1 && d === d2) {
                                    isDupe = true;
                                    break;
                                }
                            }

                            if (!isDupe) filteredOptions.push([s, d]);
                        }

                        validOptions = filteredOptions;

                        console.log('=== EAST CELL OPTIONS ===');
                        console.table(validOptions);

                        optionCollection = optionCollection.concat(validOptions);
                    }

                    // =================
                    //    Check South
                    // =================
                    if (j < DIM - 1){
                        const SOUTH = cells[i + (j + 1) * DIM];
                        let validOptions: Array<Array<string>> = [];
                        for (const [s, d] of SOUTH.options){
                            const optionList = ruleset.get(s)?.get(d)?.get("S");
                            if (optionList) validOptions.push(...optionList);
                        }

                        let filteredOptions: Array<Array<string>> = [];
                        for (const [s, d] of validOptions){
                            if (!filteredOptions.length) filteredOptions.push([s, d]);

                            let isDupe = false;
                            for (const [s1, d2] of filteredOptions){
                                if (s === s1 && d === d2) {
                                    isDupe = true;
                                    break;
                                }
                            }

                            if (!isDupe) filteredOptions.push([s, d]);
                        }

                        validOptions = filteredOptions;

                        console.log('=== SOUTH CELL OPTIONS ===');
                        console.table(validOptions);

                        optionCollection = optionCollection.concat(validOptions);
                    }

                    // =================
                    //     Check West
                    // =================
                    if (i > 0){
                        const WEST = cells[i - 1 + j * DIM];
                        let validOptions: Array<Array<string>> = [];
                        for (const [s, d] of WEST.options){
                            const optionList = ruleset.get(s)?.get(d)?.get("W");
                            if (optionList) validOptions.push(...optionList);
                        }

                        let filteredOptions: Array<Array<string>> = [];
                        for (const [s1, d1] of validOptions){
                            if (!filteredOptions.length) filteredOptions.push([s1, d1]);

                            let isDupe = false;
                            for (const [s2, d2] of filteredOptions){
                                if (s1 === s2 && d1 === d2) {
                                    isDupe = true;
                                    break;
                                }
                            }

                            if (!isDupe) filteredOptions.push([s1, d1]);
                        }

                        validOptions = filteredOptions;
                        
                        console.log('=== WEST CELL OPTIONS ===');
                        console.table(validOptions);

                        optionCollection = optionCollection.concat(validOptions);
                    }

                    const finalFilteredOptions: Array<Array<string>> = [];
                    for (const [s1, d1] of optionCollection){
                        if (!finalFilteredOptions.length) finalFilteredOptions.push([s1, d1]);

                        let isDupe = false;
                        for (const [s2, d2] of finalFilteredOptions){
                            if (s1 === s2 && d1 === d2) {
                                isDupe = true;
                                break;
                            }
                        }

                        if (!isDupe) finalFilteredOptions.push([s1, d1]);
                    }

                    // Cell is not collapsed, perform magic math
                    // Collecting valid direction connection points, direction will not be present
                    // if invalid/no connection exists
                    // const directionCollector: Array<string> = [];

                    // // const initialDirections = ["N", "E", "S", "W"];

                    // // =================
                    // //    Check Above
                    // // =================
                    // if (j > 0){
                    //     //console.log('== LOOKING UP ==');

                    //     let above = cells[i + (j - 1) * DIM];
                    //     // console.log(
                    //     //     'Tile Above (ID: %d) has "S" connection: ', 
                    //     //     above.id,
                    //     //     connectionMatches.checkForDirFromOptions("S", above.options)
                    //     // );

                    //     // This logic needs to be "unseen" when looking at uncollapsed cells
                    //     // AS IS: will auto ignore any inverse connection data due to algorithm
                    //     if (connectionMatches.checkForDirFromOptions("S", above.options)) {
                    //         directionCollector.push("N");
                    //     } 
                    // }

                    // // =================
                    // //    Check Right
                    // // =================
                    // if (i < DIM - 1){
                    //     //console.log('== LOOKING RIGHT ==');

                    //     let right = cells[i + 1 + j * DIM];
                    //     // console.log(
                    //     //     'Tile Right (ID: %d) has "W" connection: ', 
                    //     //     right.id,
                    //     //     connectionMatches.checkForDirFromOptions("W", right.options)
                    //     // );

                    //     if (connectionMatches.checkForDirFromOptions("W", right.options)) {
                    //         directionCollector.push("E");
                    //     } 
                    // }

                    // // =================
                    // //    Check Below
                    // // =================
                    // if (j < DIM - 1){
                    //     //console.log('== LOOKING DOWN ==');

                    //     let below = cells[i + (j + 1) * DIM];
                    //     // console.log(
                    //     //     'Tile Below (ID: %d) has "N" connection: ', 
                    //     //     below.id,
                    //     //     connectionMatches.checkForDirFromOptions("N", below.options)
                    //     // );

                    //     if (connectionMatches.checkForDirFromOptions("N", below.options)){
                    //         directionCollector.push("S");
                    //     } 
                    // }

                    // // =================
                    // //     Check Left
                    // // =================
                    // if (i > 0){
                    //     //console.log('== LOOKING LEFT ==');

                    //     let left = cells[i - 1 + j * DIM];
                    //     // console.log(
                    //     //     'Tile Left (ID: %d) has "E" connection: ', 
                    //     //     left.id,
                    //     //     connectionMatches.checkForDirFromOptions("E", left.options)
                    //     // );

                    //     if (connectionMatches.checkForDirFromOptions("E", left.options)){
                    //         directionCollector.push("W");
                    //     } 
                    // }

                    // const finalOptions: Array<Array<string>> = [];

                    const finalOptions = finalFilteredOptions;

                    // LOGIC UPDATE NEEDED
                    // Compile a list of connection matches, using that array to filter for valid
                    // options when repopulating cell options

                    // directionCollector.push(...initialDirections);

                    // Handle enforced OOB options influence
                    // EX: cell @ index 0 (Top Left) should never try to connect "N" or "W"

                    console.log('Cell (ID: %d) has %d Options before validation', cells[idx].id, cells[idx].options.length);

                    // finalOptions.push(...connectionMatches.validateConnectionOptions(directionCollector));

                    // console.table(finalOptions);
                    console.log('Cell (ID: %d) has %d Options after validation', cells[idx].id, finalOptions.length);

                    nextCells[idx] = {
                        id: cells[idx].id,
                        collapsed: false,
                        options: finalOptions
                    };
                }
            }
        }

        return nextCells;
    }

    const loadedLevel = cells.map(cell => ({ id: cell.id, connections: cell.connections ?? [["", 0]] }));

    // TEMP EARLY RETURN
    return loadedLevel;
}


const simpleRules = {
    Open_North: {
        North: 1,
        East: 1,
        South: 1,
        West: 1,
        Connections: [["N"], ["E"], ["S"], ["W"]]
    },
    Open_East: {
        North: 1,
        East: 1,
        South: 1,
        West: 1,
        Connections: [["N"], ["E"], ["S"], ["W"]]
    },
    Open_South: {
        North: 1,
        East: 1,
        South: 1,
        West: 1,
        Connections: [["N"], ["E"], ["S"], ["W"]]
    },
    Open_West: {
        North: 1,
        East: 1,
        South: 1,
        West: 1,
        Connections: [["N"], ["E"], ["S"], ["W"]]
    },
    Closed_North: {
        North: 1,
        East: 0,
        South: 0,
        West: 0,
        Connections: [["N"]]
    },
    Closed_East: {
        North: 0,
        East: 1,
        South: 0,
        West: 0,
        Connections: [["E"]]
    },
    Closed_South: {
        North: 0,
        East: 0,
        South: 1,
        West: 0,
        Connections: [["S"]]
    },
    Closed_West: {
        North: 0,
        East: 0,
        South: 0,
        West: 1,
        Connections: [["W"]]
    },
    T_North: {
        North: 1,
        East: 1,
        South: 0,
        West: 1,
        Connections: [["N"], ["E"], ["W"]]
    },
    T_East: {
        North: 1,
        East: 1,
        South: 1,
        West: 0,
        Connections: [["N"], ["E"], ["S"]]
    },
    T_South: {
        North: 0,
        East: 1,
        South: 1,
        West: 1,
        Connections: [["S"], ["E"], ["W"]]
    },
    T_West: {
        North: 1,
        East: 0,
        South: 1,
        West: 1,
        Connections: [["N"], ["S"], ["W"]]
    },
    L_North: {
        North: 1,
        East: 1,
        South: 0,
        West: 0,
        Connections: [["N"], ["E"]],
    },
    L_East: {
        North: 0,
        East: 1,
        South: 1,
        West: 0,
        Connections: [["E"], ["S"]],
    },
    L_South: {
        North: 0,
        East: 0,
        South: 1,
        West: 1,
        Connections: [["S"], ["W"]],
    },
    L_West: {
        North: 1,
        East: 0,
        South: 0,
        West: 1,
        Connections: [["W"], ["N"]],
    },
};

type RuleKey = keyof typeof simpleRules;

const levelCellLoader = {
    loadDefaultOptions(): ReturnType<string[] extends RuleKey ? any : any> {
        return Object.keys(simpleRules).map((k) => k);
    }
}


export class LevelCell {
    id: number;
    collapsed: boolean;
    options: Array<RuleKey>;
    connections?: Array<Array<Con>>;

    constructor(idx: number, givenOptions: Array<RuleKey> | undefined) {
        this.id = idx + 1;
        this.collapsed = false;
        this.options = (givenOptions) ? givenOptions : levelCellLoader.loadDefaultOptions();
    }
};

/**
 * This function handles filtering out cell options given a lookup direction and valid connection state list 
 * @param conTypes Passed as an array of "state" values as numbers
 * @param availableOptions List of options modified during validation for each cell neigbour
 * @param conDirect The direction currently being checked
 * @returns List of valid options remaining after connection state filtering
 */
export function filterForConnection(conTypes: Array<number | RuleKey>, availableOptions: Array<RuleKey>, conDirect: string) {
    const oKeys = availableOptions;

    // This is done to enforce the typing applied/viewed during filtering
    const filterKeys = conTypes.filter(t => typeof t === 'number');

    const validReturn: Array<RuleKey> = [];
    for (const k of oKeys){
        switch(conDirect){
            case "North":
                if (filterKeys.includes(simpleRules[k].North)) validReturn.push(k);
            break;
            case "East":
                if (filterKeys.includes(simpleRules[k].East)) validReturn.push(k);
            break;
            case "South":
                if (filterKeys.includes(simpleRules[k].South)) validReturn.push(k);
            break;
            case "West":
                if (filterKeys.includes(simpleRules[k].West)) validReturn.push(k);
            break;
        }
    }

    return validReturn;
}

/**
 * This function modifies the given `optArr` to include only elements that are found within the given `validArr`
 * @param optArr Current list of options modified by previous neigbour cell checks
 * @param validArr List of all valid options after filtering
 */
export function validateOptions(optArr: Array<RuleKey>, validArr: Array<RuleKey | number>) {
    for (let i = optArr.length - 1; i >= 0; i--){
        let ele = optArr[i];
        if (!validArr.includes(ele)){
            optArr.splice(i, 1);
        }
    }
}

/**
 * This function handles the following in order:
 * 
 * 1) Collapse cell with lowest entropy selecting one style option as its state
 * 
 * 
 * 2) Update Collapsed Cell's connection data array to include neigbouring cell ids for game managment
 * 
 * 
 * 3) Loop through all uncollapsed cells, reducing valid options as applicable
 * 3) Check clockwise, North, East, South, West, evaluating options reducing invalid entries
 * 3) Apply changes to options adding an updated `LevelCell` at the matching index within the `nextLevel` array
 *
 * 4) Return level data after evaluations are complete
 * @param level Entire level storage array
 * @param DIM level storage Dimensions
 * @returns Updated level storage array after one collapse cycle
 */
export function cellCycle(level: Array<LevelCell>, DIM: number) {
    let levelCopy = level.slice();
    levelCopy = levelCopy.filter(c => !c.collapsed);
    levelCopy.sort((a, b) => {
        return a.options.length - b.options.length;
    });

    const cellPicked = randArrPos(levelCopy.filter(c => c.options.length === levelCopy[0].options.length));

    cellPicked.collapsed = true;
    cellPicked.options = [randArrPos(cellPicked.options)];
    cellPicked.connections = simpleRules[cellPicked.options[0]].Connections.map(c => [...c]);

    for (const cData of cellPicked.connections){
        //let j = Math.floor(cellPicked.id / DIM);
        //let i = cellPicked.id - DIM * j;
        switch(cData[0]){
            case "N":
                // Look at tile above, push id
                // i + (j - 1) * DIM
                // j = Math.floor(cellPicked.id / DIM)
                // i = cellPicked.id - DIM * j
                if (cellPicked.id > DIM) {
                    cData[1] = cellPicked.id - DIM;
                } else {
                    cData[1] = -1;
                }
                //console.log(`Cell (ID: ${cellPicked.id}) North of collapsed: `, cData[1]);
                // const cellAbove = level.find(c => c.id === cData[1]);
                // if (cellAbove) console.log('Cell (ID: %d) North of collapsed: ', cellAbove.id, cellAbove);
            break;
            case "E":
                // Look at tile to the right, push id
                // i + 1 + j * DIM
                if (cellPicked.id % DIM !== 0) {
                    cData[1] = cellPicked.id + 1;
                } else {
                    cData[1] = -1;
                }
                //console.log(`Cell (ID: ${cellPicked.id}) East of collapsed: `, cData[1]);
                // const cellRight = level.find(c => c.id === cData[1]);
                // if (cellRight) console.log('Cell (ID: %d) East of collapsed: ', cellRight.id, cellRight);
            break;
            case "S":
                // Look at tile below, push id
                // i + (j + 1) * DIM
                if (cellPicked.id <= DIM * (DIM - 1)) {
                    cData[1] = cellPicked.id + DIM;
                } else {
                    cData[1] = -1;
                }
                //console.log(`Cell (ID: ${cellPicked.id}) South of collapsed: `, cData[1]);
                // const cellBelow = level.find(c => c.id === cData[1]);
                // if (cellBelow) console.log('Cell (ID: %d) South of collapsed: ', cellBelow.id, cellBelow);
            break;
            case "W":
                // Look at tile to the left, push id
                // i - 1 + j * DIM
                if ((cellPicked.id - 1) % DIM !== 0) {
                    cData[1] = cellPicked.id - 1;
                } else {
                    cData[1] = -1;
                }
                //console.log(`Cell (ID: ${cellPicked.id}) West of collapsed: `, cData[1]);
                // const cellLeft = level.find(c => c.id === cData[1]);
                // if (cellLeft) console.log('Cell (ID: %d) West of collapsed: ', cellLeft.id, cellLeft);
            break;
        }
    }

    console.log('CELL COLLAPSED', cellPicked);

    const nextLevel: Array<LevelCell> = [];

    for (let j = 0; j < DIM; j++){
        for (let i = 0; i < DIM; i++){
            let idx = i + j * DIM;

            if (level[idx].collapsed){
                nextLevel[idx] = level[idx];
                continue;
            }

            let options: Array<RuleKey> = levelCellLoader.loadDefaultOptions();

            // NORTH
            if (j > 0) {
                const NORTH = level[i + (j - 1) * DIM];
                let validOptions: Array<number | RuleKey> = [];
                for (let option of NORTH.options){
                    let valid = simpleRules[option].South;
                    validOptions = validOptions.concat(valid);
                }

                //console.log('I AM CELL %d Valid connection states NORTH: ', idx + 1, validOptions);

                validOptions = filterForConnection(validOptions, options, "North");

                validateOptions(options, validOptions);
            }

            // EAST
            if (i < DIM - 1) {
                const EAST = level[i + 1 + j * DIM];
                let validOptions: Array<number | RuleKey> = [];
                for (let option of EAST.options){
                    let valid = simpleRules[option].West;
                    validOptions = validOptions.concat(valid);
                }

                //console.log('I AM CELL %d Valid connection states EAST: ', idx + 1, validOptions);

                validOptions = filterForConnection(validOptions, options, "East");

                validateOptions(options, validOptions);
            }

            // SOUTH
            if (j < DIM - 1) {
                const SOUTH = level[i + (j + 1) * DIM];
                let validOptions: Array<number | RuleKey> = [];
                for (let option of SOUTH.options){
                    let valid = simpleRules[option].North;
                    validOptions = validOptions.concat(valid);
                }

                //console.log('I AM CELL %d Valid connection states SOUTH: ', idx + 1, validOptions);

                validOptions = filterForConnection(validOptions, options, "South");

                validateOptions(options, validOptions);
            }

            // WEST
            if (i > 0) {
                const WEST = level[i - 1 + j * DIM];
                let validOptions: Array<number | RuleKey> = [];
                for (let option of WEST.options){
                    let valid = simpleRules[option].East;
                    validOptions = validOptions.concat(valid);
                }

                //console.log('I AM CELL %d Valid connection states WEST: ', idx + 1, validOptions);

                validOptions = filterForConnection(validOptions, options, "West");

                validateOptions(options, validOptions);
            }


            nextLevel[idx] = new LevelCell(idx, options);
        }
    }

    return nextLevel;
}

/**
 * This function is used to transform the level generation cell data into the base raw data needed for final map loading/rendering
 * @param level Entire level storage array
 * @returns Given level data converted to `RawTile` data as an array
 */
export function convertToRawTiles(level: Array<LevelCell>) {
    return level.map(cell => ({ id: cell.id, connections: cell.connections ?? [["", 1]] }));
}



export function simplifiedLevelGenTest() {
    const DIM = 8;

    let level: Array<LevelCell> = Array.from([...new Array(DIM * DIM).fill(0)].map((_, idx, arr) => arr[idx] = new LevelCell(idx, undefined)));

    // console.log(level);

    let loopFor = DIM * DIM;

    do {
        level = cellCycle(level, DIM);
        // console.table(level);
        if (level.filter(c => !c.collapsed).length <= 0) break;

        loopFor--;
    } while (loopFor > 0);

    return convertToRawTiles(level);
}