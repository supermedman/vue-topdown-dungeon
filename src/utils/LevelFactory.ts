
import { Con, RawTile } from "../typing/Tiles";
import { randArrPos } from "./LogicHelpers";

interface LevelArgs {
    dim?: number;
    width?: number;
    height?: number;
};

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
    grabAllOptions() {
        const fullOptionList: Array<Array<string>> = [];

        for (const style in TileStyle){
            //if (useSymbol && !isNaN(Number(style))) continue;
            if (isNaN(Number(style))) continue;
            for (const direct in TileDir){
                //if (useSymbol && !isNaN(Number(direct))) continue;
                if (isNaN(Number(direct))) continue;
                fullOptionList.push([style, direct]);
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
    checkAbove(dir: string | undefined) {
        // If `dir` is provided, search for all "S" to "N" connections
        // EX. Checking all "S" to "N" connections
        // Compile list of `connectionTable` entries containing "N"
        // If no `dir` provided, search inversely to this ^^
        return (dir) ? this.staticLooper(dir) : this.staticLooper("N", true);
    },
    checkRight(dir: string | undefined) {
        return (dir) ? this.staticLooper(dir) : this.staticLooper("E", true);
    },
    checkBelow(dir: string | undefined) {
        return (dir) ? this.staticLooper(dir) : this.staticLooper("S", true);
    },
    checkLeft(dir: string | undefined) {
        return (dir) ? this.staticLooper(dir) : this.staticLooper("W", true);
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

                    const hasMatch = (checkInverse)
                    ? ![...dirStyleMatch.map(arr => arr[0])].includes(staticDir)
                    : [...dirStyleMatch.map(arr => arr[0])].includes(staticDir);

                    matchCountCollector += +hasMatch;
                }

                if (matchCountCollector === 4) validConnectors.push([style, direct]);
            }
        }

        return validConnectors;
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

    let DIM = 2;

    if (!footPrint.dim && footPrint.height && footPrint.width) {
        DIM = footPrint.height * footPrint.width;
    } else if (footPrint.dim) {
        DIM = footPrint.dim;
    }

    // Create 1D array that simulates 2D "grid"
    for (let i = 0; i < DIM * DIM; i++) {
        cells[i] = {
            id: i + 1,
            collapsed: false,
            options: connectionMatches.grabAllOptions()
        };
    }

    // console.table(cells);

    // Handle collapsing one cell at a time
    let finished = false, failSafe = 0;
    do {
        cells = collapseCycle();
        console.table(cells);
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

        // console.log('Lowest entropy: ', shallowCellsCopy[0]);

        // Pulling all cells with matching entropy, picking one to be collapsed
        const collapseChoices = shallowCellsCopy.filter(cell => cell.options.length === shallowCellsCopy[0].options.length);
        const cellPicked = randArrPos(collapseChoices);

        cellPicked.collapsed = true;
        cellPicked.options = [randArrPos(cellPicked.options)];
        cellPicked.connections = connectionMatches.grabFinalConnections(cellPicked.options[0][0], cellPicked.options[0][1]);

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
                    continue;
                }

                // Cell is not collapsed, perform magic math
                // Collecting valid direction connection points, direction will not be present
                // if invalid/no connection exists
                const directionCollector: Array<string> = [];

                // =================
                //    Check Above
                // =================
                if (j > 0){
                    //console.log('== LOOKING UP ==');

                    let above = cells[i + (j - 1) * DIM];
                    console.log(
                        'Tile Above (ID: %d) has "S" connection: ', 
                        above.id,
                        connectionMatches.checkForDirFromOptions("S", above.options)
                    );

                    if (connectionMatches.checkForDirFromOptions("S", above.options)) 
                        directionCollector.push("N");
                }

                // =================
                //    Check Right
                // =================
                if (i < DIM - 1){
                    //console.log('== LOOKING RIGHT ==');

                    let right = cells[i + 1 + j * DIM];
                    console.log(
                        'Tile Right (ID: %d) has "W" connection: ', 
                        right.id,
                        connectionMatches.checkForDirFromOptions("W", right.options)
                    );

                    if (connectionMatches.checkForDirFromOptions("W", right.options))
                        directionCollector.push("E");
                }

                // =================
                //    Check Below
                // =================
                if (j < DIM - 1){
                    //console.log('== LOOKING DOWN ==');

                    let below = cells[i + (j + 1) * DIM];
                    console.log(
                        'Tile Below (ID: %d) has "N" connection: ', 
                        below.id,
                        connectionMatches.checkForDirFromOptions("N", below.options)
                    );

                    if (connectionMatches.checkForDirFromOptions("N", below.options))
                        directionCollector.push("S");
                }

                // =================
                //     Check Left
                // =================
                if (i > 0){
                    //console.log('== LOOKING LEFT ==');

                    let left = cells[i - 1 + j * DIM];
                    console.log(
                        'Tile Left (ID: %d) has "E" connection: ', 
                        left.id,
                        connectionMatches.checkForDirFromOptions("E", left.options)
                    );

                    if (connectionMatches.checkForDirFromOptions("E", left.options))
                        directionCollector.push("W");
                }

                const finalOptions: Array<Array<string>> = [];

                // LOGIC UPDATE NEEDED
                // Compile a list of connection matches, using that array to filter for valid
                // options when repopulating cell options

                finalOptions.push(...connectionMatches.validateConnectionOptions(directionCollector));

                // console.table(finalOptions);

                nextCells[idx] = {
                    id: cells[idx].id,
                    collapsed: false,
                    options: finalOptions
                };
            }
        }

        return nextCells;
    }

    const loadedLevel = cells.map(cell => ({ id: cell.id, connections: cell.connections ?? [["", 0]] }));

    // TEMP EARLY RETURN
    return loadedLevel;
}