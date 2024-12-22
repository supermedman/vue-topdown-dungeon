import { MakerMap } from "../utils/LevelFactory";
import { randArrPos, rollChanceLTE } from "../utils/LogicHelpers";

type Mapish = { [k: string]: boolean };
export type Con = keyof Mapish;

export interface RawTile {
    id: number;
    connections: Con[][];
};

/**
 * Used as base for both Logic Tiles as `MapTile` and 
 * Rendering Cells as `CellData`
 */
export class TileData {
    id = 0;
    connections = [["", 0]];

    constructor(tileData: RawTile){
        this.id = tileData.id;
        this.connections = tileData.connections;
    }
};

/**
 * Used for controller logic and handling, used as the middleware for user inputs
 */
export class MapTile extends TileData {
    constructor(tileData: TileData){
        super(tileData);
    }

    updateInternals(newData: TileData) {
        this.id = newData.id;
        this.connections = newData.connections;
    }
    
    enabledConnections(){
        return this.connections.map(([k,]) => k);
    }

    moveDirectionsID(direction: string){
        return this.connections.find(([k,]) => k === direction)?.[1] ?? this.id;
    }
};

enum ContentType {
    Item = 1,
    Enemy = 2,
    Event = 3
};

interface CellContent {
    type: ContentType;
};

/**
 * Used to store static level data for rendering, and dynamic data for user interactive
 * elements: such as contents
 */
export class CellData extends TileData {
    activeCell = false;
    contents: Array<CellContent>;
    hasContents = false;
    rolledContents = false;
    accessPath: Array<number> = [];
    constructor(tileData: TileData){
        super(tileData);
        this.contents = [];
        this.hasContents = false;
        this.rolledContents = false;
        this.accessPath = [];
    }

    rollContents() {
        if (rollChanceLTE(0.75)){
            this.hasContents = true;
            this.fillContents();
        }

        this.rolledContents = true;
    }

    fillContents() {
        const typePicked = randArrPos([ { type: ContentType.Item }, { type: ContentType.Enemy }, { type: ContentType.Event } ]);
        this.contents.push(typePicked);
        return;
    }

    fillPathway(path: Array<number>) {
        this.accessPath = path;
    }

    get pathing() {
        return this.accessPath;
    }
};

const emptyTile = new TileData({ id: 0, connections: [["", 0]]});
//emptyCell = new CellData({ id: 0, connections: [["", 0]]});

/**
 * Used to store and manage level game state
 * 
 * `populateBase()` is the init method for the current level
 * It will load a set of levelTiles as `TileData` and cellTiles as `CellData`
 */
export class CellManager {
    levelTiles: Array<TileData>;
    activeTile: MapTile;
    tiledCells: Array<CellData>;
    reachableCells: Array<Con>;
    constructor() { 
        this.levelTiles = [];
        this.tiledCells = [];
        this.reachableCells = [];
        this.activeTile = new MapTile(emptyTile);
    }

    /**
     * This method handles loading both the `TileData` & `CellData` arrays
     * @param levelData RawTile list of all basic tiles for level to be loaded
     * @returns Final length of tiles loaded
     */
    populateBase(levelData: RawTile[]) {
        this.levelTiles = [...levelData.map(raw => new TileData(raw))];
        this.__loadBlankCells();
        this.__populateSpawnTile();
        return this.levelTiles.length;
    }

    /**
     * This method will allow for complex control of how a level is allowed to be generated,
     * using the generated raw data from the given `function` it will preform a series of checks
     * 
     * CHECKS: 
     *  - Count tile distance accessable from spawn
     *      - If less than x, reroll
     *  - TBD
     * 
     * @param levelLoader Function that returns a list of `RawTile` objects
     * @param options Options to be passed to the `levelLoader` function
     * @returns Final length of tiles loaded
     */
    populateBaseAdvanced(levelLoader: (args: MakerMap) => RawTile[], options: MakerMap) {
        const reloadLevel = () => {
            this.levelTiles = [...levelLoader(options).map(raw => new TileData(raw))];
        };
        
        reloadLevel();
        
        // this.levelTiles has been populated, now we need to check if the level is valid
        let levelValid = false;
        
        const levelRules = {
            minDistance: 15
        };

        const checkMinDistance = () => {
            let distance = 0;
            // Grab the spawn tile, this should be done for every failed generation to ensure updated data is present
            const spawnTile = this.levelTiles.find(tile => tile.id === 1);
            if (!spawnTile) return false;

            // Load initial connections from the spawn tile
            const tilesWaiting: Array<Con> = Array.from(spawnTile.connections.map(conArr => conArr[1]));
            const tilesChecked: Array<Con> = [1];

            // console.log('Initial connections from spawn tile: ', tilesWaiting);

            let failSafe = this.levelTiles.length;

            // Loop through connection tiles until they run out, or early return is reached
            while(tilesWaiting.length > 0 && failSafe > 0){
                const nextTile = this.levelTiles.find(tile => tile.id === tilesWaiting[0]);
                // console.log('Next tile picked: ', nextTile);
                if (!nextTile) continue;

                // Remove currently checked tile from the waitlist
                tilesWaiting.shift();

                // If the next tile has already been checked, skip it
                if (tilesChecked.includes(nextTile.id)) continue;

                tilesChecked.push(nextTile.id);

                // Add the next tile's connections to the waitlist
                tilesWaiting.push(...nextTile.connections.map(conArr => conArr[1]));

                distance++;
                failSafe--;
            }

            this.reachableCells = tilesChecked;

            return distance >= levelRules.minDistance;
        }

        const maxRetries = 8;

        let tries = maxRetries;
        while (!levelValid && tries > 0){
            checkMinDistance() ? levelValid = true : reloadLevel();
            if (!levelValid) tries--;
        }

        if (!levelValid) {
            console.error('Failed to generate valid level after %d tries', maxRetries);
            return 0;
        }

        this.__loadBlankCells();
        this.__populateSpawnTile();
        return this.levelTiles.length;
    }

    __loadBlankCells() {
        this.tiledCells = [...this.levelTiles.map(tile => new CellData(tile))];
    }

    __populateSpawnTile() {
        this.activeTile = new MapTile(this.levelTiles[0]);
        this.__updateActiveCell();
    }

    __updateActiveCell() {
        if (this.tiledCells.filter(tile => tile.activeCell).length > 0) {
            this.tiledCells.filter(tile => tile.activeCell).forEach((cell) => cell.activeCell = false);
        }
        (this.tiledCells.find(tile => tile.id === this.activeTile.id) ?? this.tiledCells[0]).activeCell = true;
    }

    /**
     * This method handles populating the `contents` of all unrolled cells in `.tiledCells`
     * @returns Length of cells that rolled for new contents
     */
    populateCells() {
        const needsLoading = (c: CellData) => !c.activeCell && !c.rolledContents;
        const unloadedCells = this.tiledCells.filter(cell => needsLoading(cell));
        for (const cleanCell of unloadedCells){
            cleanCell.rollContents();
        }

        return unloadedCells.length;
    }

    /**
     * This method handles populating `CellData` contents, while using additional checks.
     * 
     * CHECKS:
     *  - Perform pathing for each event/pickup/enemy to determine if it can be reached from the spawn tile
     *      - TEMP (Log details of pathing if cell with contents is unreachable)
     */
    populateCellsAdvanced() {
        // const refreshCells = () => {
        //     this.__loadBlankCells();
        //     this.__populateSpawnTile();
        // };

        const checkShortestPath = (targetCell: CellData) => {
            const spawnTile = this.levelTiles.find(tile => tile.id === 1);
            if (!spawnTile) return console.error('Spawn tile not found');

            // Load initial connections from the spawn tile
            const tilesWaiting: Array<number> = Array.from(spawnTile.connections.map(conArr => !isNaN(Number(conArr[1])) ? Number(conArr[1]) : 0));
            const tilesChecked: Map<number, number> = new Map([]);

            //console.log('Initial connections from spawn tile: ', tilesWaiting);
            for (const spawnCon of tilesWaiting){
                tilesChecked.set(spawnCon, 1);
            }

            // Loop through connection tiles until they run out, or early return is reached
            while(tilesWaiting.length > 0){
                const nextTile = this.levelTiles.find(tile => tile.id === tilesWaiting[0]);
                //console.log('Next tile picked: ', nextTile);
                if (!nextTile) continue;

                // Remove currently checked tile from the waitlist
                tilesWaiting.shift();

                const nextTileConnections = nextTile.connections.map(conArr => !isNaN(Number(conArr[1])) ? Number(conArr[1]) : 0);

                for (const con of nextTileConnections){
                    // If the next tile has already been checked, skip it
                    if (!tilesChecked.has(con)) {
                        tilesChecked.set(con, nextTile.id);
                        // Add the next tile's connections to the waitlist
                        tilesWaiting.push(con);
                    }
                }
            }

            let failSafe = tilesChecked.size;

            let currentTile = targetCell.id;
            const path: Array<number> = [currentTile];
            while (currentTile !== 1 && failSafe > 0){
                const nextTile = tilesChecked.get(currentTile);
                //console.log('Next tile retrieved: ', nextTile);
                if (!nextTile) break;
                path.push(nextTile);
                currentTile = nextTile;
                failSafe--;
            }

            console.log('Pathing for cell %d: ', targetCell.id, path);
            targetCell.fillPathway(path);
        };

        const reachableCellsWithContents = this.tiledCells.filter(cell => cell.hasContents && this.reachableCells.includes(cell.id));
        console.log('Reachable Cells with contents: ', reachableCellsWithContents);
        for (const cell of reachableCellsWithContents){
            checkShortestPath(cell);
        }


        // const checkPathing = (targetCell: CellData) => {
        //     const spawnTile = this.levelTiles.find(tile => tile.id === 1);
            
        //     const pathable = (targetCell: CellData) => {
        //         // distance is created outside of the loop to ensure it is reset for each direction
        //         let distance = 0;

        //         console.log('Checking pathing for target cell: ', targetCell.id);
                
        //         for (const dir of spawnTile?.connections ?? []){
        //             distance = 0;

        //             const tilesChecked: Array<Con> = [1];

        //             // Id of tile @ direction `dir`
        //             let nextTile = dir[1];
        //             while (!tilesChecked.includes(nextTile)){
        //                 const nextTileData = this.levelTiles.find(tile => tile.id === nextTile);
        //                 if (!nextTileData) break;
                        
        //                 //console.log('Next tile picked: ', nextTileData);
                        
        //                 // This entry is used as a "Way Back" for any failed pathing attempts made from it.
        //                 tilesChecked.push(nextTile);

        //                 //     Success Return
        //                 // <S ================ R>
        //                 // If the next cell checked contains a connection to the target cell, return the final distance + 1
        //                 if ([...nextTileData.connections.map(conArr => conArr[1])].includes(targetCell.id)) {
        //                     distance++;
        //                     return distance;
        //                 }
        //                 // <S ================ R>
                        
        //                 // Continue pathing if target cell is not included

        //                 // This logic needs to be expanded, currently it checks only 1 random connection, however it should instead try each connection
        //                 nextTile = randArrPos(nextTileData.connections.filter(conArr => !tilesChecked.includes(conArr[1])))?.[1] ?? 0;
                        
        //                 if (nextTile === 0) break;
        //                 distance++;
        //             }

        //             /**
        //              * This function is used to check all connections of the current tile, allowing a more robust pathing system to check all possible options
        //              * @param nextTileData "Save-State" of the starting tile for the current sub-path
        //              * @returns All connections that have not been checked yet
        //              */
        //             const populateSubPath = (nextTileData: TileData) => {
        //                 return nextTileData.connections.filter(conArr => !tilesChecked.includes(conArr[1]));
        //             };

        //             let pathPieceCollector = Array.from(tilesChecked);
        //             // This is used to splice failed pathing attempts, set initially to remove all but tile 1
        //             // let currentPathLength = pathPieceCollector.length - 1;

        //             //console.log('Initial pathing attempt:', pathPieceCollector);

        //             // If the initial pathing attempt failed, backtrack through each tile checked, itterating through all possible options 
        //             // until the target cell is found or all options are exhausted
        //             for (let i = tilesChecked.length - 1; i >= 0; i--){
        //                 const tile = this.levelTiles.find(tile => tile.id === tilesChecked[i]);
        //                 if (!tile) continue;

        //                 // Extract the sub-path for the current tile
        //                 const subPath = populateSubPath(tile);
        //                 // If tile was already exhausted, skip to next
        //                 if (!subPath.length) { 
        //                     // More logic is required to remove the correct number of path Pieces
        //                     // console.log('Following initial pathing attempt?', pathPieceCollector[i] === tilesChecked[i]);
        //                     const pathPieceIndex = pathPieceCollector.indexOf(tilesChecked[i]);
        //                     if (pathPieceIndex < 0) continue;
        //                     pathPieceCollector = pathPieceCollector.slice(0, pathPieceIndex);
        //                     //console.log('Pathing attempt failed removed pathing attempt, updated path: ', pathPieceCollector);
        //                     continue; 
        //                 } 

        //                 //console.log('Checking Backwards pathing for: ', tile);

        //                 // Add the currently checked tile to the full path checked
        //                 if (!pathPieceCollector.includes(tile.id)) {
        //                     //console.log('Adding tile to pathing attempt: ', tile.id);
        //                     pathPieceCollector.push(tile.id);
        //                 }

        //                 if (subPath.flat(1).includes(targetCell.id)) {
        //                     // console.log('Found target cell in sub-path options');
        //                     // Work backwards using the pathPieceCollector to construct a valid path
        //                     for (const idStep of pathPieceCollector.slice().reverse()){
        //                         const currentStep = this.levelTiles.find(tile => tile.id === idStep);
        //                         const currentStepIndex = pathPieceCollector.indexOf(idStep);
        //                         if (!currentStep || currentStepIndex < 0) continue;
                                
        //                         let previousStepIndex = currentStepIndex - 1;
        //                         while (!currentStep.connections.map(conArr => conArr[1]).includes(pathPieceCollector[previousStepIndex]) && previousStepIndex >= 0) {
        //                             pathPieceCollector.splice(previousStepIndex, 1, 0);
        //                             previousStepIndex--;
        //                         }
        //                     }

        //                     pathPieceCollector = pathPieceCollector.filter(id => id !== 0);

        //                     console.log('Full path completed, after validation: ', pathPieceCollector);

        //                     // Using tilesChecked instead of pathPieceCollector attempting to resolve the correct pathing
        //                     // THIS DOESNT WORK VVV
        //                     // for (const idStep of tilesChecked){
        //                     //     const currentStep = this.levelTiles.find(tile => tile.id === idStep);
        //                     //     const currentStepIndex = tilesChecked.indexOf(idStep);
        //                     //     if (!currentStep || currentStepIndex < 0) continue;
                                
        //                     //     let nextStepIndex = currentStepIndex + 1;
        //                     //     while (!currentStep.connections.map(conArr => conArr[1]).includes(tilesChecked[nextStepIndex]) && nextStepIndex <= tilesChecked.length - 1) {
        //                     //         tilesChecked.splice(nextStepIndex, 1, 0);
        //                     //         nextStepIndex++;
        //                     //     }
        //                     // }

        //                     // const finalPath = tilesChecked.filter(id => id !== 0);

        //                     // console.log('Full path completed (Using data in tilesChecked), after validation: ', finalPath);

        //                     return distance + 1;
        //                 }

        //                 //console.log('Current pathing attempt:', pathPieceCollector);

        //                 for (const con of subPath) {
        //                     // console.log('Checking sub-path options for: ', con);
        //                     const nextSubTile = this.levelTiles.find(tile => tile.id === con[1]);
        //                     if (!nextSubTile) continue;

        //                     // console.log(`i: %d, Tiles backchecked: ${(tilesChecked.length - 1) - i}`, i);

        //                     // We want to add the nextSubTile to the original tilesChecked array
        //                     // This is done by splicing the array at the current index, inserting nextSubTile.id, and then pushing all elements after it
        //                     // back into the array
        //                     tilesChecked.push(...tilesChecked.splice(i, (tilesChecked.length - 1) - i, nextSubTile.id));
                            
        //                     // !! IMPORTANT !!
        //                     // Increment i as the length of the array has been modified
        //                     i++;
        //                     // console.log('Contents of tilesChecked after splice: ', tilesChecked);
        //                 }
        //             }
        //         }

        //         // If this return is reached the target cell was never found
        //         return 0;
        //     };

        //     // Evaluate the pathing distance for the target cell
        //     const pathDistance = pathable(targetCell);
        //     if (pathDistance <= 0) {
        //         console.log('Target Cell %d is unreachable from spawn tile', targetCell.id);
        //     } else {
        //         console.log(`Target Cell ${targetCell.id} is reachable from spawn tile at distance: ${pathDistance}`);
        //     }
        // };

        // const cellsWithContents = this.tiledCells.filter(cell => cell.hasContents);
        // for (const cell of cellsWithContents){
        //     checkPathing(cell);
        // }
    };

    get cells() {
        return this.tiledCells;
    }

    get activeData() {
        return this.activeTile;
    }

    set active(newTile: TileData) {
        this.activeTile.updateInternals(newTile);
        this.__updateActiveCell();
    }


    // findFromBase(id: Con) {
    //     return this.levelTiles.find(tile => tile.id === id);
    // }

    // populateActiveTile() {
    //     this.activeTile = new MapTile(this.levelTiles[0]);
    //     return this.activeTile;
    // }

    __grabCellByID(id: Con) {
        // id will always be a number, this is due to level tiles being static json
        // The connections array is in the format of `[string, number][]` but typescript
        // makes that association declaration cost more time than its worth and this doesnt throw errors :)
        return this.tiledCells.find(cell => cell.id === id) ?? this.tiledCells[0];
    }

    __grabTileByID(id: Con) {
        // id will always be a number, this is due to level tiles being static json
        // The connections array is in the format of `[string, number][]` but typescript
        // makes that association declaration cost more time than its worth and this doesnt throw errors :)
        return this.levelTiles.find(tile => tile.id === id) ?? this.levelTiles[0];
    }

    handleMovement(direction: string) {
        // `MapTile.moveDirectionsID()` returns ["direction", id] as [1] therefore `id`
        const movingToID = this.activeTile.moveDirectionsID(direction);
        // Update activeTile and associated `CellData` based on id of tile moved to
        this.active = this.__grabTileByID(movingToID);

        // this.activeTile = new MapTile(this.findFromBase(movingToID) ?? this.populateActiveTile());
        // (this.tiledCells.find(c => c.id === this.activeData.id) ?? this.tiledCells[0]).activeCell = true;
    }

    filterMovement() {
        return (k: string) => this.activeTile.enabledConnections().some(d => d === k);
    }

    debugTiles(){
        for (const tile of this.levelTiles){
            console.log('Tile %d contains: ', tile.id, tile);
        }
    }

    debugCells(){
        for (const cell of this.tiledCells){
            console.log('Cell %d contains: ', cell.id, cell);
        }
    }

    PURGE() {
        this.levelTiles = [];
        this.tiledCells = [];
        this.activeTile = new MapTile(emptyTile);
    }
}